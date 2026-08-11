import { nanoid } from "nanoid";
import type { DeckRepository } from "./repository.js";
import { buildPrototypeSavedDeck, PROTOTYPE_SAVED_DECK_ID } from "./prototype.js";
import { DECK_SCHEMA_VERSION, type DeckDraft, type SavedDeck } from "./types.js";
import { validateSavedDeck } from "./validate.js";

const STORAGE_KEY = "dice-skirmish.decks.v1";

interface StorageBlob {
  readonly schemaVersion: number;
  readonly decks: readonly SavedDeck[];
}

function assertLegal(draft: DeckDraft): void {
  const check = validateSavedDeck(draft);
  if (!check.ok) {
    throw new Error(`deck repository: ${check.reason}`);
  }
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
    return blob.decks.filter(isSavedDeck).filter((deck) => deck.id !== PROTOTYPE_SAVED_DECK_ID);
  } catch {
    return [];
  }
}

function writeStorage(decks: readonly SavedDeck[]): void {
  if (typeof localStorage === "undefined") return;
  const userDecks = decks.filter((deck) => deck.id !== PROTOTYPE_SAVED_DECK_ID);
  const blob: StorageBlob = { schemaVersion: DECK_SCHEMA_VERSION, decks: userDecks };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
}

function listed(decks: readonly SavedDeck[]): SavedDeck[] {
  return [buildPrototypeSavedDeck(), ...decks.filter((d) => d.id !== PROTOTYPE_SAVED_DECK_ID)];
}

export function createLocalStorageDeckRepository(): DeckRepository {
  return {
    list: () => listed(readStorage()),

    get: (id) => listed(readStorage()).find((deck) => deck.id === id),

    save: (draft, id) => {
      assertLegal(draft);
      if (id === PROTOTYPE_SAVED_DECK_ID) {
        throw new Error("deck repository: cannot overwrite the prototype deck");
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
        updatedAt: new Date().toISOString(),
      };
      writeStorage([...current.filter((deck) => deck.id !== saved.id), saved]);
      return saved;
    },

    remove: (id) => {
      if (id === PROTOTYPE_SAVED_DECK_ID) return false;
      const current = readStorage();
      const next = current.filter((deck) => deck.id !== id);
      if (next.length === current.length) return false;
      writeStorage(next);
      return true;
    },
  };
}
