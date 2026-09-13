import type { GameAction, GameError, GameState, PlayerId } from "@server";
import type { SavedDeckId } from "@client/decks";
import {
  ClientSession,
  HostSession,
  PeerTransport,
  generateRoomCode,
  type ProtocolError,
  type RoomSnapshot,
  type SeatId,
} from "@client/networking";
import {
  clearOnlineSessionHint,
  getOrCreateClientId,
  readOnlineSessionHint,
  writeOnlineSessionHint,
} from "./onlineSessionHint.js";
import {
  MATCH_P1,
  MATCH_P2,
  newMatchState,
  resolvePlayableLoadout,
  toWireLoadout,
  type ObserveMatch,
} from "./localMatchEngine.js";
import type { MatchStore } from "./matchStore.js";

type StoreSet = (partial: Partial<MatchStore>) => void;
type StoreGet = () => MatchStore;

let hostSession: HostSession | null = null;
let clientSession: ClientSession | null = null;
let guestTransport: PeerTransport | null = null;
let guestReconnectGen = 0;
let didAttemptResume = false;
let pageHideBound = false;

function playerIdFromRoom(room: RoomSnapshot, clientId: string): PlayerId | null {
  if (room.seats.p1?.clientId === clientId) return MATCH_P1;
  if (room.seats.p2?.clientId === clientId) return MATCH_P2;
  return null;
}

function persistHostHint(
  roomCode: string,
  deckId: SavedDeckId | undefined,
  seed: number,
  state: GameState | null,
  seat: SeatId | null,
): void {
  writeOnlineSessionHint({
    v: 1,
    role: "host",
    roomCode,
    clientId: getOrCreateClientId(),
    seat,
    seed,
    ...(deckId !== undefined ? { deckId } : {}),
    ...(state !== null ? { state } : {}),
    ...(hostSession !== null ? { room: hostSession.persistedRoom() } : {}),
  });
}

