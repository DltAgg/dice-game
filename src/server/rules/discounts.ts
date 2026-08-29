import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import type { CardDefinition, StandingTrigger } from "../model/cards.js";
import type { CreatureId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { ATTRIBUTES, type Attribute } from "../model/attributes.js";
import {
  requirementEntries,
  requirementTotal,
  type AttributeTokens,
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

/**
 * After `[Discount N]`, the player owes this many pile tokens (minimum 0).
 * Each token must still come from an attribute on the printed cost and may not
 * exceed that attribute’s printed count — see `pickSpendUnderCaps`.
 */
export function discountedRequirementNeed(
  requirement: SymbolRequirement,
  discount: number,
): number {
  return Math.max(0, requirementTotal(requirement) - Math.max(0, discount));
}

/**
 * Whether the pile (plus Resonance wildcards) can pay `need` tokens under the
 * printed attribute caps. Does not invent a rigid peeled `SymbolRequirement`.
 */
export function canAffordUnderCaps(
  tokens: AttributeTokens,
  caps: SymbolRequirement,
  need: number,
  wildcardCount = 0,
): boolean {
  if (need <= 0) return true;
  let fromPile = 0;
  for (const [attribute, cap] of requirementEntries(caps)) {
    fromPile += Math.min(tokens[attribute] ?? 0, cap);
  }
  return need - fromPile <= wildcardCount;
}

/**
 * Deterministic header spend of `need` under printed `caps`.
 * 1. Take from the pile in `ATTRIBUTES` order (min of cap, held, remaining).
 * 2. Pad any leftover onto caps in the same order (Resonance shortfall).
 */
export function pickSpendUnderCaps(
  tokens: AttributeTokens,
  caps: SymbolRequirement,
  need: number,
): SymbolRequirement {
  if (need <= 0) return {};
  const spend: Partial<Record<Attribute, number>> = {};
  let remaining = need;

  for (const attribute of ATTRIBUTES) {
    if (remaining <= 0) break;
    const cap = caps[attribute] ?? 0;
    if (cap <= 0) continue;
    const take = Math.min(cap, tokens[attribute] ?? 0, remaining);
    if (take > 0) {
      spend[attribute] = take;
      remaining -= take;
    }
  }

  if (remaining > 0) {
    for (const attribute of ATTRIBUTES) {
      if (remaining <= 0) break;
      const cap = caps[attribute] ?? 0;
      if (cap <= 0) continue;
      const already = spend[attribute] ?? 0;
      const pad = Math.min(cap - already, remaining);
      if (pad > 0) {
        spend[attribute] = already + pad;
        remaining -= pad;
      }
    }
  }

  return spend;
}

/**
 * Auto-picked pile burn after discount N, given the current pile.
 * Prefer `canAffordUnderCaps` for legality queries; this is for payment.
 */
export function reduceRequirement(
  requirement: SymbolRequirement,
  discount: number,
  tokens: AttributeTokens = {},
): SymbolRequirement {
  return pickSpendUnderCaps(
    tokens,
    requirement,
    discountedRequirementNeed(requirement, discount),
  );
}

export function discountedPlayRequirement(
  state: GameState | Draft,
  playerId: PlayerId,
  definition: CardDefinition,
  baseCost: SymbolRequirement,
): { readonly cost: SymbolRequirement; readonly matches: readonly DiscountMatch[] } {
  const matches = matchingPlayCostDiscounts(state, playerId, definition);
  const discount = matches.reduce((sum, match) => sum + match.amount, 0);
  const pile = state.players[playerId]?.attributePool ?? {};
  return { cost: reduceRequirement(baseCost, discount, pile), matches };
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
