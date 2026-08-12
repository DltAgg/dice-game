import { nanoid } from "nanoid";
import type { DeckRepository } from "./repository.js";
import { buildPrototypeSavedDeck, PROTOTYPE_SAVED_DECK_ID } from "./prototype.js";
import { DECK_SCHEMA_VERSION, type SavedDeck } from "./types.js";

function withPrototype(decks: readonly SavedDeck[]): SavedDeck[] {
  const without = decks.filter((deck) => deck.id !== PROTOTYPE_SAVED_DECK_ID);
  return [buildPrototypeSavedDeck(), ...without];
}

/**
 * In-memory repo for tests. Saves illegal drafts; play paths must validate.
 */
export function createMemoryDeckRepository(
  initial: readonly SavedDeck[] = [],
): DeckRepository {
  let decks = withPrototype(initial);

  return {
    list: () => decks,

    get: (id) => decks.find((deck) => deck.id === id),

    save: (draft, id) => {
      if (id === PROTOTYPE_SAVED_DECK_ID) {
        throw new Error("deck repository: cannot overwrite the prototype deck");
      }
      const existing = id !== undefined ? decks.find((deck) => deck.id === id) : undefined;
      const saved: SavedDeck = {
        schemaVersion: DECK_SCHEMA_VERSION,
        id: existing?.id ?? id ?? nanoid(10),
        name: draft.name.trim() || "Untitled deck",
        squad: [...draft.squad],
        deck: [...draft.deck],
        faceDeck: [...draft.faceDeck],
        updatedAt: new Date().toISOString(),
      };
      decks = withPrototype([
        ...decks.filter((deck) => deck.id !== saved.id && deck.id !== PROTOTYPE_SAVED_DECK_ID),
        saved,
      ]);
      return saved;
    },

    remove: (id) => {
      if (id === PROTOTYPE_SAVED_DECK_ID) return false;
      const before = decks.length;
      decks = withPrototype(decks.filter((deck) => deck.id !== id));
      return decks.length < before;
    },
  };
}
