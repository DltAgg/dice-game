import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import type { CardDefinition, StandingTrigger } from "../model/cards.js";
import type { CreatureId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { ATTRIBUTES, type Attribute } from "../model/attributes.js";
import {
  genericCount,
  requirementEntries,
  requirementTotal,
  type AttributeTokens,
  type SymbolRequirement,
} from "../model/symbols.js";
import type { Draft } from "../reducer/draft.js";
import { isCreatureSilenced } from "./silence.js";

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
    if (isCreatureSilenced(state as GameState, creature.id)) continue;
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
 * Discount reduces `Any` pips first, then named attributes — see
 * `pickSpendUnderCaps`.
 */
export function discountedRequirementNeed(
  requirement: SymbolRequirement,
  discount: number,
): number {
  return Math.max(0, requirementTotal(requirement) - Math.max(0, discount));
}

/** Apply discount to generic (`Any`) first, then named totals. */
function splitDiscount(
  caps: SymbolRequirement,
  discount: number,
): { readonly namedNeed: number; readonly genericNeed: number } {
  const generic = genericCount(caps);
  const namedTotal = requirementTotal(caps) - generic;
  let remainingDiscount = Math.max(0, discount);
  const fromGeneric = Math.min(generic, remainingDiscount);
  remainingDiscount -= fromGeneric;
  return {
    namedNeed: Math.max(0, namedTotal - remainingDiscount),
    genericNeed: generic - fromGeneric,
  };
}

function heldTotal(tokens: AttributeTokens): number {
  let total = 0;
  for (const attribute of ATTRIBUTES) {
    total += tokens[attribute] ?? 0;
  }
  return total;
}

/**
 * Whether the pile (plus Resonance wildcards) can pay `need` tokens under the
 * printed caps. Named identity is reserved first; leftover tokens cover `Any`.
 * `[Discount]` reduces `Any` first so a 1-Arcane + 2-Any cost discounted by 1
 * still needs the Arcane.
 */
export function canAffordUnderCaps(
  tokens: AttributeTokens,
  caps: SymbolRequirement,
  need: number,
  wildcardCount = 0,
): boolean {
  if (need <= 0) return true;
  const total = requirementTotal(caps);
  const { namedNeed, genericNeed } = splitDiscount(caps, Math.max(0, total - need));

  let namedFromPile = 0;
  for (const [attribute, cap] of requirementEntries(caps)) {
    namedFromPile += Math.min(tokens[attribute] ?? 0, cap);
  }
  const namedShort = Math.max(0, namedNeed - namedFromPile);
  if (namedShort > wildcardCount) return false;

  const namedTaken = Math.min(namedFromPile, namedNeed);
  const leftover = heldTotal(tokens) - namedTaken;
  const genericShort = Math.max(0, genericNeed - leftover);
  return genericShort <= wildcardCount - namedShort;
}

/**
 * Deterministic header spend of `need` under printed `caps`.
 * Named pips first (ATTRIBUTES order, under named caps), then `Any` from
 * leftover tokens (ATTRIBUTES order). Pads shortfall onto named caps, then
 * onto Martial for remaining generic (Resonance wildcard pad).
 */
export function pickSpendUnderCaps(
  tokens: AttributeTokens,
  caps: SymbolRequirement,
  need: number,
): SymbolRequirement {
  if (need <= 0) return {};
  const total = requirementTotal(caps);
  const { namedNeed, genericNeed } = splitDiscount(caps, Math.max(0, total - need));
  const namedSpend: Partial<Record<Attribute, number>> = {};
  const remaining: Partial<Record<Attribute, number>> = { ...tokens };

  let namedLeft = namedNeed;
  for (const attribute of ATTRIBUTES) {
    if (namedLeft <= 0) break;
    const cap = caps[attribute] ?? 0;
    if (cap <= 0) continue;
    const have = remaining[attribute] ?? 0;
    const take = Math.min(cap, have, namedLeft);
    if (take > 0) {
      namedSpend[attribute] = take;
      remaining[attribute] = have - take;
      namedLeft -= take;
    }
  }

  const genericSpend: Partial<Record<Attribute, number>> = {};
  let genericLeft = genericNeed;
  for (const attribute of ATTRIBUTES) {
    if (genericLeft <= 0) break;
    const have = remaining[attribute] ?? 0;
    const take = Math.min(have, genericLeft);
    if (take > 0) {
      genericSpend[attribute] = take;
      remaining[attribute] = have - take;
      genericLeft -= take;
    }
  }

  if (namedLeft > 0) {
    for (const attribute of ATTRIBUTES) {
      if (namedLeft <= 0) break;
      const cap = caps[attribute] ?? 0;
      if (cap <= 0) continue;
      const already = namedSpend[attribute] ?? 0;
      const pad = Math.min(cap - already, namedLeft);
      if (pad > 0) {
        namedSpend[attribute] = already + pad;
        namedLeft -= pad;
      }
    }
  }

  if (genericLeft > 0) {
    genericSpend.martial = (genericSpend.martial ?? 0) + genericLeft;
  }

  const spend: Partial<Record<Attribute, number>> = { ...namedSpend };
  for (const attribute of ATTRIBUTES) {
    const extra = genericSpend[attribute];
    if (extra !== undefined && extra > 0) {
      spend[attribute] = (spend[attribute] ?? 0) + extra;
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
  const armed = state.playCostDiscountThisTurn[playerId] ?? 0;
  const discount = matches.reduce((sum, match) => sum + match.amount, 0) + armed;
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
  if (isCreatureSilenced(state as GameState, attackerId)) return amount;
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
