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
  readonly onState: (state: GameState) => void;
  readonly onError?: (error: GameError) => void;
  readonly onGuestJoined?: (peerId: string) => void;
  readonly onGuestLeft?: () => void;
  readonly onStatus?: (status: string) => void;
}

/**
 * Host authority: owns GameState, runs advance(), broadcasts results.
 * Seat map: host local transport is p1; first guest peer is p2.
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

  constructor(options: HostSessionOptions) {
    this.roomCode = options.roomCode;
    this.transport = options.transport;
    this.hostLoadout = options.hostLoadout;
    this.seed = options.seed ?? Date.now() % 100_000;
    this.onState = options.onState;
    this.onError = options.onError;
    this.onGuestJoined = options.onGuestJoined;
    this.onGuestLeft = options.onGuestLeft;
    this.onStatus = options.onStatus;

    this.transport.onMessage((peerId, data) => this.handleMessage(peerId, data));
    this.transport.onDisconnect((peerId) => {
      if (peerId === this.guestPeerId) {
        this.guestPeerId = null;
        this.onStatus?.("guest disconnected");
        this.onGuestLeft?.();
      }
    });
    this.onStatus?.("waiting for guest");
  }

  get currentState(): GameState | null {
    return this.state;
  }

  get localPlayerId(): PlayerId {
    return P1;
  }

  /** Host plays as p1 once the match has started. */
  submitLocalAction(action: GameAction): boolean {
    if (this.state === null) {
      this.onError?.("INVALID_PHASE");
      return false;
    }
    return this.applyAction(P1, { ...action, playerId: P1 }, undefined);
  }

  destroy(): void {
    if (this.guestPeerId !== null) {
      this.send(this.guestPeerId, { v: 1, type: "room-closed" });
    }
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
    if (this.started && this.guestPeerId !== null && this.guestPeerId !== peerId) {
      // Second guest: refuse by ignoring (single guest seats only).
      return;
    }

    this.guestPeerId = peerId;

    if (!this.started || this.state === null) {
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

    this.send(peerId, {
      v: 1,
      type: "welcome",
      matchId: this.state.matchId,
      playerId: P2,
      roomCode: this.roomCode,
      state: this.state,
    });
    this.onStatus?.("guest connected");
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
