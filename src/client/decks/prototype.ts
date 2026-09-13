import { ALL_BUILTIN_LOADOUTS } from "@server";
import { DECK_SCHEMA_VERSION, type SavedDeck, type SavedDeckId } from "./types.js";

export const TEMPO_SAVED_DECK_ID: SavedDeckId = "deck-tempo";
export const CONTROL_SAVED_DECK_ID: SavedDeckId = "deck-control";

/** Temporary exported-name aliases while the other builtin loadouts are rebuilt. */
export const PROTOTYPE_SAVED_DECK_ID = TEMPO_SAVED_DECK_ID;
export const AGGRO_SAVED_DECK_ID = TEMPO_SAVED_DECK_ID;
export const COMBO_MECHANICAL_SAVED_DECK_ID = TEMPO_SAVED_DECK_ID;
export const BURN_SAVED_DECK_ID = TEMPO_SAVED_DECK_ID;

const BUILTIN_IDS: ReadonlySet<string> = new Set(
  ALL_BUILTIN_LOADOUTS.map((loadout) => loadout.id),
);

export const isBuiltinDeckId = (id: string): boolean => BUILTIN_IDS.has(id);

const EPOCH = "1970-01-01T00:00:00.000Z";

function savedDeckFromLoadout(id: string): SavedDeck {
  const loadout = ALL_BUILTIN_LOADOUTS.find((entry) => entry.id === id);
  if (loadout === undefined) {
    throw new Error(`unknown builtin loadout "${id}"`);
  }
  return {
    schemaVersion: DECK_SCHEMA_VERSION,
    id: loadout.id,
    name: loadout.name,
    squad: loadout.squad,
    deck: loadout.deck,
    faceDeck: loadout.faceDeck,
    startingDice: loadout.startingDice,
    updatedAt: EPOCH,
    builtin: true,
  };
}

export function buildAggroSavedDeck(): SavedDeck {
  return savedDeckFromLoadout(TEMPO_SAVED_DECK_ID);
}

/** @deprecated Prefer `buildAggroSavedDeck` — alias kept for older imports. */
export const buildPrototypeSavedDeck = buildAggroSavedDeck;

export function buildControlSavedDeck(): SavedDeck {
  return savedDeckFromLoadout(CONTROL_SAVED_DECK_ID);
}

export function buildTempoSavedDeck(): SavedDeck {
  return savedDeckFromLoadout(TEMPO_SAVED_DECK_ID);
}

export function buildComboMechanicalSavedDeck(): SavedDeck {
  return savedDeckFromLoadout(TEMPO_SAVED_DECK_ID);
}

export function buildBurnSavedDeck(): SavedDeck {
  return savedDeckFromLoadout(TEMPO_SAVED_DECK_ID);
}

/** Builtin loadouts in catalogue order. */
export function buildBuiltinDecks(): readonly SavedDeck[] {
  return ALL_BUILTIN_LOADOUTS.map((loadout) => savedDeckFromLoadout(loadout.id));
}

/** Prepends fresh builtin snapshots and strips any stored copies of those ids. */
export function withBuiltinDecks(decks: readonly SavedDeck[]): SavedDeck[] {
  const withoutBuiltins = decks.filter((deck) => !isBuiltinDeckId(deck.id));
  return [...buildBuiltinDecks(), ...withoutBuiltins];
}
