import type { AttackDefinition } from "../model/creatures.js";
import type { GameError } from "../model/errors.js";
import type { CreatureId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { findCreature, isLegendaryCreature } from "./creatures.js";
import { hasFrontlineBreach, livingFrontlinerInLane } from "./lanes.js";

type AttackRange = Pick<AttackDefinition, "range">;

export type SplitDamagePending = Extract<
  NonNullable<GameState["pendingDecision"]>,
  { type: "split-damage" }
>;

/**
 * Spec `029`: creature attacks use lane facing and legendary privilege.
 * Range ignores lanes. Card/face effects that name creatures are not attacks
 * (`rules/targets.ts`) and still ignore this geometry.
 */
export function targetingError(
  state: GameState,
  attackerId: CreatureId,
  attack: AttackRange,
  targetId: CreatureId,
): GameError | null {
  const attacker = findCreature(state, attackerId);
  const target = findCreature(state, targetId);

  if (attacker === undefined || target === undefined) return "UNKNOWN_ENTITY";
  if (attacker.defeated) return "CREATURE_DEFEATED";
  if (target.defeated) return "CREATURE_DEFEATED";
  if (attacker.ownerId === target.ownerId) return "INVALID_TARGET";

  if (attack.range) return null;

  const defenderId = target.ownerId;

  if (isLegendaryCreature(attacker)) {
    if (target.position === "frontline") return null;
    if (isLegendaryCreature(target) && hasFrontlineBreach(state, defenderId)) return null;
    return "INVALID_TARGET";
  }

  const facing = attacker.lane;
  if (facing === null) {
    // ASSUMED: swapped onto the legendary's unnumbered seat.
    if (isLegendaryCreature(target) && hasFrontlineBreach(state, defenderId)) return null;
    return "INVALID_TARGET";
  }

  const blocker = livingFrontlinerInLane(state, defenderId, facing);
  if (blocker !== null) {
    return target.id === blocker.id ? null : "INVALID_TARGET";
  }
  return isLegendaryCreature(target) ? null : "INVALID_TARGET";
}

export const canTargetCreature = (
  state: GameState,
  attackerId: CreatureId,
  attack: AttackRange,
  targetId: CreatureId,
): boolean => targetingError(state, attackerId, attack, targetId) === null;

/** Every creature the given attack may legally hit right now. */
export const legalTargetsFor = (
  state: GameState,
  attackerId: CreatureId,
  attack: AttackRange,
): readonly CreatureId[] =>
  Object.values(state.creatures)
    .filter((creature) => canTargetCreature(state, attackerId, attack, creature.id))
    .map((creature) => creature.id);

/**
 * Split-damage chooser. When `pending.attackerId` is null, any living
 * creature is legal (today's card-effect behavior). Otherwise the pending
 * `range` flag is scored as an attack against that attacker (spec `029`).
 */
export function legalSplitDamageTargets(
  state: GameState,
  pending: SplitDamagePending,
): readonly CreatureId[] {
  return Object.values(state.creatures)
    .filter((creature) => {
      if (creature.defeated) return false;
      if (pending.attackerId === null) return true;
      return canTargetCreature(state, pending.attackerId, { range: pending.range }, creature.id);
    })
    .map((creature) => creature.id);
}
