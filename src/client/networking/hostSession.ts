import {
  DEFAULT_RULES_CONFIG,
  advance,
  asPlayerId,
  createMatch,
  validateLoadout,
  type GameAction,
  type GameError,
  type GameState,
  type PlayerId,
} from "@server";
import { drainEmptyReactionPriority } from "@client/store/autoPassPriority";
import {
  parseWireMessage,
  type HostToClient,
  type PersistedRoom,
  type ProtocolError,
  type RoomMember,
  type RoomSnapshot,
  type SeatId,
  type WireLoadout,
} from "./protocol.js";
import type { NetTransport } from "./transport.js";

const P1 = asPlayerId("p1");
const P2 = asPlayerId("p2");

interface InternalSeat {
  clientId: string;
  peerId: string | null;
  loadout: WireLoadout;
}

interface RemotePeer {
  clientId: string;
  peerId: string;
}

export interface HostAdvanceEvent {
  readonly prev: GameState;
  readonly next: GameState;
  readonly action: GameAction;
  readonly ok: boolean;
  readonly error: GameError | null;
}

export interface HostSessionOptions {
  readonly roomCode: string;
  readonly transport: NetTransport;
  /** Stable identity of the room owner (survives PeerJS id reuse on host refresh). */
  readonly hostClientId: string;
  readonly seed?: number;
  /** When set, skip `createMatch` and start from this state (tests). */
  readonly initialState?: GameState;
  /** Resume after host refresh: keep the same match instead of `createMatch`. */
  readonly restoredState?: GameState;
  /** Resume seat map (clientIds + loadouts). Required to rebind after refresh. */
  readonly restoredRoom?: PersistedRoom;
  readonly onState: (state: GameState) => void;
  readonly onRoom?: (room: RoomSnapshot) => void;
  /**
   * Fires after every `advance()` the host runs (local or remote), including
   * rejects. Metrics observes this; `onState` still broadcasts successful
   * snapshots only.
   */
  readonly onAdvance?: (event: HostAdvanceEvent) => void;
  readonly onError?: (error: ProtocolError) => void;
  readonly onPeerLeft?: (peerId: string) => void;
  readonly onStatus?: (status: string) => void;
}

/**
 * Host authority: owns GameState, runs advance(), broadcasts to every peer.
 *
 * Seats P1/P2 are claimed explicitly. The room owner may spectate. Joining
 * peers default to spectator. Reconnect rebinds by `clientId`, not by being
 * "the guest".
 */
export class HostSession {
  readonly roomCode: string;
  readonly hostClientId: string;
  private readonly transport: NetTransport;
  private readonly seed: number;
  private readonly onState: (state: GameState) => void;
  private readonly onRoomCb: ((room: RoomSnapshot) => void) | undefined;
  private readonly onAdvance: ((event: HostAdvanceEvent) => void) | undefined;
  private readonly onError: ((error: ProtocolError) => void) | undefined;
  private readonly onPeerLeft: ((peerId: string) => void) | undefined;
  private readonly onStatus: ((status: string) => void) | undefined;

  private state: GameState | null = null;
  private started = false;
  private destroyed = false;
  private p1: InternalSeat | null = null;
  private p2: InternalSeat | null = null;
  private readonly remotes = new Map<string, RemotePeer>();
  private readonly actionLog: GameAction[] = [];

  constructor(options: HostSessionOptions) {
    this.roomCode = options.roomCode;
    this.hostClientId = options.hostClientId;
    this.transport = options.transport;
    const resumeState = options.restoredState ?? options.initialState;
    this.seed = resumeState?.rng.seed ?? options.seed ?? Date.now() % 100_000;
    this.onState = options.onState;
    this.onRoomCb = options.onRoom;
    this.onAdvance = options.onAdvance;
    this.onError = options.onError;
    this.onPeerLeft = options.onPeerLeft;
    this.onStatus = options.onStatus;

    if (options.restoredRoom !== undefined) {
      this.p1 = this.hydrateSeat(options.restoredRoom.p1);
      this.p2 = this.hydrateSeat(options.restoredRoom.p2);
    }

    if (resumeState !== undefined) {
      this.state = resumeState;
      this.started = true;
      this.onState(this.state);
    }

    this.transport.onMessage((peerId, data) => this.handleMessage(peerId, data));
    this.transport.onDisconnect((peerId) => this.handleDisconnect(peerId));

    this.emitRoom(
      resumeState !== undefined ? "waiting for players to rejoin" : "room open — claim a seat or spectate",
    );
  }

