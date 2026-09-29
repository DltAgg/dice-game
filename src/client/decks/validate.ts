import {
  rulesConfigForLoadout,
  validateLoadout,
  type GameRulesConfig,
  type LoadoutValidation,
} from "@server";
import type { DeckDraft, SavedDeck } from "./types.js";

export function validateSavedDeck(
  deck: Pick<SavedDeck, "squad" | "deck" | "faceDeck" | "startingDice"> | DeckDraft,
  config: GameRulesConfig = rulesConfigForLoadout(deck.startingDice.length),
): LoadoutValidation {
  return validateLoadout(
    {
      squad: deck.squad,
      deck: deck.deck,
      faceDeck: deck.faceDeck,
      startingDice: deck.startingDice,
    },
    config,
  );
}
