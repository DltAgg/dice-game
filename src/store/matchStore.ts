import { create } from "zustand";
import {
  advance,
  asPlayerId,
  createMatch,
  type GameAction,
  type GameError,
  type GameState,
  type PlayerId,
} from "@/game";
import {
  createLocalStorageDeckRepository,
  PROTOTYPE_SAVED_DECK_ID,
  validateSavedDeck,
  type SavedDeck,
  type SavedDeckId,
} from "@/decks";
import {
  ClientSession,
  HostSession,
  PeerTransport,
  generateRoomCode,
  type WireLoadout,
} from "@/networking";

const P1 = asPlayerId("p1");
const P2 = asPlayerId("p2");

const deckRepo = createLocalStorageDeckRepository();

export type MatchView = "lobby" | "match" | "catalogue" | "decks";
export type MatchMode = "local" | "host" | "client";

function requireDeck(id: SavedDeckId): SavedDeck {
  const deck = deckRepo.get(id);
  if (deck === undefined) {
    throw new Error(`matchStore: deck “${id}” not found`);
  }
  return deck;
}

/** Resolve a playable loadout; never silently substitutes another deck. */
function resolvePlayableLoadout(
  id: SavedDeckId,
): { ok: true; deck: SavedDeck } | { ok: false; reason: string } {
  const deck = deckRepo.get(id);
  if (deck === undefined) {
    return {
      ok: false,
      reason: `Deck “${id}” was not found. Pick a loadout in Play before hosting or joining.`,
    };
  }
  const check = validateSavedDeck(deck);
  if (!check.ok) {
    return { ok: false, reason: `“${deck.name}” is not legal to play: ${check.reason}` };
  }
  return { ok: true, deck };
}

function toWireLoadout(deck: SavedDeck): WireLoadout {
  return { squad: deck.squad, deck: deck.deck, faceDeck: deck.faceDeck };
}

/** Null when every id is a legal playable loadout. */
function playBlockReasonFor(...ids: readonly SavedDeckId[]): string | null {
  for (const id of ids) {
    const resolved = resolvePlayableLoadout(id);
    if (!resolved.ok) return resolved.reason;
  }
  return null;
}

function newMatchState(
  seed: number,
  p1DeckId: SavedDeckId = PROTOTYPE_SAVED_DECK_ID,
  p2DeckId: SavedDeckId = PROTOTYPE_SAVED_DECK_ID,
): GameState {
  const p1 = requireDeck(p1DeckId);
  const p2 = requireDeck(p2DeckId);
  return createMatch({
    matchId: `local-${String(seed)}`,
    seed,
    players: [
      { id: P1, squad: p1.squad, deck: p1.deck, faceDeck: p1.faceDeck },
      { id: P2, squad: p2.squad, deck: p2.deck, faceDeck: p2.faceDeck },
    ],
  });
}

export interface MatchStore {
  readonly state: GameState;
  readonly lastError: GameError | null;
  readonly view: MatchView;
  readonly seed: number;
  readonly p1DeckId: SavedDeckId;
  readonly p2DeckId: SavedDeckId;
  readonly mode: MatchMode;
  /** Bound seat in online play; null means hotseat (both seats). */
  readonly localPlayerId: PlayerId | null;
  readonly roomCode: string | null;
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
  hostRoom: (deckId?: SavedDeckId) => Promise<void>;
  joinRoom: (roomCode: string, deckId?: SavedDeckId) => Promise<void>;
  leaveOnline: () => void;
  requestResync: () => void;
}

let hostSession: HostSession | null = null;
let clientSession: ClientSession | null = null;