  get currentState(): GameState | null {
    return this.state;
  }

  get localPlayerId(): PlayerId | null {
    return this.seatForClient(this.hostClientId);
  }

  get room(): RoomSnapshot {
    return this.snapshot();
  }

  persistedRoom(): PersistedRoom {
    return {
      hostClientId: this.hostClientId,
      p1: this.p1 === null ? null : { clientId: this.p1.clientId, loadout: this.p1.loadout },
      p2: this.p2 === null ? null : { clientId: this.p2.clientId, loadout: this.p2.loadout },
      started: this.started,
    };
  }

  /** Peer occupying P2, if any (tests / status). */
  get boundGuestPeerId(): string | null {
    return this.p2?.peerId ?? null;
  }

  claimLocalSeat(seat: SeatId, loadout: WireLoadout): boolean {
    return this.tryClaim(this.hostClientId, this.transport.localId, seat, loadout, null);
  }

  releaseLocalSeat(): boolean {
    return this.tryRelease(this.hostClientId, null);
  }

  startMatch(): boolean {
    if (this.started && this.state !== null) return true;
    if (this.p1 === null || this.p2 === null) {
      this.onStatus?.("both seats need a player with a legal loadout");
      return false;
    }
    try {
      this.state = createMatch({
        matchId: `online-${this.roomCode}`,
        seed: this.seed,
        players: [
          {
            id: P1,
            squad: this.p1.loadout.squad,
            deck: this.p1.loadout.deck,
            faceDeck: this.p1.loadout.faceDeck,
            startingDice: this.p1.loadout.startingDice,
          },
          {
            id: P2,
            squad: this.p2.loadout.squad,
            deck: this.p2.loadout.deck,
            faceDeck: this.p2.loadout.faceDeck,
            startingDice: this.p2.loadout.startingDice,
          },
        ],
      });
    } catch (error) {
      this.onStatus?.(error instanceof Error ? error.message : "match create failed");
      return false;
    }
    this.started = true;
    this.actionLog.length = 0;
    this.onState(this.state);
    this.broadcastRoom();
    this.broadcastState();
    this.onStatus?.("match started");
    return true;
  }

  /** Room owner plays only if they claimed a seat. Spectating host does not `advance()` as a player. */
  submitLocalAction(action: GameAction): boolean {
    const seat = this.localPlayerId;
    if (seat === null) {
      this.onError?.("NOT_SEATED");
      return false;
    }
    if (this.state === null) {
      this.onError?.("INVALID_PHASE");
      return false;
    }
    return this.applyAction(seat, { ...action, playerId: seat }, undefined, null);
  }

