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
  parseWireMessage,
  type HostToClient,
  type WireLoadout,
} from "./protocol.js";
import type { NetTransport } from "./transport.js";

const P1 = asPlayerId("p1");
const P2 = asPlayerId("p2");

export interface HostSessionOptions {
  readonly roomCode: string;
  readonly transport: NetTransport;
  readonly hostLoadout: WireLoadout;
  readonly seed?: number;
  /** When set, skip `createMatch` and start from this state (tests). */
  readonly initialState?: GameState;
  /** Resume after host refresh: keep the same match instead of `createMatch`. */
  readonly restoredState?: GameState;
  readonly onState: (state: GameState) => void;
  readonly onError?: (error: GameError) => void;
  readonly onGuestJoined?: (peerId: string) => void;
  readonly onGuestLeft?: () => void;
  readonly onStatus?: (status: string) => void;
}

/**
 * Host authority: owns GameState, runs advance(), broadcasts results.
 * Seat map: host local transport is p1; the guest seat is p2.
 *
 * A later hello for this room **replaces** the existing guest connection
 * (page reload issues a new PeerJS id; the old DataConnection may still look
 * live). There is only one p2 — we do not refuse as a “duplicate” join.
 */
export class HostSession {
  readonly roomCode: string;
  private readonly transport: NetTransport;
  private readonly hostLoadout: WireLoadout;
  private readonly seed: number;
  private readonly onState: (state: GameState) => void;
  private readonly onError: ((error: GameError) => void) | undefined;
  private readonly onGuestJoined: ((peerId: string) => void) | undefined;
  private readonly onGuestLeft: (() => void) | undefined;
  private readonly onStatus: ((status: string) => void) | undefined;

  private state: GameState | null = null;
  private guestPeerId: string | null = null;
  private readonly actionLog: GameAction[] = [];
  private started = false;
  private destroyed = false;

  constructor(options: HostSessionOptions) {
    this.roomCode = options.roomCode;
    this.transport = options.transport;
    this.hostLoadout = options.hostLoadout;
    const resumeState = options.restoredState ?? options.initialState;
    this.seed = resumeState?.rng.seed ?? options.seed ?? Date.now() % 100_000;
    this.onState = options.onState;
    this.onError = options.onError;
    this.onGuestJoined = options.onGuestJoined;
    this.onGuestLeft = options.onGuestLeft;
    this.onStatus = options.onStatus;

    if (resumeState !== undefined) {
      this.state = resumeState;
      this.started = true;
      this.onState(this.state);
    }

    this.transport.onMessage((peerId, data) => this.handleMessage(peerId, data));
    this.transport.onDisconnect((peerId) => {
      if (peerId === this.guestPeerId) {
        this.guestPeerId = null;
        this.onStatus?.("guest disconnected — rejoin with this room code");
        this.onGuestLeft?.();
      }
    });

    if (options.restoredState !== undefined) {
      this.onStatus?.("waiting for guest to rejoin");
      return;
    }

    this.onStatus?.("waiting for guest");
  }

  get currentState(): GameState | null {
    return this.state;
  }

  get localPlayerId(): PlayerId {
    return P1;
  }

  get boundGuestPeerId(): string | null {
    return this.guestPeerId;
  }

  /** Host plays as p1 once the match has started. */
  submitLocalAction(action: GameAction): boolean {
    if (this.state === null) {
      this.onError?.("INVALID_PHASE");
      return false;
    }
    return this.applyAction(P1, { ...action, playerId: P1 }, undefined);
  }

  /**
   * @param announceClose When false (page unload / host refresh), skip
   * `room-closed` so the guest retries instead of treating the room as gone.
   */
  destroy(announceClose = true): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (announceClose && this.guestPeerId !== null) {
      this.send(this.guestPeerId, { v: 1, type: "room-closed" });
    }
    this.guestPeerId = null;
    this.transport.destroy();
  }

  private handleMessage(peerId: string, data: unknown): void {
    const message = parseWireMessage(data);
    if (message === null) return;

    if (message.type === "hello") {
      this.handleHello(peerId, message.roomCode, message.loadout);
      return;
    }

    if (this.guestPeerId !== peerId || this.state === null) return;

    if (message.type === "resync-request") {
      this.send(peerId, {
        v: 1,
        type: "state",
        state: this.state,
      });
      return;
    }

    if (message.type === "submit-action") {
      this.applyAction(P2, { ...message.action, playerId: P2 }, message.clientSeq);
    }
  }

  private handleHello(peerId: string, roomCode: string, guestLoadout: WireLoadout): void {
    if (roomCode !== this.roomCode) return;

    const reconnecting = this.started && this.state !== null;
    const previousGuest = this.guestPeerId;

    // Bind the new peer first so closing the stale connection does not clear it.
    this.guestPeerId = peerId;
    if (previousGuest !== null && previousGuest !== peerId) {
      this.transport.disconnectPeer(previousGuest);
    }

    if (!reconnecting) {
      try {
        this.state = createMatch({
          matchId: `online-${this.roomCode}`,
          seed: this.seed,
          players: [
            {
              id: P1,
              squad: this.hostLoadout.squad,
              deck: this.hostLoadout.deck,
              faceDeck: this.hostLoadout.faceDeck,
            },
            {
              id: P2,
              squad: guestLoadout.squad,
              deck: guestLoadout.deck,
              faceDeck: guestLoadout.faceDeck,
            },
          ],
        });
      } catch {
        this.guestPeerId = null;
        this.onStatus?.("guest loadout rejected");
        return;
      }
      this.started = true;
      this.actionLog.length = 0;
      this.onState(this.state);
    }

    const liveState = this.state;
    if (liveState === null) return;

    this.send(peerId, {
      v: 1,
      type: "welcome",
      matchId: liveState.matchId,
      playerId: P2,
      roomCode: this.roomCode,
      state: liveState,
    });
    this.onStatus?.(reconnecting ? "guest reconnected" : "guest connected");
    this.onGuestJoined?.(peerId);
  }

  private applyAction(
    seat: PlayerId,
    action: GameAction,
    clientSeq: number | undefined,
  ): boolean {
    if (this.state === null) return false;

    const bound: GameAction = { ...action, playerId: seat };
    const result = advance(this.state, bound);

    if (!result.ok) {
      if (clientSeq !== undefined && this.guestPeerId !== null) {
        this.send(this.guestPeerId, {
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
    this.onState(this.state);

    if (this.guestPeerId !== null) {
      const payload: HostToClient =
        clientSeq !== undefined
          ? { v: 1, type: "state", state: this.state, appliedClientSeq: clientSeq }
          : { v: 1, type: "state", state: this.state };
      this.send(this.guestPeerId, payload);
    }
    return true;
  }

  private send(peerId: string, message: HostToClient): void {
    this.transport.send(peerId, message);
  }
}
