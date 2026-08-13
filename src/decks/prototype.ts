import {
  CONTROL_DECK,
  CONTROL_FACE_DECK,
  CONTROL_SQUAD,
  PROTOTYPE_DECK,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_SQUAD,
} from "@/game";
import { DECK_SCHEMA_VERSION, type SavedDeck, type SavedDeckId } from "./types.js";

/** Builtin Aggro — kept as `deck-prototype` so existing saves / defaults keep working. */
export const PROTOTYPE_SAVED_DECK_ID: SavedDeckId = "deck-prototype";
export const AGGRO_SAVED_DECK_ID = PROTOTYPE_SAVED_DECK_ID;

export const CONTROL_SAVED_DECK_ID: SavedDeckId = "deck-control";

const BUILTIN_IDS: ReadonlySet<string> = new Set([
  PROTOTYPE_SAVED_DECK_ID,
  CONTROL_SAVED_DECK_ID,
]);

export const isBuiltinDeckId = (id: string): boolean => BUILTIN_IDS.has(id);

export function buildAggroSavedDeck(): SavedDeck {
  return {
    schemaVersion: DECK_SCHEMA_VERSION,
    id: AGGRO_SAVED_DECK_ID,
    name: "Aggro",
    squad: PROTOTYPE_SQUAD,
    deck: PROTOTYPE_DECK,
    faceDeck: PROTOTYPE_FACE_DECK,
    updatedAt: "1970-01-01T00:00:00.000Z",
    builtin: true,
  };
}

/** @deprecated Prefer `buildAggroSavedDeck` — alias kept for older imports. */
export const buildPrototypeSavedDeck = buildAggroSavedDeck;

export function buildControlSavedDeck(): SavedDeck {
  return {
    schemaVersion: DECK_SCHEMA_VERSION,
    id: CONTROL_SAVED_DECK_ID,
    name: "Control",
    squad: CONTROL_SQUAD,
    deck: CONTROL_DECK,
    faceDeck: CONTROL_FACE_DECK,
    updatedAt: "1970-01-01T00:00:00.000Z",
    builtin: true,
  };
}

/** Builtin loadouts in list order (Aggro, then Control). */
export function buildBuiltinDecks(): readonly SavedDeck[] {
  return [buildAggroSavedDeck(), buildControlSavedDeck()];
}

/** Prepends fresh builtin snapshots and strips any stored copies of those ids. */
export function withBuiltinDecks(decks: readonly SavedDeck[]): SavedDeck[] {
  const withoutBuiltins = decks.filter((deck) => !isBuiltinDeckId(deck.id));
  return [...buildBuiltinDecks(), ...withoutBuiltins];
}