  /**
   * @param announceClose When false (page unload / host refresh), skip
   * `room-closed` so clients retry instead of treating the room as gone.
   */
  destroy(announceClose = true): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (announceClose) {
      for (const peerId of this.remotes.keys()) {
        this.send(peerId, { v: 1, type: "room-closed" });
      }
    }
    this.remotes.clear();
    this.transport.destroy();
  }

  private hydrateSeat(
    saved: PersistedRoom["p1"],
  ): InternalSeat | null {
    if (saved === null) return null;
    const peerId = saved.clientId === this.hostClientId ? this.transport.localId : null;
    return { clientId: saved.clientId, peerId, loadout: saved.loadout };
  }

  private handleMessage(peerId: string, data: unknown): void {
    const message = parseWireMessage(data);
    if (message === null) return;

    if (message.type === "hello") {
      this.handleHello(peerId, message.roomCode, message.clientId);
      return;
    }

    const remote = this.remotes.get(peerId);
    if (remote === undefined) return;

    if (message.type === "claim-seat") {
      this.tryClaim(remote.clientId, peerId, message.seat, message.loadout, peerId);
      return;
    }

    if (message.type === "release-seat") {
      this.tryRelease(remote.clientId, peerId);
      return;
    }

    if (message.type === "resync-request") {
      if (this.state !== null) {
        this.send(peerId, { v: 1, type: "state", state: this.state });
      }
      this.send(peerId, { v: 1, type: "room", room: this.snapshot() });
      return;
    }

    if (message.type === "submit-action") {
      const seat = this.seatForClient(remote.clientId);
      if (seat === null || this.state === null) {
        this.send(peerId, {
          v: 1,
          type: "action-rejected",
          error: "NOT_SEATED",
          clientSeq: message.clientSeq,
          state: this.state,
        });
        this.onError?.("NOT_SEATED");
        return;
      }
      this.applyAction(seat, { ...message.action, playerId: seat }, message.clientSeq, peerId);
    }
  }

  private handleHello(peerId: string, roomCode: string, clientId: string): void {
    if (roomCode !== this.roomCode) return;
    if (clientId === this.hostClientId) return;

    const previous = [...this.remotes.values()].find((peer) => peer.clientId === clientId);
    if (previous !== undefined && previous.peerId !== peerId) {
      this.remotes.delete(previous.peerId);
      this.transport.disconnectPeer(previous.peerId);
    }

    this.remotes.set(peerId, { clientId, peerId });
    this.rebindSeatPeer(clientId, peerId);

    const liveState = this.state;
    const seat = this.seatForClient(clientId);
    this.send(peerId, {
      v: 1,
      type: "welcome",
      roomCode: this.roomCode,
      playerId: seat,
      room: this.snapshot(),
      ...(liveState !== null
        ? { matchId: liveState.matchId, state: liveState }
        : {}),
    });
    this.broadcastRoom();
    this.onStatus?.(
      this.started
        ? seat !== null
          ? `${seat} reconnected`
          : "spectator joined"
        : "player joined — claim a seat or spectate",
    );
  }

  private handleDisconnect(peerId: string): void {
    const remote = this.remotes.get(peerId);
    if (remote === undefined) return;
    this.remotes.delete(peerId);

    const seat = this.seatForClient(remote.clientId);
    if (seat !== null) {
      const occupant = seat === P1 ? this.p1 : this.p2;
      if (occupant !== null && occupant.peerId === peerId) {
        if (this.started) {
          occupant.peerId = null;
        } else {
          if (seat === P1) this.p1 = null;
          else this.p2 = null;
        }
      }
    }

    this.broadcastRoom();
    this.onPeerLeft?.(peerId);
    this.onStatus?.(
      this.started
        ? "a player disconnected — they can rejoin with this room code"
        : "a client left the room",
    );
  }

  private tryClaim(
    clientId: string,
    peerId: string,
    seat: SeatId,
    loadout: WireLoadout,
    rejectPeerId: string | null,
  ): boolean {
    const fail = (reason: string): false => {
      if (rejectPeerId !== null) {
        this.send(rejectPeerId, { v: 1, type: "seat-rejected", reason });
      }
      this.onStatus?.(reason);
      return false;
    };

    if (this.started) {
      return fail("seats are locked after the match starts");
    }

    const current = this.seatForClient(clientId);
    if (current !== null && current !== asPlayerId(seat)) {
      return fail("leave your seat before claiming the other one");
    }

    const occupant = seat === "p1" ? this.p1 : this.p2;
    if (occupant !== null && occupant.clientId !== clientId) {
      return fail(`${seat} is already taken`);
    }

    const check = validateLoadout(loadout, DEFAULT_RULES_CONFIG);
    if (!check.ok) {
      return fail(check.reason);
    }

    const next: InternalSeat = { clientId, peerId, loadout };
    if (seat === "p1") this.p1 = next;
    else this.p2 = next;

    this.broadcastRoom();
    this.welcomePeerIfRemote(clientId);
    this.onStatus?.(`${seat} claimed`);
    return true;
  }

  private tryRelease(clientId: string, rejectPeerId: string | null): boolean {
    if (this.started) {
      const reason = "seats are locked after the match starts";
      if (rejectPeerId !== null) {
        this.send(rejectPeerId, { v: 1, type: "seat-rejected", reason });
      }
      this.onStatus?.(reason);
      return false;
    }

    const seat = this.seatForClient(clientId);
    if (seat === null) return true;
    if (seat === P1) this.p1 = null;
    else this.p2 = null;

    this.broadcastRoom();
    this.welcomePeerIfRemote(clientId);
    this.onStatus?.("returned to spectator");
    return true;
  }

  private welcomePeerIfRemote(clientId: string): void {
    if (clientId === this.hostClientId) return;
    const remote = [...this.remotes.values()].find((peer) => peer.clientId === clientId);
    if (remote === undefined) return;
    const liveState = this.state;
    this.send(remote.peerId, {
      v: 1,
      type: "welcome",
      roomCode: this.roomCode,
      playerId: this.seatForClient(clientId),
      room: this.snapshot(),
      ...(liveState !== null
        ? { matchId: liveState.matchId, state: liveState }
        : {}),
    });
  }

  private rebindSeatPeer(clientId: string, peerId: string): void {
    if (this.p1?.clientId === clientId) this.p1.peerId = peerId;
    if (this.p2?.clientId === clientId) this.p2.peerId = peerId;
  }

  private applyAction(
    seat: PlayerId,
    action: GameAction,
    clientSeq: number | undefined,
    actorPeerId: string | null,
  ): boolean {
    if (this.state === null) return false;

    const bound: GameAction = { ...action, playerId: seat };
    const prev = this.state;
    const result = advance(this.state, bound);

    if (!result.ok) {
      this.onAdvance?.({
        prev,
        next: result.state,
        action: bound,
        ok: false,
        error: result.error,
      });
      if (clientSeq !== undefined && actorPeerId !== null) {
        this.send(actorPeerId, {
          v: 1,
          type: "action-rejected",
          error: result.error,
          clientSeq,
          state: this.state,
        });
      }
      this.onError?.(result.error);
      return false;
    }

    this.state = result.state;
    this.actionLog.push(bound);
    this.onAdvance?.({
      prev,
      next: this.state,
      action: bound,
      ok: true,
      error: null,
    });
    this.state = drainEmptyReactionPriority(this.state, (from, to, pass) => {
      this.actionLog.push(pass);
      this.onAdvance?.({
        prev: from,
        next: to,
        action: pass,
        ok: true,
        error: null,
      });
    });
    this.onState(this.state);
    this.broadcastState(actorPeerId, clientSeq);
    return true;
  }

  private broadcastState(actorPeerId: string | null = null, clientSeq?: number): void {
    if (this.state === null) return;
    for (const peerId of this.remotes.keys()) {
      const payload: HostToClient =
        actorPeerId === peerId && clientSeq !== undefined
          ? { v: 1, type: "state", state: this.state, appliedClientSeq: clientSeq }
          : { v: 1, type: "state", state: this.state };
      this.send(peerId, payload);
    }
  }

  private broadcastRoom(): void {
    const room = this.snapshot();
    this.onRoomCb?.(room);
    for (const peerId of this.remotes.keys()) {
      this.send(peerId, { v: 1, type: "room", room });
    }
  }

  private emitRoom(status: string): void {
    this.onRoomCb?.(this.snapshot());
    this.onStatus?.(status);
  }

  private snapshot(): RoomSnapshot {
    const seated = new Set<string>();
    if (this.p1 !== null) seated.add(this.p1.clientId);
    if (this.p2 !== null) seated.add(this.p2.clientId);

    const spectators: RoomMember[] = [];
    if (!seated.has(this.hostClientId)) {
      spectators.push({ clientId: this.hostClientId, peerId: this.transport.localId });
    }
    for (const remote of this.remotes.values()) {
      if (!seated.has(remote.clientId)) {
        spectators.push({ clientId: remote.clientId, peerId: remote.peerId });
      }
    }

    return {
      roomCode: this.roomCode,
      started: this.started,
      matchId: this.state?.matchId ?? null,
      hostClientId: this.hostClientId,
      seats: {
        p1: this.toRoomSeat(this.p1),
        p2: this.toRoomSeat(this.p2),
      },
      spectators,
    };
  }

  private toRoomSeat(seat: InternalSeat | null): RoomSnapshot["seats"]["p1"] {
    if (seat === null) return null;
    return { clientId: seat.clientId, peerId: seat.peerId, ready: true };
  }

  private seatForClient(clientId: string): PlayerId | null {
    if (this.p1?.clientId === clientId) return P1;
    if (this.p2?.clientId === clientId) return P2;
    return null;
  }

  private send(peerId: string, message: HostToClient): void {
    this.transport.send(peerId, message);
  }
}
