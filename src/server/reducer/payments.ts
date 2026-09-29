import type { CardDefinition } from "../model/cards.js";
import type { GameError } from "../model/errors.js";
import type { CreatureId, PlayerId } from "../model/ids.js";
import type { SymbolRequirement } from "../model/symbols.js";
import type { Draft } from "./draft.js";

/**
 * Header `[Spend]` no longer burns a persistent pile. Play remains legal
 * whenever the rest of PLAY_CARD is legal.
 */
export function payHeaderCost(
  _draft: Draft,
  _playerId: PlayerId,
  _definition: CardDefinition,
  _applyDiscounts: boolean,
): GameError | null {
  return null;
}

/** Synthetic forge no longer burns a persistent pile. */
export function payForgeCost(
  _draft: Draft,
  _playerId: PlayerId,
  _definition: CardDefinition,
): GameError | null {
  return null;
}

/** Card `[Requires]` gate is catalogue data only — not enforced. */
export function payCardRequires(
  _draft: Draft,
  _playerId: PlayerId,
  _requirement: SymbolRequirement,
): GameError | null {
  return null;
}

/** Printed `[Spend]` is catalogue data only — not enforced. */
export function payPileSpend(
  _draft: Draft,
  _playerId: PlayerId,
  _requirement: SymbolRequirement,
  _creatureId?: CreatureId,
): GameError | null {
  return null;
}

export function consumeRequirementWildcards(
  draft: Draft,
  playerId: PlayerId,
  count: number,
): void {
  if (count <= 0) return;
  const current = draft.requirementWildcardsThisTurn[playerId] ?? [];
  const remaining = current.slice(count);
  const next = { ...draft.requirementWildcardsThisTurn, [playerId]: remaining };
  if (remaining.length === 0) delete next[playerId];
  draft.requirementWildcardsThisTurn = next;
}
