import { create } from "zustand";
import type { AiStrength } from "@ai";
import type { GameAction, GameError, GameState, PlayerId, RngState } from "@server";
import { PROTOTYPE_SAVED_DECK_ID, type SavedDeckId } from "@client/decks";
import type { RoomSnapshot, SeatId } from "@client/networking";
import { clearOnlineSessionHint, getOrCreateClientId } from "./onlineSessionHint.js";
import { observeMatchSfx } from "@client/ui/audio/observeMatchSfx";
import { recordedAsFor } from "@client/metrics";
import { trackMetrics } from "./trackMetrics.js";
import {
  MATCH_P1,
  MATCH_P2,
  deckName,
  dispatchHotseat,
  newMatchState,
  playBlockReasonFor,
} from "./localMatchEngine.js";
import {
  claimSeat as claimOnlineSeat,
  hostRoom as hostOnlineRoom,
  joinRoom as joinOnlineRoom,
  leaveOnline as leaveOnlineSession,
  releaseSeat as releaseOnlineSeat,
  requestResync as requestOnlineResync,
  startOnlineMatch as startHostMatch,
  submitOnlineAction,
  tearDownSessions,
  tryResumeOnlineSession as resumeOnlineSession,
} from "./onlineSessionController.js";
import {
  fillAiSeat,
  policyRngStateFromMatchSeed,
  shouldFillAiSeat,
} from "./vsAiFill.js";

export { MATCH_P1, MATCH_P2 };

export type MatchView = "lobby" | "match" | "catalogue" | "decks" | "rules" | "metrics";
export type MatchMode = "local" | "host" | "client";

export interface StartVsAiOptions {
  readonly humanSeat?: PlayerId;
  readonly humanDeckId?: SavedDeckId;
  readonly aiDeckId?: SavedDeckId;
  readonly strength?: AiStrength;
  readonly seed?: number;
}

export interface MatchStore {
  readonly state: GameState;
  readonly lastError: GameError | null;
  readonly view: MatchView;
  readonly seed: number;
  readonly p1DeckId: SavedDeckId;
  readonly p2DeckId: SavedDeckId;
  readonly mode: MatchMode;
  /**
   * Bound seat in online play and local vs-AI; null means hotseat (both seats)
   * locally, or spectator online.
   */
  readonly localPlayerId: PlayerId | null;
  /** AI seat during local vs-AI; null otherwise. */
  readonly aiPlayerId: PlayerId | null;
  readonly aiStrength: AiStrength;
  /** Policy RNG snapshot — not `GameState.rng`. */
  readonly aiRng: RngState | null;
  readonly roomCode: string | null;
  readonly roomSnapshot: RoomSnapshot | null;
  readonly clientId: string;
  readonly connectionStatus: string;
  readonly onlineReady: boolean;
  /** Why the last play/host/join/new-match attempt was refused (illegal loadout). */
  readonly playBlockReason: string | null;

  setView: (view: MatchView) => void;
  setMatchDecks: (p1DeckId: SavedDeckId, p2DeckId: SavedDeckId) => void;
  newMatch: (seed?: number, p1DeckId?: SavedDeckId, p2DeckId?: SavedDeckId) => void;
  dispatch: (action: GameAction) => boolean;
  clearError: () => void;
  clearPlayBlockReason: () => void;

  startLocal: (p1DeckId?: SavedDeckId, p2DeckId?: SavedDeckId) => void;
  startVsAi: (options?: StartVsAiOptions) => void;
  hostRoom: (deckId?: SavedDeckId, options?: { readonly resume?: boolean }) => Promise<void>;
  joinRoom: (roomCode: string, deckId?: SavedDeckId) => Promise<void>;
  claimSeat: (seat: SeatId, deckId?: SavedDeckId) => void;
  releaseSeat: () => void;
  startOnlineMatch: () => void;
  leaveOnline: () => void;
  requestResync: () => void;
  /** After a full page reload, resume host Peer id or re-join as client. */
  tryResumeOnlineSession: () => Promise<void>;
}

