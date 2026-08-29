import type { CardDefinition } from "../model/cards.js";
import type { GameError } from "../model/errors.js";
import type { CreatureId, PlayerId } from "../model/ids.js";
import {
  requirementEntries,
  type AttributeTokens,
  type SymbolRequirement,
} from "../model/symbols.js";
import {
  discountedPlayRequirement,
  reduceRequirement,
  type DiscountMatch,
} from "../rules/discounts.js";
import {
  isNonEmptyRequirement,
  pileRequirementShortfall,
  removeTokens,
} from "../rules/tokens.js";
import { emit, patchCreature, patchPlayer, type Draft } from "./draft.js";
import { refreshRitualOrientations } from "./zones.js";

export function payHeaderCost(
  draft: Draft,
  playerId: PlayerId,
  definition: CardDefinition,
  applyDiscounts: boolean,
): GameError | null {
  const base = definition.playCost;
  if (base === undefined || !isNonEmptyRequirement(base)) return null;
  const { cost, matches } = applyDiscounts
    ? discountedPlayRequirement(draft, playerId, definition, base)
    : { cost: base, matches: [] as DiscountMatch[] };
  if (!isNonEmptyRequirement(cost)) {
    markDiscountMatchesSpent(draft, matches);
    return null;
  }
  const err = payPileSpend(draft, playerId, cost);
  if (err === null) markDiscountMatchesSpent(draft, matches);
  return err;
}

/**
 * Synthetic forge burns the header `playCost` (minus `forgeDiscountThisTurn`).
 * Natural forge is free — no pile burn and the forge discount is left unused
 * so a later synthetic forge this turn can still consume it.
 */
export function payForgeCost(
  draft: Draft,
  playerId: PlayerId,
  definition: CardDefinition,
): GameError | null {
  if (definition.forge.kind === "natural") return null;
  const base = definition.playCost;
  if (base === undefined || !isNonEmptyRequirement(base)) return null;
  const discount = draft.forgeDiscountThisTurn[playerId] ?? 0;
  if (discount > 0) {
    const next = { ...draft.forgeDiscountThisTurn };
    delete next[playerId];
    draft.forgeDiscountThisTurn = next;
  }
  const cost = reduceRequirement(base, discount);
  if (!isNonEmptyRequirement(cost)) return null;
  return payPileSpend(draft, playerId, cost);
}

/* ------------------------------------------------------------ shared --- */

/**
 * Card `[Spend]` path (print on Instant/Equipment/… as `region.requires` /
 * `effect.requires`). Burns from the attribute pile; Resonance wildcards cover
 * shortfall. Name kept for call-site stability — this is Spend, not a Requires
 * gate (attack `requires` / ritual `activeWhen` are gates).
 */
export function payCardRequires(
  draft: Draft,
  playerId: PlayerId,
  requirement: SymbolRequirement,
): GameError | null {
  return payPileSpend(draft, playerId, requirement);
}

/**
 * Burn a Spend requirement from the owner's pile. Wildcards cover shortfall;
 * only the pile portion actually removed is emitted as discarded.
 */
export function payPileSpend(
  draft: Draft,
  playerId: PlayerId,
  requirement: SymbolRequirement,
  creatureId?: CreatureId,
): GameError | null {
  const player = draft.players[playerId];
  if (player === undefined) return "UNKNOWN_ENTITY";
  const pile = player.attributePool;
  const wildcards = draft.requirementWildcardsThisTurn[playerId] ?? [];
  const shortfall = pileRequirementShortfall(pile, requirement);
  if (shortfall > wildcards.length) return "INSUFFICIENT_SYMBOLS";

  const spend: Partial<Record<keyof AttributeTokens, number>> = {};
  for (const [attribute, count] of requirementEntries(requirement)) {
    const held = pile[attribute] ?? 0;
    const fromPile = Math.min(held, count);
    if (fromPile > 0) spend[attribute] = fromPile;
  }
  if (Object.keys(spend).length > 0) {
    patchPlayer(draft, playerId, {
      attributePool: removeTokens(pile, spend),
    });
    refreshRitualOrientations(draft, playerId);
    emit(draft, {
      type: "attribute-tokens-discarded",
      playerId,
      ...(creatureId !== undefined ? { creatureId } : {}),
      discarded: spend,
    });
  }
  if (shortfall > 0) consumeRequirementWildcards(draft, playerId, shortfall);
  return null;
}

function markDiscountMatchesSpent(draft: Draft, matches: readonly DiscountMatch[]): void {
  for (const match of matches) {
    const creature = draft.creatures[match.creatureId];
    if (creature === undefined) continue;
    if (creature.spentOncePerTurnTriggers.includes(match.key)) continue;
    patchCreature(draft, match.creatureId, {
      spentOncePerTurnTriggers: [...creature.spentOncePerTurnTriggers, match.key],
    });
  }
}

export function consumeRequirementWildcards(draft: Draft, playerId: PlayerId, count: number): void {
  if (count <= 0) return;
  const current = draft.requirementWildcardsThisTurn[playerId] ?? [];
  const remaining = current.slice(count);
  const next = { ...draft.requirementWildcardsThisTurn, [playerId]: remaining };
  if (remaining.length === 0) delete next[playerId];
  draft.requirementWildcardsThisTurn = next;
}
