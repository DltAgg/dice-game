import {
  attackIsFuelled,
  getCreatureDefinition,
  legalTargetsFor,
  type AttackDefinition,
  type AttackId,
  type CreatureId,
  type CreatureState,
  type GameState,
} from "@server";
import {
  type Intent,
} from "./types";

export function attackDefinitionOf(
  state: GameState,
  attackerId: CreatureId,
  attackId: AttackId,
): AttackDefinition | undefined {
  const creature = state.creatures[attackerId];
  if (creature === undefined) return undefined;
  return getCreatureDefinition(creature.definitionId)?.attacks.find(
    (attack) => attack.id === attackId,
  );
}

export function collectAttackArrows(
  state: GameState,
  intent: Intent,
): readonly { readonly from: CreatureId; readonly to: CreatureId }[] {
  const pairs: { from: CreatureId; to: CreatureId }[] = [];
  const seen = new Set<string>();
  const add = (from: CreatureId, to: CreatureId) => {
    const key = `${from}->${to}`;
    if (seen.has(key) || from === to) return;
    seen.add(key);
    pairs.push({ from, to });
  };

  for (const link of state.chainStack) {
    if (link.kind === "attack" && link.attackerId !== null && link.attackTargetId !== null) {
      add(link.attackerId, link.attackTargetId);
    }
  }

  if (intent.kind === "attack" && intent.attackId !== undefined) {
    const attack = attackDefinitionOf(state, intent.attackerId, intent.attackId);
    if (attack !== undefined) {
      for (const targetId of legalTargetsFor(state, intent.attackerId, attack)) {
        add(intent.attackerId, targetId);
      }
    }
  }

  return pairs;
}

export function attackIsArmed(
  state: GameState,
  creature: CreatureState,
  attack: AttackDefinition,
): boolean {
  if (attack.effect === undefined) return false;
  if (
    creature.attacksUsedThisCombat >=
    state.config.attacksPerCreaturePerCombat + creature.extraAttacksThisTurn
  ) {
    return false;
  }
  if (!attackIsFuelled(state.players[creature.ownerId]?.attributePool ?? {}, attack)) return false;
  return legalTargetsFor(state, creature.id, attack).length > 0;
}

export function creatureHasArmedAttack(state: GameState, creature: CreatureState): boolean {
  const def = getCreatureDefinition(creature.definitionId);
  if (def === undefined) return false;
  return def.attacks.some((attack) => attackIsArmed(state, creature, attack));
}