const clearedAi = {
  aiPlayerId: null,
  aiStrength: "standard" as const,
  aiRng: null,
};

function observeMatch(
  prevState: GameState | null,
  state: GameState,
  action: GameAction | null,
  accepted: boolean,
  error: GameError | null,
): void {
  const snapshot = useMatchStore.getState();
  trackMetrics({
    prevState,
    state,
    action,
    accepted,
    error,
    recordedAs: recordedAsFor(snapshot.mode, snapshot.aiPlayerId),
    roomCode: snapshot.roomCode,
    localPlayerId: snapshot.localPlayerId,
    p1DeckId: snapshot.p1DeckId,
    p2DeckId: snapshot.p2DeckId,
    p1DeckName: deckName(snapshot.p1DeckId),
    p2DeckName: deckName(snapshot.p2DeckId),
  });
  observeMatchSfx({
    prevState,
    state,
    action,
    accepted,
    error,
    mode: snapshot.mode,
    localPlayerId: snapshot.localPlayerId,
  });
}

function applyAiFill(
  state: GameState,
  snapshot: {
    readonly mode: MatchMode;
    readonly aiPlayerId: PlayerId | null;
    readonly localPlayerId: PlayerId | null;
    readonly aiRng: RngState | null;
    readonly aiStrength: AiStrength;
  },
): { readonly state: GameState; readonly aiRng: RngState | null } {
  if (!shouldFillAiSeat(snapshot) || snapshot.aiPlayerId === null || snapshot.aiRng === null) {
    return { state, aiRng: snapshot.aiRng };
  }
  const filled = fillAiSeat({
    state,
    aiPlayerId: snapshot.aiPlayerId,
    rngState: snapshot.aiRng,
    strength: snapshot.aiStrength,
    step: (prev, action) => dispatchHotseat(prev, action, observeMatch),
  });
  return { state: filled.state, aiRng: filled.rngState };
}

