import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import type { CardDefinition, StandingTrigger } from "../model/cards.js";
import type { CreatureId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import type { Attribute } from "../model/attributes.js";
import {
  requirementEntries,
  type SymbolRequirement,
} from "../model/symbols.js";
import type { Draft } from "../reducer/draft.js";

export type DiscountMatch = {
  readonly amount: number;
  readonly creatureId: CreatureId;
  readonly key: string;
};

function discountMatches(ability: StandingTrigger, definition: CardDefinition): boolean {
  if (ability.type !== "play-cost-discount") return false;
  if (ability.cardTypes !== undefined && !ability.cardTypes.includes(definition.type)) {
    return false;
  }
  if (
    ability.subtypes !== undefined &&
    !ability.subtypes.some((subtype) => definition.subtypes.includes(subtype))
  ) {
    return false;
  }
  if (ability.attributes !== undefined && !ability.attributes.includes(definition.attribute)) {
    return false;
  }
  return true;
}

function collectDiscountHosts(state: GameState | Draft): readonly {
  readonly creatureId: CreatureId;
  readonly keyPrefix: string;
  readonly abilities: readonly StandingTrigger[];
}[] {
  const hosts: {
    readonly creatureId: CreatureId;
    readonly keyPrefix: string;
    readonly abilities: readonly StandingTrigger[];
  }[] = [];

  for (const creature of Object.values(state.creatures)) {
    if (creature.defeated) continue;
    const standing = getCreatureDefinition(creature.definitionId)?.standingAbilities ?? [];
    if (standing.length > 0) {
      hosts.push({
        creatureId: creature.id,
        keyPrefix: `creature:${creature.id}`,
        abilities: standing,
      });
    }
    for (const cardInstanceId of creature.equipmentIds) {
      const instance = state.cards[cardInstanceId];
      if (instance === undefined) continue;
      const abilities = getCard(instance.cardId)?.equipment?.abilities ?? [];
      if (abilities.length === 0) continue;
      hosts.push({
        creatureId: creature.id,
        keyPrefix: `equip:${cardInstanceId}`,
        abilities,
      });
    }
  }
  return hosts;
}

/**
 * Pile-cost discounts for PLAY_CARD / ritual place / equip / overload (not FORGE).
 * Stacks; each once-per-turn ability applies at most once. Min cost is applied
 * by the caller.
 */
export function matchingPlayCostDiscounts(
  state: GameState | Draft,
  playerId: PlayerId,
  definition: CardDefinition,
): readonly DiscountMatch[] {
  const matches: DiscountMatch[] = [];
  for (const host of collectDiscountHosts(state)) {
    const owner = state.creatures[host.creatureId]?.ownerId;
    if (owner !== playerId) continue;
    for (const ability of host.abilities) {
      if (!discountMatches(ability, definition)) continue;
      const key = `${host.keyPrefix}:play-cost-discount`;
      if (ability.type !== "play-cost-discount") continue;
      if (
        ability.oncePerTurn === true &&
        (state.creatures[host.creatureId]?.spentOncePerTurnTriggers.includes(key) ?? false)
      ) {
        continue;
      }
      matches.push({ amount: ability.amount, creatureId: host.creatureId, key });
    }
  }
  return matches;
}

export function reduceRequirement(
  requirement: SymbolRequirement,
  discount: number,
): SymbolRequirement {
  if (discount <= 0) return requirement;
  const result: Partial<Record<Attribute, number>> = {};
  let remaining = discount;
  for (const [attribute, count] of requirementEntries(requirement)) {
    const reduced = Math.max(0, count - remaining);
    remaining = Math.max(0, remaining - count);
    if (reduced > 0) result[attribute] = reduced;
  }
  return result;
}

export function discountedPlayRequirement(
  state: GameState | Draft,
  playerId: PlayerId,
  definition: CardDefinition,
  baseCost: SymbolRequirement,
): { readonly cost: SymbolRequirement; readonly matches: readonly DiscountMatch[] } {
  const matches = matchingPlayCostDiscounts(state, playerId, definition);
  const discount = matches.reduce((sum, match) => sum + match.amount, 0);
  return { cost: reduceRequirement(baseCost, discount), matches };
}

export function attackIgnoreShieldAmount(
  state: GameState | Draft,
  attackerId: CreatureId,
  playerId: PlayerId,
): number {
  let amount = state.ignoreShieldThisTurn[playerId] ?? 0;
  const attacker = state.creatures[attackerId];
  if (attacker === undefined) return amount;
  const standing = getCreatureDefinition(attacker.definitionId)?.standingAbilities ?? [];
  for (const ability of standing) {
    if (ability.type === "ignore-shield") amount += ability.amount;
  }
  for (const cardInstanceId of attacker.equipmentIds) {
    const instance = state.cards[cardInstanceId];
    if (instance === undefined) continue;
    for (const ability of getCard(instance.cardId)?.equipment?.abilities ?? []) {
      if (ability.type === "ignore-shield") amount += ability.amount;
    }
  }
  return amount;
}
