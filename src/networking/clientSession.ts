import type { GameAction, GameError, GameState, PlayerId } from "@/game";
import { parseWireMessage, type ClientToHost, type WireLoadout } from "./protocol.js";
import type { NetTransport } from "./transport.js";

export interface ClientSessionOptions {
  readonly roomCode: string;
  readonly transport: NetTransport;
  /** Peer id of the host (same as room code when hosting with Peer id = room). */
  readonly hostPeerId: string;
  readonly loadout: WireLoadout;
  readonly onState: (state: GameState) => void;
  readonly onWelcome: (playerId: PlayerId, roomCode: string) => void;
  readonly onError?: (error: GameError) => void;
  readonly onStatus?: (status: string) => void;
  readonly onRoomClosed?: () => void;
  /** Live tab: host DataConnection dropped (guest page still mounted). */
  readonly onHostDropped?: () => void;
}

/**
 * Guest client: sends intents, applies host state only.
 */
export class ClientSession {
  readonly roomCode: string;
  private readonly transport: NetTransport;
  private readonly hostPeerId: string;
  private readonly loadout: WireLoadout;
  private readonly onState: (state: GameState) => void;
  private readonly onWelcome: (playerId: PlayerId, roomCode: string) => void;
  private readonly onError: ((error: GameError) => void) | undefined;
  private readonly onStatus: ((status: string) => void) | undefined;
  private readonly onRoomClosed: (() => void) | undefined;
  private readonly onHostDropped: (() => void) | undefined;

  private playerId: PlayerId | null = null;
  private clientSeq = 0;
  private state: GameState | null = null;

  constructor(options: ClientSessionOptions) {
    this.roomCode = options.roomCode;
    this.transport = options.transport;
    this.hostPeerId = options.hostPeerId;
    this.loadout = options.loadout;
    this.onState = options.onState;
    this.onWelcome = options.onWelcome;
    this.onError = options.onError;
    this.onStatus = options.onStatus;
    this.onRoomClosed = options.onRoomClosed;
    this.onHostDropped = options.onHostDropped;

    this.transport.onMessage((peerId, data) => {
      if (peerId !== this.hostPeerId) return;
      this.handleMessage(data);
    });
    this.transport.onDisconnect((peerId) => {
      if (peerId === this.hostPeerId) {
        this.onStatus?.("disconnected from host");
        this.onHostDropped?.();
      }
    });
  }

  get localPlayerId(): PlayerId | null {
    return this.playerId;
  }

  get currentState(): GameState | null {
    return this.state;
  }

  /** Call after the transport is connected to the host. */
  greet(): void {
    const message: ClientToHost = {
      v: 1,
      type: "hello",
      roomCode: this.roomCode,
      loadout: this.loadout,
    };
    this.transport.send(this.hostPeerId, message);
    this.onStatus?.("joining");
  }

  submitAction(action: GameAction): boolean {
    if (this.playerId === null) {
      this.onError?.("NOT_ACTIVE_PLAYER");
      return false;
    }
    this.clientSeq += 1;
    const message: ClientToHost = {
      v: 1,
      type: "submit-action",
      action: { ...action, playerId: this.playerId },
      clientSeq: this.clientSeq,
    };
    this.transport.send(this.hostPeerId, message);
    return true;
  }

  requestResync(): void {
    this.transport.send(this.hostPeerId, { v: 1, type: "resync-request" });
  }

  destroy(): void {
    this.transport.destroy();
  }

  private handleMessage(data: unknown): void {
    const message = parseWireMessage(data);
    if (message === null) return;

    switch (message.type) {
      case "welcome":
        this.playerId = message.playerId;
        this.state = message.state;
        this.onWelcome(message.playerId, message.roomCode);
        this.onState(message.state);
        this.onStatus?.("connected");
        this.requestResync();
        break;
      case "state":
        this.state = message.state;
        this.onState(message.state);
        break;
      case "action-rejected":
        this.state = message.state;
        this.onState(message.state);
        this.onError?.(message.error);
        break;
      case "room-closed":
        this.onStatus?.("room closed");
        this.onRoomClosed?.();
        break;
      default:
        break;
    }
  }
}
