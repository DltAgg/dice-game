import { getCreatureDefinition } from "../content/creatures.js";
import type { CreatureId } from "../model/ids.js";
import type { SequenceRole } from "../model/offensive.js";
import type { GameState } from "../model/state.js";

const GRAPPLER = "grappler";

/**
 * Remembered on `usedSequenceActionIds` for this turn.
 * A later turn uses a new mark, so a Grappler's first Starter whiffs again.
 */
export function starterWhiffMark(targetId: CreatureId, turn: number): string {
  return `starter-whiff:${targetId}:${String(turn)}`;
}

/**
 * Starter Strike that still lands on the Active Fighter when that Fighter
 * has `halveStarterDamage`. Rounded down. Other roles, Reserve Fighters,
 * and other Active Fighters keep `amount`. Applies on every turn he is Active.
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
  if (state.players[creature.ownerId]?.activeCreatureId !== creatureId) return amount;
  const definition = getCreatureDefinition(creature.definitionId);
  if (definition?.halveStarterDamage !== true) return amount;
  return Math.floor(amount / 2);
}

/**
 * True when the attacker's Active Fighter is a Grappler and this is that
 * Grappler's first starter of the turn against the opponent's Active Fighter
 * with `grapplerStarterWhiff`. The face's owner does not decide it. The hit
 * does not connect. A new turn asks for that first Starter again.
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
  if (state.players[target.ownerId]?.activeCreatureId !== targetCreatureId) return false;
  const targetDef = getCreatureDefinition(target.definitionId);
  if (targetDef?.grapplerStarterWhiff !== true) return false;
  const activeAttackerId = state.players[source.ownerId]?.activeCreatureId;
  const activeAttacker =
    activeAttackerId === undefined ? undefined : state.creatures[activeAttackerId];
  if (activeAttacker === undefined) return false;
  const attackerDef = getCreatureDefinition(activeAttacker.definitionId);
  if (attackerDef?.archetype !== GRAPPLER) return false;
  return !state.usedSequenceActionIds.includes(starterWhiffMark(targetCreatureId, state.turn));
}