function tearDownSessions(): void {
  hostSession?.destroy();
  clientSession?.destroy();
  hostSession = null;
  clientSession = null;
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
    roomCode: null,
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
      set({
        state: newMatchState(nextSeed, p1, p2),
        lastError: null,
        playBlockReason: null,
        seed: nextSeed,
        p1DeckId: p1,
        p2DeckId: p2,
      });
    },

    clearError: () => set({ lastError: null }),
    clearPlayBlockReason: () => set({ playBlockReason: null }),

    startLocal: (p1DeckId, p2DeckId) => {
      tearDownSessions();
      const p1 = p1DeckId ?? get().p1DeckId;
      const p2 = p2DeckId ?? get().p2DeckId;
      const blocked = playBlockReasonFor(p1, p2);
      if (blocked !== null) {
        set({ playBlockReason: blocked, connectionStatus: "local", onlineReady: false });
        return;
      }
      const nextSeed = Date.now() % 100_000;
      set({
        mode: "local",
        localPlayerId: null,
        roomCode: null,
        connectionStatus: "local",
        onlineReady: true,
        view: "match",
        state: newMatchState(nextSeed, p1, p2),
        seed: nextSeed,
        p1DeckId: p1,
        p2DeckId: p2,
        lastError: null,
        playBlockReason: null,
      });
    },

    hostRoom: async (deckId) => {
      tearDownSessions();
      const chosen = deckId ?? get().p1DeckId;
      const resolved = resolvePlayableLoadout(chosen);
      if (!resolved.ok) {
        set({
          playBlockReason: resolved.reason,
          connectionStatus: "local",
          onlineReady: false,
          mode: "local",
          localPlayerId: null,
          roomCode: null,
        });
        return;
      }
      const loadout = toWireLoadout(resolved.deck);
      const roomCode = generateRoomCode();
      set({
        mode: "host",
        localPlayerId: P1,
        roomCode,
        connectionStatus: "starting host…",
        onlineReady: false,
        view: "match",
        p1DeckId: chosen,
        lastError: null,
        playBlockReason: null,
      });

      try {
        const transport = await PeerTransport.create(roomCode);
        hostSession = new HostSession({
          roomCode,
          transport,
          hostLoadout: loadout,
          onState: (state) =>
            set({
              state,
              seed: state.rng.seed,
              onlineReady: true,
              lastError: null,
            }),
          onError: (error) => set({ lastError: error }),
          onStatus: (connectionStatus) => set({ connectionStatus }),
          onGuestJoined: () => set({ connectionStatus: "guest connected" }),
          onGuestLeft: () => set({ connectionStatus: "guest disconnected" }),
        });
        set({ connectionStatus: "waiting for guest", roomCode });
      } catch (error) {
        tearDownSessions();
        set({
          mode: "local",
          localPlayerId: null,
          roomCode: null,
          view: "lobby",
          connectionStatus: "local",
          onlineReady: false,
          playBlockReason: error instanceof Error ? error.message : "host failed",
        });
      }
    },

    joinRoom: async (roomCode, deckId) => {
      tearDownSessions();
      const code = roomCode.trim().toUpperCase();
      const chosen = deckId ?? get().p2DeckId;
      const resolved = resolvePlayableLoadout(chosen);
      if (!resolved.ok) {
        set({
          playBlockReason: resolved.reason,
          connectionStatus: "local",
          onlineReady: false,
          mode: "local",
          localPlayerId: null,
          roomCode: null,
        });
        return;
      }
      const loadout = toWireLoadout(resolved.deck);
      set({
        mode: "client",
        localPlayerId: P2,
        roomCode: code,
        connectionStatus: "connecting…",
        onlineReady: false,
        view: "match",
        p2DeckId: chosen,
        lastError: null,
        playBlockReason: null,
      });

      try {
        const transport = await PeerTransport.create();
        await transport.connect(code);
        clientSession = new ClientSession({
          roomCode: code,
          transport,
          hostPeerId: code,
          loadout,
          onState: (state) =>
            set({
              state,
              seed: state.rng.seed,
              onlineReady: true,
              lastError: null,
            }),
          onWelcome: (playerId) =>
            set({
              localPlayerId: playerId,
              connectionStatus: "connected",
              onlineReady: true,
            }),
          onError: (error) => set({ lastError: error }),
          onStatus: (connectionStatus) => set({ connectionStatus }),
          onRoomClosed: () => set({ connectionStatus: "room closed", onlineReady: false }),
        });
        clientSession.greet();
      } catch (error) {
        tearDownSessions();
        set({
          mode: "local",
          localPlayerId: null,
          roomCode: null,
          view: "lobby",
          connectionStatus: "local",
          onlineReady: false,
          playBlockReason: error instanceof Error ? error.message : "join failed",
        });
      }
    },

    leaveOnline: () => {
      tearDownSessions();
      const nextSeed = Date.now() % 100_000;
      set({
        mode: "local",
        localPlayerId: null,
        roomCode: null,
        connectionStatus: "local",
        onlineReady: false,
        view: "lobby",
        state: newMatchState(nextSeed, get().p1DeckId, get().p2DeckId),
        seed: nextSeed,
        lastError: null,
      });
    },

    requestResync: () => {
      clientSession?.requestResync();
    },

    dispatch: (action) => {
      const { mode, localPlayerId } = get();

      if (mode === "local") {
        const result = advance(get().state, action);
        if (result.ok) {
          set({ state: result.state, lastError: null });
          return true;
        }
        set({ lastError: result.error });
        return false;
      }

      if (localPlayerId !== null && action.playerId !== localPlayerId) {
        set({ lastError: "NOT_ACTIVE_PLAYER" });
        return false;
      }

      if (mode === "host") {
        if (hostSession === null) return false;
        return hostSession.submitLocalAction(action);
      }

      if (mode === "client") {
        if (clientSession === null) return false;
        return clientSession.submitAction(action);
      }

      return false;
    },
  };
});

export const MATCH_P1 = P1;
export const MATCH_P2 = P2;
