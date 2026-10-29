import { getCreatureDefinition } from "../content/creatures.js";
import type { CreatureId } from "../model/ids.js";
import type { SequenceRole } from "../model/offensive.js";
import type { GameState } from "../model/state.js";

const GRAPPLER = "grappler";

/** Remembered on `usedSequenceActionIds` until that list is cleared. */
export function starterWhiffMark(targetId: CreatureId): string {
  return `starter-whiff:${targetId}`;
}

/**
 * Starter Strike that still lands on a Fighter with `halveStarterDamage`.
 * Rounded down. Other roles and other Fighters keep `amount`.
 */
export function starterStrikeAmount(
  state: GameState,
  creatureId: CreatureId,
  amount: number,
  role: SequenceRole | undefined,
): number {
  if (role !== "starter") return amount;
  const creature = state.creatures[creatureId];
  if (creature === undefined) return amount;
  const definition = getCreatureDefinition(creature.definitionId);
  if (definition?.halveStarterDamage !== true) return amount;
  return Math.floor(amount / 2);
}

/**
 * True when this starter is a Grappler's first of the sequence against a
 * Fighter with `grapplerStarterWhiff`. The hit does not connect.
 */
export function grapplerStarterWhiffs(
  state: GameState,
  sourceCreatureId: CreatureId | null,
  targetCreatureId: CreatureId | null,
  role: SequenceRole,
): boolean {
  if (role !== "starter" || sourceCreatureId === null || targetCreatureId === null) return false;
  const source = state.creatures[sourceCreatureId];
  const target = state.creatures[targetCreatureId];
  if (source === undefined || target === undefined) return false;
  const targetDef = getCreatureDefinition(target.definitionId);
  const sourceDef = getCreatureDefinition(source.definitionId);
  if (targetDef?.grapplerStarterWhiff !== true) return false;
  if (sourceDef?.archetype !== GRAPPLER) return false;
  return !state.usedSequenceActionIds.includes(starterWhiffMark(targetCreatureId));
}
