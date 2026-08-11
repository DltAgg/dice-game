import type { GameAction, GameError, GameState, PlayerId } from "@/game";
import type { CardId, CreatureDefinitionId, FaceCardId } from "@/game";

export const PROTOCOL_VERSION = 1 as const;

/** Loadout the guest (or host) brings into an online match. */
export interface WireLoadout {
  readonly squad: readonly CreatureDefinitionId[];
  readonly deck: readonly CardId[];
  readonly faceDeck: readonly FaceCardId[];
}

export type ClientToHost =
  | { readonly v: 1; readonly type: "hello"; readonly roomCode: string; readonly loadout: WireLoadout }
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
      readonly matchId: string;
      readonly playerId: PlayerId;
      readonly roomCode: string;
      readonly state: GameState;
    }
  | {
      readonly v: 1;
      readonly type: "state";
      readonly state: GameState;
      readonly appliedClientSeq?: number;
    }
  | {
      readonly v: 1;
      readonly type: "action-rejected";
      readonly error: GameError;
      readonly clientSeq: number;
      readonly state: GameState;
    }
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
    Array.isArray(value.faceDeck)
  );
}

/** Narrow unknown JSON from PeerJS into a protocol message, or null. */
export function parseWireMessage(raw: unknown): WireMessage | null {
  if (!isRecord(raw) || raw.v !== PROTOCOL_VERSION || typeof raw.type !== "string") {
    return null;
  }

  switch (raw.type) {
    case "hello":
      if (typeof raw.roomCode !== "string" || !isLoadout(raw.loadout)) return null;
      return {
        v: 1,
        type: "hello",
        roomCode: raw.roomCode,
        loadout: raw.loadout,
      };
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
      if (
        typeof raw.matchId !== "string" ||
        typeof raw.playerId !== "string" ||
        typeof raw.roomCode !== "string" ||
        !isRecord(raw.state)
      ) {
        return null;
      }
      return {
        v: 1,
        type: "welcome",
        matchId: raw.matchId,
        playerId: raw.playerId as PlayerId,
        roomCode: raw.roomCode,
        state: raw.state as unknown as GameState,
      };
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
      if (
        typeof raw.error !== "string" ||
        typeof raw.clientSeq !== "number" ||
        !isRecord(raw.state)
      ) {
        return null;
      }
      return {
        v: 1,
        type: "action-rejected",
        error: raw.error as GameError,
        clientSeq: raw.clientSeq,
        state: raw.state as unknown as GameState,
      };
    case "room-closed":
      return { v: 1, type: "room-closed" };
    default:
      return null;
  }
}