function persistClientHint(roomCode: string, deckId: SavedDeckId | undefined, seat: SeatId | null): void {
  writeOnlineSessionHint({
    v: 1,
    role: "client",
    roomCode,
    clientId: getOrCreateClientId(),
    seat,
    ...(deckId !== undefined ? { deckId } : {}),
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function asSeatId(playerId: PlayerId | null): SeatId | null {
  if (playerId === MATCH_P1) return "p1";
  if (playerId === MATCH_P2) return "p2";
  return null;
}

function isGameError(error: ProtocolError): error is GameError {
  return error !== "NOT_SEATED";
}

export function tearDownSessions(announceClose = true): void {
  guestReconnectGen += 1;
  hostSession?.destroy(announceClose);
  clientSession?.destroy();
  hostSession = null;
  clientSession = null;
  guestTransport = null;
}

function bindPageHideRelease(): void {
  if (pageHideBound || typeof window === "undefined") return;
  pageHideBound = true;
  window.addEventListener("pagehide", () => {
    // Free the PeerJS room-code id; do not send room-closed (clients should retry).
    tearDownSessions(false);
  });
}

export function hasLiveOnlineSession(): boolean {
  return hostSession !== null || clientSession !== null;
}

export async function hostRoom(
  set: StoreSet,
  get: StoreGet,
  observeMatch: ObserveMatch,
  deckId?: SavedDeckId,
  options?: { readonly resume?: boolean },
): Promise<void> {
  const resume = options?.resume === true;
  const hint = resume ? readOnlineSessionHint() : null;
  const chosen = deckId ?? (hint?.role === "host" ? hint.deckId : undefined) ?? get().p1DeckId;
  tearDownSessions();
  const roomCode =
    resume && hint?.role === "host" ? hint.roomCode : generateRoomCode();
  const restoredState = resume && hint?.role === "host" ? hint.state : undefined;
  const restoredRoom = resume && hint?.role === "host" ? hint.room : undefined;
  const matchSeed =
    restoredState?.rng.seed ??
    (resume && hint?.role === "host" ? hint.seed : undefined) ??
    Date.now() % 100_000;
  const clientId = getOrCreateClientId();
  const matchAlreadyOn = restoredState !== undefined;
  set({
    mode: "host",
    localPlayerId: null,
    roomCode,
    roomSnapshot: null,
    clientId,
    connectionStatus: matchAlreadyOn ? "resuming host…" : "starting host…",
    onlineReady: matchAlreadyOn,
    view: matchAlreadyOn ? "match" : "lobby",
    p1DeckId: chosen,
    lastError: null,
    playBlockReason: null,
    ...(restoredState !== undefined ? { state: restoredState, seed: restoredState.rng.seed } : {}),
  });

  try {
    bindPageHideRelease();
    const transport = await PeerTransport.create(roomCode);
    hostSession = new HostSession({
      roomCode,
      transport,
      hostClientId: clientId,
      seed: matchSeed,
      ...(restoredState !== undefined ? { restoredState } : {}),
      ...(restoredRoom !== undefined ? { restoredRoom } : {}),
      onState: (state) => {
        persistHostHint(
          roomCode,
          asSeatId(get().localPlayerId) === "p2" ? get().p2DeckId : get().p1DeckId,
          state.rng.seed,
          state,
          asSeatId(get().localPlayerId),
        );
        const prev = get().state;
        set({
          state,
          seed: state.rng.seed,
          onlineReady: true,
          lastError: null,
          view: "match",
        });
        if (prev.matchId !== state.matchId) {
          observeMatch(null, state, null, true, null);
        }
      },
      onRoom: (room) => {
        const localPlayerId = playerIdFromRoom(room, clientId);
        const seat = asSeatId(localPlayerId);
        const deckHint =
          seat === "p1" ? get().p1DeckId : seat === "p2" ? get().p2DeckId : get().p1DeckId;
        persistHostHint(
          roomCode,
          deckHint,
          get().seed,
          room.started ? get().state : null,
          seat,
        );
        set({
          roomSnapshot: room,
          localPlayerId,
          onlineReady: room.started,
          ...(room.started ? { view: "match" as const } : {}),
        });
      },
      onAdvance: ({ prev, next, action, ok, error }) => {
        observeMatch(prev, ok ? next : prev, action, ok, error);
      },
      onError: (error) => {
        if (isGameError(error)) set({ lastError: error });
      },
      onStatus: (connectionStatus) => set({ connectionStatus }),
      onPeerLeft: () => undefined,
    });
    persistHostHint(roomCode, chosen, matchSeed, restoredState ?? null, asSeatId(get().localPlayerId));
  } catch (error) {
    tearDownSessions();
    set({
      mode: "local",
      localPlayerId: null,
      roomCode: null,
      roomSnapshot: null,
      view: "lobby",
      connectionStatus: "local",
      onlineReady: false,
      playBlockReason: error instanceof Error ? error.message : "host failed",
    });
  }
}

export async function joinRoom(
  set: StoreSet,
  get: StoreGet,
  observeMatch: ObserveMatch,
  roomCode: string,
  deckId?: SavedDeckId,
): Promise<void> {
  tearDownSessions();
  const code = roomCode.trim().toUpperCase();
  const chosen = deckId ?? get().p2DeckId;
  const clientId = getOrCreateClientId();
  set({
    mode: "client",
    localPlayerId: null,
    roomCode: code,
    roomSnapshot: null,
    clientId,
    connectionStatus: "connecting…",
    onlineReady: false,
    view: "lobby",
    p2DeckId: chosen,
    lastError: null,
    playBlockReason: null,
  });

  const reconnectGen = guestReconnectGen;

  const retryConnect = async (transport: PeerTransport, session: ClientSession): Promise<void> => {
    const delays = [400, 800, 1200, 2000, 3000, 4000] as const;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      if (guestReconnectGen !== reconnectGen || clientSession !== session) return;
      set({ connectionStatus: "reconnecting…" });
      try {
        await transport.connect(code);
        if (guestReconnectGen !== reconnectGen || clientSession !== session) return;
        session.greet();
        return;
      } catch {
        await sleep(delays[Math.min(attempt, delays.length - 1)]!);
      }
    }
    if (guestReconnectGen === reconnectGen && clientSession === session) {
      set({
        connectionStatus: "reconnect failed — Join again with this room code",
      });
    }
  };

  try {
    bindPageHideRelease();
    const transport = await PeerTransport.create();
    guestTransport = transport;
    const joinDelays = [400, 800, 1200, 2000, 3000] as const;
    let connected = false;
    let joinError: unknown;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      if (guestReconnectGen !== reconnectGen) return;
      try {
        await transport.connect(code);
        connected = true;
        break;
      } catch (error) {
        joinError = error;
        set({ connectionStatus: "connecting… retrying" });
        await sleep(joinDelays[Math.min(attempt, joinDelays.length - 1)]!);
      }
    }
    if (!connected) {
      throw joinError instanceof Error ? joinError : new Error("join failed");
    }
    clientSession = new ClientSession({
      roomCode: code,
      transport,
      hostPeerId: code,
      clientId,
      onState: (state) => {
        const prev = get().state;
        set({
          state,
          seed: state.rng.seed,
          onlineReady: true,
          lastError: null,
          view: "match",
        });
        observeMatch(prev, state, null, true, null);
      },
      onWelcome: (playerId, _roomCode, room) => {
        const seat = asSeatId(playerId);
        const deckHint =
          seat === "p1" ? get().p1DeckId : seat === "p2" ? get().p2DeckId : get().p2DeckId;
        persistClientHint(code, deckHint, seat);
        set({
          localPlayerId: playerId,
          roomSnapshot: room,
          connectionStatus: "connected",
          onlineReady: room.started,
          view: room.started ? "match" : "lobby",
        });
      },
      onRoom: (room) => {
        const localPlayerId = playerIdFromRoom(room, clientId);
        const seat = asSeatId(localPlayerId);
        const deckHint =
          seat === "p1" ? get().p1DeckId : seat === "p2" ? get().p2DeckId : get().p2DeckId;
        persistClientHint(code, deckHint, seat);
        set({
          roomSnapshot: room,
          localPlayerId,
          onlineReady: room.started ? true : get().onlineReady,
          ...(room.started ? { view: "match" as const } : {}),
        });
      },
      onError: (error) => {
        if (isGameError(error)) set({ lastError: error });
      },
      onSeatRejected: (reason) => set({ playBlockReason: reason }),
      onStatus: (connectionStatus) => set({ connectionStatus }),
      onRoomClosed: () => {
        clearOnlineSessionHint();
        set({ connectionStatus: "room closed", onlineReady: false });
      },
      onHostDropped: () => {
        const session = clientSession;
        const current = guestTransport;
        if (session === null || current === null) return;
        void retryConnect(current, session);
      },
    });
    persistClientHint(code, chosen, null);
    clientSession.greet();
  } catch (error) {
    tearDownSessions();
    set({
      mode: "local",
      localPlayerId: null,
      roomCode: null,
      roomSnapshot: null,
      view: "lobby",
      connectionStatus: "local",
      onlineReady: false,
      playBlockReason: error instanceof Error ? error.message : "join failed",
    });
  }
}

export function claimSeat(set: StoreSet, get: StoreGet, seat: SeatId, deckId?: SavedDeckId): void {
  const chosen = deckId ?? (seat === "p1" ? get().p1DeckId : get().p2DeckId);
  const resolved = resolvePlayableLoadout(chosen);
  if (!resolved.ok) {
    set({ playBlockReason: resolved.reason });
    return;
  }
  const loadout = toWireLoadout(resolved.deck);
  if (seat === "p1") set({ p1DeckId: chosen, playBlockReason: null });
  else set({ p2DeckId: chosen, playBlockReason: null });

  const { mode } = get();
  if (mode === "host") {
    if (hostSession === null) return;
    const ok = hostSession.claimLocalSeat(seat, loadout);
    if (!ok) return;
    set({ localPlayerId: seat === "p1" ? MATCH_P1 : MATCH_P2 });
    persistHostHint(
      get().roomCode ?? "",
      chosen,
      get().seed,
      get().roomSnapshot?.started === true ? get().state : null,
      seat,
    );
    return;
  }
  if (mode === "client") {
    clientSession?.claimSeat(seat, loadout);
    const code = get().roomCode;
    if (code !== null) persistClientHint(code, chosen, seat);
  }
}

export function releaseSeat(set: StoreSet, get: StoreGet): void {
  const { mode } = get();
  if (mode === "host") {
    hostSession?.releaseLocalSeat();
    set({ localPlayerId: null });
    if (get().roomCode !== null) {
      persistHostHint(get().roomCode!, get().p1DeckId, get().seed, null, null);
    }
    return;
  }
  if (mode === "client") {
    clientSession?.releaseSeat();
  }
}

export function startOnlineMatch(set: StoreSet, get: StoreGet): void {
  if (get().mode !== "host" || hostSession === null) return;
  const ok = hostSession.startMatch();
  if (!ok) {
    set({ playBlockReason: "Both P1 and P2 need a seated player with a legal loadout." });
  }
}

export function leaveOnline(set: StoreSet, get: StoreGet): void {
  tearDownSessions(true);
  clearOnlineSessionHint();
  const nextSeed = Date.now() % 100_000;
  set({
    mode: "local",
    localPlayerId: null,
    roomCode: null,
    roomSnapshot: null,
    connectionStatus: "local",
    onlineReady: false,
    view: "lobby",
    state: newMatchState(nextSeed, get().p1DeckId, get().p2DeckId),
    seed: nextSeed,
    lastError: null,
  });
}

export function requestResync(): void {
  clientSession?.requestResync();
}

export async function tryResumeOnlineSession(get: StoreGet): Promise<void> {
  if (didAttemptResume) return;
  didAttemptResume = true;
  if (get().mode !== "local" || hostSession !== null || clientSession !== null) return;
  const hint = readOnlineSessionHint();
  if (hint === null) return;
  if (hint.role === "host") {
    await get().hostRoom(hint.deckId, { resume: true });
    return;
  }
  await get().joinRoom(hint.roomCode, hint.deckId);
}

export function submitOnlineAction(action: GameAction, get: StoreGet): boolean {
  const { mode, localPlayerId } = get();
  if (localPlayerId === null) return false;

  // Stamp the bound seat. Do not refuse P2 reactions with NOT_ACTIVE_PLAYER
  // just because the UI named the turn player — host/client sessions also
  // override playerId, and the reducer decides priority vs turn player.
  const seated: GameAction = { ...action, playerId: localPlayerId };

  if (mode === "host") {
    if (hostSession === null) return false;
    return hostSession.submitLocalAction(seated);
  }

  if (mode === "client") {
    if (clientSession === null) return false;
    return clientSession.submitAction(seated);
  }

  return false;
}
