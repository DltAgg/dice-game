import type { GameAction, GameState, PlayerId } from "@server";
import type { AiStrength } from "./search/config.js";

export type { AiStrength } from "./search/config.js";

export type LoadoutId = string;

export interface PlaytestSeat {
  readonly playerId: PlayerId;
  readonly loadoutId: LoadoutId;
}

export interface PlaytestOptions {
  readonly seed: number;
  readonly p1LoadoutId: LoadoutId;
  readonly p2LoadoutId: LoadoutId;
  /** Hard cap on turns (each seat taking a turn counts as one). Default 400. */
  readonly maxTurns?: number;
  /** Safety valve inside one turn so a buggy candidate set cannot spin. */
  readonly maxActionsPerTurn?: number;
  /** Driver default `fast` (1-ply). CLI / human play use `standard`. */
  readonly strength?: AiStrength;
}

export type PlaytestStopReason = "finished" | "max-turns" | "stall";

export interface PlaytestReport {
  readonly seed: number;
  readonly p1LoadoutId: LoadoutId;
  readonly p2LoadoutId: LoadoutId;
  readonly status: GameState["status"];
  readonly winner: PlayerId | null;
  readonly turnsPlayed: number;
  readonly actionsPlayed: number;
  readonly stopReason: PlaytestStopReason;
  readonly stallDetail: string | null;
  readonly actions: readonly GameAction[];
  readonly state: GameState;
}
