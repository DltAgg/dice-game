import type { GameAction, GameState, PlayerId } from "@/game";
import { asPlayerId } from "@/game";
import {
  parseWireMessage,
  type ClientToHost,
  type ProtocolError,
  type RoomSnapshot,
  type SeatId,
  type WireLoadout,
} from "./protocol.js";
import type { NetTransport } from "./transport.js";

export interface ClientSessionOptions {
  readonly roomCode: string;
  readonly transport: NetTransport;
  /** Peer id of the host (same as room code when hosting with Peer id = room). */
  readonly hostPeerId: string;
  /** Stable identity used to rebind a seat after refresh. */
  readonly clientId: string;
  readonly onState: (state: GameState) => void;
  readonly onWelcome: (playerId: PlayerId | null, roomCode: string, room: RoomSnapshot) => void;
  readonly onRoom?: (room: RoomSnapshot) => void;
  readonly onError?: (error: ProtocolError) => void;
  readonly onSeatRejected?: (reason: string) => void;
  readonly onStatus?: (status: string) => void;
  readonly onRoomClosed?: () => void;
  /** Live tab: host DataConnection dropped (guest page still mounted). */
  readonly onHostDropped?: () => void;
}

/**
 * Remote client: sends lobby intents and match actions; applies host state only.
 * Spectators never stamp a `playerId` or submit `GameAction`s.
 */
export class ClientSession {
  readonly roomCode: string;
  readonly clientId: string;
  private readonly transport: NetTransport;
  private readonly hostPeerId: string;
  private readonly onState: (state: GameState) => void;
  private readonly onWelcome: (playerId: PlayerId | null, roomCode: string, room: RoomSnapshot) => void;
  private readonly onRoomCb: ((room: RoomSnapshot) => void) | undefined;
  private readonly onError: ((error: ProtocolError) => void) | undefined;
  private readonly onSeatRejected: ((reason: string) => void) | undefined;
  private readonly onStatus: ((status: string) => void) | undefined;
  private readonly onRoomClosed: (() => void) | undefined;
  private readonly onHostDropped: (() => void) | undefined;

  private playerId: PlayerId | null = null;
  private clientSeq = 0;
  private state: GameState | null = null;
  private room: RoomSnapshot | null = null;

  constructor(options: ClientSessionOptions) {
    this.roomCode = options.roomCode;
    this.clientId = options.clientId;
    this.transport = options.transport;
    this.hostPeerId = options.hostPeerId;
    this.onState = options.onState;
    this.onWelcome = options.onWelcome;
    this.onRoomCb = options.onRoom;
    this.onError = options.onError;
    this.onSeatRejected = options.onSeatRejected;
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

  get currentRoom(): RoomSnapshot | null {
    return this.room;
  }

  /** Call after the transport is connected to the host. */
  greet(): void {
    const message: ClientToHost = {
      v: 1,
      type: "hello",
      roomCode: this.roomCode,
      clientId: this.clientId,
    };
    this.transport.send(this.hostPeerId, message);
    this.onStatus?.("joining");
  }

  claimSeat(seat: SeatId, loadout: WireLoadout): void {
    const message: ClientToHost = {
      v: 1,
      type: "claim-seat",
      seat,
      loadout,
    };
    this.transport.send(this.hostPeerId, message);
  }

  releaseSeat(): void {
    this.transport.send(this.hostPeerId, { v: 1, type: "release-seat" });
  }

  submitAction(action: GameAction): boolean {
    if (this.playerId === null) {
      this.onError?.("NOT_SEATED");
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
        this.room = message.room;
        if (message.state !== undefined) {
          this.state = message.state;
          this.onState(message.state);
        }
        this.onWelcome(message.playerId, message.roomCode, message.room);
        this.onRoomCb?.(message.room);
        this.onStatus?.("connected");
        if (message.state !== undefined) {
          this.requestResync();
        }
        break;
      case "room":
        this.room = message.room;
        this.syncSeatFromRoom(message.room);
        this.onRoomCb?.(message.room);
        break;
      case "state":
        this.state = message.state;
        this.onState(message.state);
        break;
      case "action-rejected":
        if (message.state !== null) {
          this.state = message.state;
          this.onState(message.state);
        }
        this.onError?.(message.error);
        break;
      case "seat-rejected":
        this.onSeatRejected?.(message.reason);
        break;
      case "room-closed":
        this.onStatus?.("room closed");
        this.onRoomClosed?.();
        break;
      default:
        break;
    }
  }

  private syncSeatFromRoom(room: RoomSnapshot): void {
    if (room.seats.p1?.clientId === this.clientId) {
      this.playerId = asPlayerId("p1");
      return;
    }
    if (room.seats.p2?.clientId === this.clientId) {
      this.playerId = asPlayerId("p2");
      return;
    }
    this.playerId = null;
  }
}
