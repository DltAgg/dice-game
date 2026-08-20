import type { GameAction, GameError, GameState, PlayerId, StartingDiceLayout } from "@/game";
import type { CardId, CreatureDefinitionId, FaceCardId } from "@/game";
import { isStartingDiceLayout } from "@/game";

export const PROTOCOL_VERSION = 1 as const;

export type SeatId = "p1" | "p2";

/** Loadout a seated player brings into an online match. Spectators omit this. */
export interface WireLoadout {
  readonly squad: readonly CreatureDefinitionId[];
  readonly deck: readonly CardId[];
  readonly faceDeck: readonly FaceCardId[];
  readonly startingDice: StartingDiceLayout;
}

export interface RoomMember {
  readonly clientId: string;
  readonly peerId: string | null;
}

export interface RoomSeat extends RoomMember {
  /** True when the occupant sent a loadout that passed `validateLoadout`. */
  readonly ready: boolean;
}

/** Public lobby view broadcast to every peer. Does not include loadout JSON. */
export interface RoomSnapshot {
  readonly roomCode: string;
  readonly started: boolean;
  readonly matchId: string | null;
  readonly hostClientId: string;
  readonly seats: {
    readonly p1: RoomSeat | null;
    readonly p2: RoomSeat | null;
  };
  readonly spectators: readonly RoomMember[];
}

/** Host-only persist of seat identity + loadouts (sessionStorage reconnect). */
export interface PersistedSeat {
  readonly clientId: string;
  readonly loadout: WireLoadout;
}

export interface PersistedRoom {
  readonly hostClientId: string;
  readonly p1: PersistedSeat | null;
  readonly p2: PersistedSeat | null;
  readonly started: boolean;
}

/** Protocol-level reject; `"NOT_SEATED"` is not a `GameError` (spectators never `advance()`). */
export type ProtocolError = GameError | "NOT_SEATED";

export type ClientToHost =
  | { readonly v: 1; readonly type: "hello"; readonly roomCode: string; readonly clientId: string }
  | {
      readonly v: 1;
      readonly type: "claim-seat";
      readonly seat: SeatId;
      readonly loadout: WireLoadout;
    }
  | { readonly v: 1; readonly type: "release-seat" }
  | {
      readonly v: 1;
      readonly type: "submit-action";
      readonly action: GameAction;
      readonly clientSeq: number;
    }
  | { readonly v: 1; readonly type: "resync-request" };

export type HostToClient =
  | {
      readonly v: 1;
      readonly type: "welcome";
      readonly roomCode: string;
      readonly playerId: PlayerId | null;
      readonly room: RoomSnapshot;
      readonly matchId?: string;
      readonly state?: GameState;
    }
  | { readonly v: 1; readonly type: "room"; readonly room: RoomSnapshot }
  | {
      readonly v: 1;
      readonly type: "state";
      readonly state: GameState;
      readonly appliedClientSeq?: number;
    }
  | {
      readonly v: 1;
      readonly type: "action-rejected";
      readonly error: ProtocolError;
      readonly clientSeq: number;
      readonly state: GameState | null;
    }
  | { readonly v: 1; readonly type: "seat-rejected"; readonly reason: string }
  | { readonly v: 1; readonly type: "room-closed" };

export type WireMessage = ClientToHost | HostToClient;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLoadout(value: unknown): value is WireLoadout {
  if (!isRecord(value)) return false;
  return (
    Array.isArray(value.squad) &&
    Array.isArray(value.deck) &&
    Array.isArray(value.faceDeck) &&
    isStartingDiceLayout(value.startingDice)
  );
}

export function isSeatId(value: unknown): value is SeatId {
  return value === "p1" || value === "p2";
}

function isRoomMember(value: unknown): value is RoomMember {
  if (!isRecord(value)) return false;
  return (
    typeof value.clientId === "string" &&
    (value.peerId === null || typeof value.peerId === "string")
  );
}

