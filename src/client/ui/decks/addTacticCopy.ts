import type { CardId } from "@server";
import { validateSavedDeck, type DeckDraft } from "@client/decks";
import { addCopy } from "./deckBuilderUtils";

/**
 * Prospective tactics add. A copy-cap no-op leaves the deck alone. A deck
 * the engine rejects for `response combat` is refused; other legality
 * failures (deck size) stay savable.
 */
export function deckAfterTacticAdd(
  draft: DeckDraft,
  cardId: CardId,
  maxCopies: number,
): { readonly deck: readonly CardId[]; readonly refusedReason: string | null } {
  const next = addCopy(draft.deck, cardId, maxCopies);
  if (next.length === draft.deck.length) {
    return { deck: draft.deck, refusedReason: null };
  }
  const check = validateSavedDeck({ ...draft, deck: next });
  if (!check.ok && check.reason.includes("response combat")) {
    return { deck: draft.deck, refusedReason: check.reason };
  }
  return { deck: next, refusedReason: null };
}
