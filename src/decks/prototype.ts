import {
  COMBO_MECHANICAL_DECK,
  COMBO_MECHANICAL_FACE_DECK,
  COMBO_MECHANICAL_SQUAD,
  COMBO_MECHANICAL_STARTING_DICE,
  CONTROL_DECK,
  CONTROL_FACE_DECK,
  CONTROL_SQUAD,
  CONTROL_STARTING_DICE,
  PROTOTYPE_DECK,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_SQUAD,
  PROTOTYPE_STARTING_DICE,
  TEMPO_DECK,
  TEMPO_FACE_DECK,
  TEMPO_SQUAD,
  TEMPO_STARTING_DICE,
} from "@/game";
import { DECK_SCHEMA_VERSION, type SavedDeck, type SavedDeckId } from "./types.js";

/** Builtin Aggro — kept as `deck-prototype` so existing saves / defaults keep working. */
export const PROTOTYPE_SAVED_DECK_ID: SavedDeckId = "deck-prototype";
export const AGGRO_SAVED_DECK_ID = PROTOTYPE_SAVED_DECK_ID;

export const CONTROL_SAVED_DECK_ID: SavedDeckId = "deck-control";
export const TEMPO_SAVED_DECK_ID: SavedDeckId = "deck-tempo";
export const COMBO_MECHANICAL_SAVED_DECK_ID: SavedDeckId = "deck-combo-mechanical";

const BUILTIN_IDS: ReadonlySet<string> = new Set([
  PROTOTYPE_SAVED_DECK_ID,
  CONTROL_SAVED_DECK_ID,
  TEMPO_SAVED_DECK_ID,
  COMBO_MECHANICAL_SAVED_DECK_ID,
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
    startingDice: PROTOTYPE_STARTING_DICE,
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
    startingDice: CONTROL_STARTING_DICE,
    updatedAt: "1970-01-01T00:00:00.000Z",
    builtin: true,
  };
}

export function buildTempoSavedDeck(): SavedDeck {
  return {
    schemaVersion: DECK_SCHEMA_VERSION,
    id: TEMPO_SAVED_DECK_ID,
    name: "Tempo",
    squad: TEMPO_SQUAD,
    deck: TEMPO_DECK,
    faceDeck: TEMPO_FACE_DECK,
    startingDice: TEMPO_STARTING_DICE,
    updatedAt: "1970-01-01T00:00:00.000Z",
    builtin: true,
  };
}

export function buildComboMechanicalSavedDeck(): SavedDeck {
  return {
    schemaVersion: DECK_SCHEMA_VERSION,
    id: COMBO_MECHANICAL_SAVED_DECK_ID,
    name: "Combo Mechanical",
    squad: COMBO_MECHANICAL_SQUAD,
    deck: COMBO_MECHANICAL_DECK,
    faceDeck: COMBO_MECHANICAL_FACE_DECK,
    startingDice: COMBO_MECHANICAL_STARTING_DICE,
    updatedAt: "1970-01-01T00:00:00.000Z",
    builtin: true,
  };
}

/** Builtin loadouts in list order (Aggro, Control, Tempo, Combo Mechanical). */
export function buildBuiltinDecks(): readonly SavedDeck[] {
  return [
    buildAggroSavedDeck(),
    buildControlSavedDeck(),
    buildTempoSavedDeck(),
    buildComboMechanicalSavedDeck(),
  ];
}

/** Prepends fresh builtin snapshots and strips any stored copies of those ids. */
export function withBuiltinDecks(decks: readonly SavedDeck[]): SavedDeck[] {
  const withoutBuiltins = decks.filter((deck) => !isBuiltinDeckId(deck.id));
  return [...buildBuiltinDecks(), ...withoutBuiltins];
}
