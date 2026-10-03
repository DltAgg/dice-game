import type { GameError } from "../../model/errors.js";
import type { DieId, PlayerId } from "../../model/ids.js";
import type { RNG } from "../../rng/rng.js";
import { canRerollDice, TURN_REROLL_KEY } from "../../rules/offensive.js";
import { emit, type Draft } from "../draft.js";
import { markPlayerSpent } from "../triggerSpent.js";
import { publishShownFaceRolls, rollOneDie } from "./rollDice.js";

/**
 * Once-per-turn reroll of any number of the actor's own dice (spec `030`).
 * Stays in `actions`. Does not roll the opponent's dice.
 */
export function rerollDice(
  draft: Draft,
  playerId: PlayerId,
  dieIds: readonly DieId[],
  rng: RNG,
): GameError | null {
  if (!canRerollDice(draft, playerId)) {
    if (draft.phase !== "actions") return "INVALID_PHASE";
    if (draft.players[playerId]?.spentOncePerTurnKeys.includes(TURN_REROLL_KEY)) {
      return "ALREADY_USED";
    }
    return "INVALID_PHASE";
  }
  if (dieIds.length === 0) return "INVALID_TARGET";
  if (new Set(dieIds).size !== dieIds.length) return "INVALID_TARGET";

  for (const dieId of dieIds) {
    const die = draft.dice[dieId];
    if (die === undefined) return "UNKNOWN_ENTITY";
    if (die.ownerId !== playerId) return "INVALID_TARGET";
  }

  markPlayerSpent(draft, playerId, TURN_REROLL_KEY);
  emit(draft, { type: "dice-rerolled", playerId, dieIds });

  const rolled = [];
  for (const dieId of dieIds) {
    const die = draft.dice[dieId];
    if (die === undefined) continue;
    const entry = rollOneDie(draft, die, rng, true);
    if (entry !== undefined) rolled.push(entry);
  }
  publishShownFaceRolls(draft, rolled);
  return null;
}