function isRoomSeat(value: unknown): value is RoomSeat {
  return isRoomMember(value) && "ready" in value && typeof value.ready === "boolean";
}

export function isRoomSnapshot(value: unknown): value is RoomSnapshot {
  if (!isRecord(value)) return false;
  if (typeof value.roomCode !== "string") return false;
  if (typeof value.started !== "boolean") return false;
  if (value.matchId !== null && typeof value.matchId !== "string") return false;
  if (typeof value.hostClientId !== "string") return false;
  if (!isRecord(value.seats)) return false;
  if (value.seats.p1 !== null && !isRoomSeat(value.seats.p1)) return false;
  if (value.seats.p2 !== null && !isRoomSeat(value.seats.p2)) return false;
  return Array.isArray(value.spectators) && value.spectators.every(isRoomMember);
}

function isPlayerIdOrNull(value: unknown): value is PlayerId | null {
  return value === null || value === "p1" || value === "p2";
}

/** Narrow unknown JSON from PeerJS into a protocol message, or null. */
export function parseWireMessage(raw: unknown): WireMessage | null {
  if (!isRecord(raw) || raw.v !== PROTOCOL_VERSION || typeof raw.type !== "string") {
    return null;
  }

  switch (raw.type) {
    case "hello":
      if (typeof raw.roomCode !== "string" || typeof raw.clientId !== "string") return null;
      if (raw.clientId.length === 0 || raw.clientId.length > 64) return null;
      return {
        v: 1,
        type: "hello",
        roomCode: raw.roomCode,
        clientId: raw.clientId,
      };
    case "claim-seat":
      if (!isSeatId(raw.seat) || !isLoadout(raw.loadout)) return null;
      return { v: 1, type: "claim-seat", seat: raw.seat, loadout: raw.loadout };
    case "release-seat":
      return { v: 1, type: "release-seat" };
    case "submit-action":
      if (!isRecord(raw.action) || typeof raw.clientSeq !== "number") return null;
      return {
        v: 1,
        type: "submit-action",
        action: raw.action as GameAction,
        clientSeq: raw.clientSeq,
      };
    case "resync-request":
      return { v: 1, type: "resync-request" };
    case "welcome":
      if (typeof raw.roomCode !== "string" || !isPlayerIdOrNull(raw.playerId)) return null;
      if (!isRoomSnapshot(raw.room)) return null;
      if (raw.matchId !== undefined && typeof raw.matchId !== "string") return null;
      if (raw.state !== undefined && !isRecord(raw.state)) return null;
      return {
        v: 1,
        type: "welcome",
        roomCode: raw.roomCode,
        playerId: raw.playerId,
        room: raw.room,
        ...(typeof raw.matchId === "string" ? { matchId: raw.matchId } : {}),
        ...(isRecord(raw.state) ? { state: raw.state as unknown as GameState } : {}),
      };
    case "room":
      if (!isRoomSnapshot(raw.room)) return null;
      return { v: 1, type: "room", room: raw.room };
    case "state":
      if (!isRecord(raw.state)) return null;
      return {
        v: 1,
        type: "state",
        state: raw.state as unknown as GameState,
        ...(typeof raw.appliedClientSeq === "number"
          ? { appliedClientSeq: raw.appliedClientSeq }
          : {}),
      };
    case "action-rejected":
      if (typeof raw.error !== "string" || typeof raw.clientSeq !== "number") return null;
      if (raw.state !== null && !isRecord(raw.state)) return null;
      return {
        v: 1,
        type: "action-rejected",
        error: raw.error as ProtocolError,
        clientSeq: raw.clientSeq,
        state: raw.state === null ? null : (raw.state as unknown as GameState),
      };
    case "seat-rejected":
      if (typeof raw.reason !== "string") return null;
      return { v: 1, type: "seat-rejected", reason: raw.reason };
    case "room-closed":
      return { v: 1, type: "room-closed" };
    default:
      return null;
  }
}
