import type { PlayerId } from "../model/ids.js";
import type { OffensiveStateName, SequenceRole } from "../model/offensive.js";
import type { GameState } from "../model/state.js";
import { canSpendMeter } from "./meter.js";

/** Once-per-turn key for the opening reroll (spec `030`). */
export const TURN_REROLL_KEY = "turn-reroll";

/**
 * `open` accepts a starter. `combo` accepts an extender or a finisher.
 * `finished` accepts nothing.
 */
export function sequenceRoleFits(state: OffensiveStateName, role: SequenceRole): boolean {
  if (state === "open") return role === "starter";
  if (state === "combo") return role === "extender" || role === "finisher";
  return false;
}

/**
 * The one reroll is available immediately after the initial roll, until the
 * player rerolls or takes another Act action (spec `030`).
 */
export function canRerollDice(state: GameState, playerId: PlayerId): boolean {
  if (state.phase !== "actions") return false;
  if (state.pendingDecision !== null) return false;
  if (state.activePlayerId !== playerId) return false;
  if (!state.rerollAvailable) return false;
  const player = state.players[playerId];
  if (player === undefined) return false;
  return !player.spentOncePerTurnKeys.includes(TURN_REROLL_KEY);
}

/** True when this sequence action was already declared or has resolved. */
export function sequenceActionUsed(state: GameState, actionId: string): boolean {
  if (state.usedSequenceActionIds.includes(actionId)) return true;
  return state.chainStack.some((link) => link.sequenceActionId === actionId);
}

/**
 * Opening window: actions phase before the Act is engaged.
 * Closing window: the rest of the actions phase.
 * Placement inside the turn is the existing `actions` phase (spec `030` open
 * on a finer boundary). A chain in progress is not either window.
 */
export function tagWindow(
  state: GameState,
  playerId: PlayerId,
): "opening" | "closing" | null {
  if (state.phase !== "actions") return null;
  if (state.pendingDecision !== null) return null;
  if (state.activePlayerId !== playerId) return null;
  return state.actEngaged ? "closing" : "opening";
}

export function sequenceMeterAffordable(
  state: Pick<GameState, "players">,
  playerId: PlayerId,
  meterCost: number | undefined,
): boolean {
  return canSpendMeter(state, playerId, meterCost ?? 0);
}
