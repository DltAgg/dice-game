import type { Attribute } from "../model/attributes.js";
import { ATTRIBUTES } from "../model/attributes.js";
import type { CreatureState } from "../model/creatures.js";
import {
  requirementEntries,
  requirementTotal,
  type AttributeTokens,
  type SymbolRequirement,
} from "../model/symbols.js";

/**
 * Attribute tokens are a creature's private fuel supply (bible §7). Attacks are
 * paid from here and never from the shared symbol pool, which is what turns
 * absorbing into an investment rather than a sacrifice.
 */

export const holdsTokens = (creature: CreatureState, requirement: SymbolRequirement): boolean =>
  requirementEntries(requirement).every(
    ([attribute, count]) => (creature.attributeTokens[attribute] ?? 0) >= count,
  );

export const addToken = (tokens: AttributeTokens, attribute: keyof AttributeTokens): AttributeTokens => ({
  ...tokens,
  [attribute]: (tokens[attribute] ?? 0) + 1,
});

/** Adds a requirement-shaped pile (pack feeding copy / transfer dest). */
export function addTokens(
  tokens: AttributeTokens,
  added: SymbolRequirement,
): AttributeTokens {
  const next: Partial<Record<keyof AttributeTokens, number>> = { ...tokens };
  for (const [attribute, count] of requirementEntries(added)) {
    if (count <= 0) continue;
    next[attribute] = (next[attribute] ?? 0) + count;
  }
  return next;
}

/**
 * Removes a requirement's worth of tokens. Zeroed attributes are dropped rather
 * than left as `0`, so two creatures holding the same fuel always serialize
 * identically and state comparisons in tests stay meaningful.
 */
export function removeTokens(
  tokens: AttributeTokens,
  requirement: SymbolRequirement,
): AttributeTokens {
  const next: Partial<Record<keyof AttributeTokens, number>> = { ...tokens };
  for (const [attribute, count] of requirementEntries(requirement)) {
    const remaining = (next[attribute] ?? 0) - count;
    if (remaining > 0) next[attribute] = remaining;
    else delete next[attribute];
  }
  return next;
}

/**
 * Strip up to `amount` tokens in `ATTRIBUTES` order (martial → … → darkness).
 * Used only when there is no player choice: empty / fewer-than-amount remaining,
 * or a single attribute pile. Mixed piles with leftover tokens open
 * `choose-attribute-tokens` instead (spec `011`).
 */
export function discardTokensInAttributeOrder(
  tokens: AttributeTokens,
  amount: number,
): { readonly next: AttributeTokens; readonly discarded: SymbolRequirement } {
  let remaining = amount;
  const discarded: Partial<Record<(typeof ATTRIBUTES)[number], number>> = {};
  for (const attribute of ATTRIBUTES) {
    if (remaining <= 0) break;
    const have = tokens[attribute] ?? 0;
    if (have <= 0) continue;
    const take = Math.min(have, remaining);
    discarded[attribute] = take;
    remaining -= take;
  }
  return { next: removeTokens(tokens, discarded), discarded };
}

export const totalTokens = (tokens: AttributeTokens): number =>
  Object.values(tokens).reduce((sum, count) => sum + count, 0);

/** Attributes that currently hold at least one pip. */
export const tokenAttributesHeld = (tokens: AttributeTokens): readonly Attribute[] =>
  ATTRIBUTES.filter((attribute) => (tokens[attribute] ?? 0) > 0);

/**
 * True when the controller must name which pips to strip: more than `amount`
 * remain and they sit in more than one attribute. Homogeneous piles and
 * "take all remaining" strips are deterministic (no real choice).
 */
export function tokenChoiceNeeded(tokens: AttributeTokens, amount: number): boolean {
  if (amount <= 0) return false;
  if (totalTokens(tokens) <= amount) return false;
  return tokenAttributesHeld(tokens).length >= 2;
}

/**
 * A legal strip pick: totals `min(amount, held)` and is a subset of `tokens`.
 */
export function isLegalTokenDiscardPick(
  tokens: AttributeTokens,
  discarded: SymbolRequirement,
  amount: number,
): boolean {
  const take = Math.min(amount, totalTokens(tokens));
  if (take <= 0) return false;
  if (requirementTotal(discarded) !== take) return false;
  for (const [attribute, count] of requirementEntries(discarded)) {
    if (count <= 0) return false;
    if ((tokens[attribute] ?? 0) < count) return false;
  }
  return true;
}
