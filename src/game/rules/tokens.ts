import type { CreatureState } from "../model/creatures.js";
import { ATTRIBUTES } from "../model/attributes.js";
import {
  requirementEntries,
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
 * Controller does not choose attributes. Returns fewer than `amount` when the
 * creature has less fuel (including empty). Spec `011`.
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