export const useMatchStore = create<MatchStore>((set, get) => {
  const seed = Date.now() % 100_000;
  return {
    state: newMatchState(seed, PROTOTYPE_SAVED_DECK_ID, PROTOTYPE_SAVED_DECK_ID),
    lastError: null,
    view: "lobby",
    seed,
    p1DeckId: PROTOTYPE_SAVED_DECK_ID,
    p2DeckId: PROTOTYPE_SAVED_DECK_ID,
    mode: "local",
    localPlayerId: null,
    ...clearedAi,
    roomCode: null,
    roomSnapshot: null,
    clientId: getOrCreateClientId(),
    connectionStatus: "local",
    onlineReady: false,
    playBlockReason: null,

    setView: (view) => set({ view }),

    setMatchDecks: (p1DeckId, p2DeckId) => set({ p1DeckId, p2DeckId, playBlockReason: null }),

    newMatch: (nextSeed = Date.now() % 100_000, p1DeckId, p2DeckId) => {
      if (get().mode !== "local") return;
      const p1 = p1DeckId ?? get().p1DeckId;
      const p2 = p2DeckId ?? get().p2DeckId;
      const blocked = playBlockReasonFor(p1, p2);
      if (blocked !== null) {
        set({ playBlockReason: blocked });
        return;
      }
      const prev = get().state;
      let next = newMatchState(nextSeed, p1, p2);
      const aiRng = shouldFillAiSeat(get()) ? policyRngStateFromMatchSeed(nextSeed) : get().aiRng;
      const filled = applyAiFill(next, { ...get(), aiRng });
      next = filled.state;
      set({
        state: next,
        lastError: null,
        playBlockReason: null,
        seed: nextSeed,
        p1DeckId: p1,
        p2DeckId: p2,
        aiRng: filled.aiRng,
      });
      observeMatch(prev, next, null, true, null);
    },

    clearError: () => set({ lastError: null }),
    clearPlayBlockReason: () => set({ playBlockReason: null }),

    startLocal: (p1DeckId, p2DeckId) => {
      tearDownSessions();
      clearOnlineSessionHint();
      const p1 = p1DeckId ?? get().p1DeckId;
      const p2 = p2DeckId ?? get().p2DeckId;
      const blocked = playBlockReasonFor(p1, p2);
      if (blocked !== null) {
        set({ playBlockReason: blocked, connectionStatus: "local", onlineReady: false });
        return;
      }
      const nextSeed = Date.now() % 100_000;
      const prev = get().state;
      const next = newMatchState(nextSeed, p1, p2);
      set({
        mode: "local",
        localPlayerId: null,
        ...clearedAi,
        roomCode: null,
        roomSnapshot: null,
        connectionStatus: "local",
        onlineReady: true,
        view: "match",
        state: next,
        seed: nextSeed,
        p1DeckId: p1,
        p2DeckId: p2,
        lastError: null,
        playBlockReason: null,
      });
      observeMatch(prev, next, null, true, null);
    },

    startVsAi: (options = {}) => {
      tearDownSessions();
      clearOnlineSessionHint();
      const humanSeat = options.humanSeat ?? MATCH_P1;
      const aiPlayerId = humanSeat === MATCH_P1 ? MATCH_P2 : MATCH_P1;
      const humanDeckId =
        options.humanDeckId ?? (humanSeat === MATCH_P1 ? get().p1DeckId : get().p2DeckId);
      const aiDeckId =
        options.aiDeckId ?? (humanSeat === MATCH_P1 ? get().p2DeckId : get().p1DeckId);
      const p1DeckId = humanSeat === MATCH_P1 ? humanDeckId : aiDeckId;
      const p2DeckId = humanSeat === MATCH_P1 ? aiDeckId : humanDeckId;
      const blocked = playBlockReasonFor(p1DeckId, p2DeckId);
      if (blocked !== null) {
        set({ playBlockReason: blocked, connectionStatus: "local", onlineReady: false });
        return;
      }
      const nextSeed = options.seed ?? Date.now() % 100_000;
      const strength = options.strength ?? "standard";
      const prev = get().state;
      const opened = newMatchState(nextSeed, p1DeckId, p2DeckId);
      const filled = fillAiSeat({
        state: opened,
        aiPlayerId,
        rngState: policyRngStateFromMatchSeed(nextSeed),
        strength,
        step: (prevState, action) => dispatchHotseat(prevState, action, observeMatch),
      });
      set({
        mode: "local",
        localPlayerId: humanSeat,
        aiPlayerId,
        aiStrength: strength,
        aiRng: filled.rngState,
        roomCode: null,
        roomSnapshot: null,
        connectionStatus: "local",
        onlineReady: true,
        view: "match",
        state: filled.state,
        seed: nextSeed,
        p1DeckId,
        p2DeckId,
        lastError: null,
        playBlockReason: null,
      });
      observeMatch(prev, filled.state, null, true, null);
    },

    hostRoom: async (deckId, options) => {
      await hostOnlineRoom(set, get, observeMatch, deckId, options);
      set({ ...clearedAi });
    },

    joinRoom: async (roomCode, deckId) => {
      await joinOnlineRoom(set, get, observeMatch, roomCode, deckId);
      set({ ...clearedAi });
    },

    claimSeat: (seat, deckId) => {
      claimOnlineSeat(set, get, seat, deckId);
    },

    releaseSeat: () => {
      releaseOnlineSeat(set, get);
    },

    startOnlineMatch: () => {
      startHostMatch(set, get);
    },

    leaveOnline: () => {
      leaveOnlineSession(set, get);
      set({ ...clearedAi });
    },

    requestResync: () => {
      requestOnlineResync();
    },

    tryResumeOnlineSession: async () => {
      await resumeOnlineSession(get);
    },

    dispatch: (action) => {
      const { mode } = get();

      if (mode === "local") {
        const prev = get().state;
        const result = dispatchHotseat(prev, action, observeMatch);
        if (!result.ok) {
          set({ lastError: result.error });
          return false;
        }
        const filled = applyAiFill(result.state, get());
        set({ state: filled.state, lastError: null, aiRng: filled.aiRng });
        return true;
      }

      return submitOnlineAction(action, get);
    },
  };
});
