import {
  DEFAULT_RULES_CONFIG,
  validateLoadout,
  type GameRulesConfig,
  type LoadoutValidation,
} from "@/game";
import type { DeckDraft, SavedDeck } from "./types.js";

export function validateSavedDeck(
  deck: Pick<SavedDeck, "squad" | "deck" | "faceDeck"> | DeckDraft,
  config: GameRulesConfig = DEFAULT_RULES_CONFIG,
): LoadoutValidation {
  return validateLoadout(
    { squad: deck.squad, deck: deck.deck, faceDeck: deck.faceDeck },
    config,
  );
}
