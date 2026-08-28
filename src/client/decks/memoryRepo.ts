import { nanoid } from "nanoid";
import type { StartingDiceLayout } from "@server";
import type { DeckRepository } from "./repository.js";
import {
  isBuiltinDeckId,
  withBuiltinDecks,
} from "./prototype.js";
import { DECK_SCHEMA_VERSION, type SavedDeck } from "./types.js";

/**
 * In-memory repo for tests. Saves illegal drafts; play paths must validate.
 */
export function createMemoryDeckRepository(
  initial: readonly SavedDeck[] = [],
): DeckRepository {
  let decks = withBuiltinDecks(initial);

  return {
    list: () => decks,

    get: (id) => decks.find((deck) => deck.id === id),

    save: (draft, id) => {
      if (id !== undefined && isBuiltinDeckId(id)) {
        throw new Error("deck repository: cannot overwrite a builtin deck");
      }
      const existing = id !== undefined ? decks.find((deck) => deck.id === id) : undefined;
      const saved: SavedDeck = {
        schemaVersion: DECK_SCHEMA_VERSION,
        id: existing?.id ?? id ?? nanoid(10),
        name: draft.name.trim() || "Untitled deck",
        squad: [...draft.squad],
        deck: [...draft.deck],
        faceDeck: [...draft.faceDeck],
        startingDice: [
          [...draft.startingDice[0]],
          [...draft.startingDice[1]],
        ] as StartingDiceLayout,
        updatedAt: new Date().toISOString(),
      };
      decks = withBuiltinDecks([
        ...decks.filter((deck) => deck.id !== saved.id && !isBuiltinDeckId(deck.id)),
        saved,
      ]);
      return saved;
    },

    remove: (id) => {
      if (isBuiltinDeckId(id)) return false;
      const before = decks.length;
      decks = withBuiltinDecks(decks.filter((deck) => deck.id !== id));
      return decks.length < before;
    },
  };
}
