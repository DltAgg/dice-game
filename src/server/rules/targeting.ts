import type { AttackDefinition } from "../model/creatures.js";
import type { GameError } from "../model/errors.js";
import type { CreatureId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { findCreature, livingCreaturesOf } from "./creatures.js";

/**
 * Bible §6: the frontline protects the back, and Range ignores that
 * restriction. This is a rule relation, never UI geometry (SPDD §21).
 *
 * The exact wording of "cannot freely bypass the frontline" is an open design
 * question. The prototype reading is the strict one: a non-Range attack may
 * reach a back-row creature only while the defender has no living frontline
 * creature left. See docs/OPEN_DESIGN.md.
 */
export function targetingError(
  state: GameState,
  attackerId: CreatureId,
  attack: AttackDefinition,
  targetId: CreatureId,
): GameError | null {
  const attacker = findCreature(state, attackerId);
  const target = findCreature(state, targetId);

  if (attacker === undefined || target === undefined) return "UNKNOWN_ENTITY";
  if (attacker.defeated) return "CREATURE_DEFEATED";
  if (target.defeated) return "CREATURE_DEFEATED";
  if (attacker.ownerId === target.ownerId) return "INVALID_TARGET";

  if (target.position === "back" && !attack.range) {
    const defendersInFront = livingCreaturesOf(state, target.ownerId).filter(
      (creature) => creature.position === "frontline",
    );
    if (defendersInFront.length > 0) return "INVALID_TARGET";
  }

  return null;
}

export const canTargetCreature = (
  state: GameState,
  attackerId: CreatureId,
  attack: AttackDefinition,
  targetId: CreatureId,
): boolean => targetingError(state, attackerId, attack, targetId) === null;

/** Every creature the given attack may legally hit right now. */
export const legalTargetsFor = (
  state: GameState,
  attackerId: CreatureId,
  attack: AttackDefinition,
): readonly CreatureId[] =>
  Object.values(state.creatures)
    .filter((creature) => canTargetCreature(state, attackerId, attack, creature.id))
    .map((creature) => creature.id);
