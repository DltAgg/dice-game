import { nanoid } from "nanoid";
import { isStartingDiceLayout, type StartingDiceLayout } from "@/game";
import type { DeckRepository } from "./repository.js";
import { isBuiltinDeckId, withBuiltinDecks } from "./prototype.js";
import { DECK_SCHEMA_VERSION, type SavedDeck } from "./types.js";

const STORAGE_KEY = "dice-skirmish.decks.v1";

interface StorageBlob {
  readonly schemaVersion: number;
  readonly decks: readonly SavedDeck[];
}

function isSavedDeck(value: unknown): value is SavedDeck {
  if (typeof value !== "object" || value === null) return false;
  const deck = value as Partial<SavedDeck>;
  return (
    deck.schemaVersion === DECK_SCHEMA_VERSION &&
    typeof deck.id === "string" &&
    typeof deck.name === "string" &&
    Array.isArray(deck.squad) &&
    Array.isArray(deck.deck) &&
    Array.isArray(deck.faceDeck) &&
    isStartingDiceLayout(deck.startingDice) &&
    typeof deck.updatedAt === "string"
  );
}

function readStorage(): SavedDeck[] {
  if (typeof localStorage === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null || raw === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [];
    const blob = parsed as Partial<StorageBlob>;
    if (blob.schemaVersion !== DECK_SCHEMA_VERSION || !Array.isArray(blob.decks)) {
      return [];
    }
    return blob.decks.filter(isSavedDeck).filter((deck) => !isBuiltinDeckId(deck.id));
  } catch {
    return [];
  }
}

function writeStorage(decks: readonly SavedDeck[]): void {
  if (typeof localStorage === "undefined") return;
  const userDecks = decks.filter((deck) => !isBuiltinDeckId(deck.id));
  const blob: StorageBlob = { schemaVersion: DECK_SCHEMA_VERSION, decks: userDecks };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
}

/**
 * Persists drafts whether or not they are tournament-legal. Play / match setup
 * must call `validateSavedDeck` (or `validateLoadout`) before starting a game.
 */
export function createLocalStorageDeckRepository(): DeckRepository {
  return {
    list: () => withBuiltinDecks(readStorage()),

    get: (id) => withBuiltinDecks(readStorage()).find((deck) => deck.id === id),

    save: (draft, id) => {
      if (id !== undefined && isBuiltinDeckId(id)) {
        throw new Error("deck repository: cannot overwrite a builtin deck");
      }
      const current = readStorage();
      const existing = id !== undefined ? current.find((deck) => deck.id === id) : undefined;
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
      writeStorage([...current.filter((deck) => deck.id !== saved.id), saved]);
      return saved;
    },

    remove: (id) => {
      if (isBuiltinDeckId(id)) return false;
      const current = readStorage();
      const next = current.filter((deck) => deck.id !== id);
      if (next.length === current.length) return false;
      writeStorage(next);
      return true;
    },
  };
}
