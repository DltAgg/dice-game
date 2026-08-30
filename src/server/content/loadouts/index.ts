import type { StartingDiceLayout } from "../../model/dice.js";
import { asCardId, asCreatureDefinitionId, asFaceCardId, type CardId } from "../../model/ids.js";
import tempoDoc from "./tempo.json";

export interface LoadoutDeckCount {
  readonly cardId: string;
  readonly copies: number;
}

export interface BuiltinLoadoutDocument {
  readonly id: string;
  readonly name: string;
  readonly squad: readonly string[];
  readonly deckCounts: readonly LoadoutDeckCount[];
  readonly faceDeck: readonly string[];
  readonly startingDice: readonly (readonly string[])[];
}

const expandDeck = (counts: readonly LoadoutDeckCount[]): readonly CardId[] =>
  counts.flatMap(({ cardId, copies }) => Array.from({ length: copies }, () => asCardId(cardId)));

const asSquad = (ids: readonly string[]) => ids.map(asCreatureDefinitionId);

const asFaceDeck = (ids: readonly string[]) => ids.map(asFaceCardId);

const asDie = (faces: readonly string[]): StartingDiceLayout[0] => [
  asFaceCardId(faces[0]!),
  asFaceCardId(faces[1]!),
  asFaceCardId(faces[2]!),
  asFaceCardId(faces[3]!),
  asFaceCardId(faces[4]!),
  asFaceCardId(faces[5]!),
];

const asStartingDice = (dice: BuiltinLoadoutDocument["startingDice"]): StartingDiceLayout => {
  const first = dice[0];
  const second = dice[1];
  if (first === undefined || second === undefined) {
    throw new Error("loadout startingDice must contain two dice");
  }
  return [asDie(first), asDie(second)];
};

const hydrate = (doc: BuiltinLoadoutDocument) => ({
  id: doc.id,
  name: doc.name,
  squad: asSquad(doc.squad),
  deckCounts: doc.deckCounts,
  deck: expandDeck(doc.deckCounts),
  faceDeck: asFaceDeck(doc.faceDeck),
  startingDice: asStartingDice(doc.startingDice),
});

export const TEMPO_LOADOUT = hydrate(tempoDoc as unknown as BuiltinLoadoutDocument);

export const TEMPO_SQUAD = TEMPO_LOADOUT.squad;
export const TEMPO_DECK = TEMPO_LOADOUT.deck;
export const TEMPO_DECK_COUNTS = TEMPO_LOADOUT.deckCounts;
export const TEMPO_FACE_DECK = TEMPO_LOADOUT.faceDeck;
export const TEMPO_STARTING_DICE = TEMPO_LOADOUT.startingDice;

/**
 * Temporary compatibility aliases while the other builtin catalogues are
 * rebuilt. Every alias intentionally references the one hydrated Tempo value.
 */
export const AGGRO_LOADOUT = TEMPO_LOADOUT;
export const CONTROL_LOADOUT = TEMPO_LOADOUT;
export const COMBO_MECHANICAL_LOADOUT = TEMPO_LOADOUT;
export const BURN_LOADOUT = TEMPO_LOADOUT;

export const AGGRO_SQUAD = TEMPO_SQUAD;
export const AGGRO_DECK = TEMPO_DECK;
export const AGGRO_DECK_COUNTS = TEMPO_DECK_COUNTS;
export const AGGRO_FACE_DECK = TEMPO_FACE_DECK;
export const AGGRO_STARTING_DICE = TEMPO_STARTING_DICE;

export const PROTOTYPE_SQUAD = TEMPO_SQUAD;
export const PROTOTYPE_DECK = TEMPO_DECK;
export const PROTOTYPE_DECK_COUNTS = TEMPO_DECK_COUNTS;
export const PROTOTYPE_FACE_DECK = TEMPO_FACE_DECK;
export const PROTOTYPE_STARTING_DICE = TEMPO_STARTING_DICE;

export const CONTROL_SQUAD = TEMPO_SQUAD;
export const CONTROL_DECK = TEMPO_DECK;
export const CONTROL_DECK_COUNTS = TEMPO_DECK_COUNTS;
export const CONTROL_FACE_DECK = TEMPO_FACE_DECK;
export const CONTROL_STARTING_DICE = TEMPO_STARTING_DICE;

export const COMBO_MECHANICAL_SQUAD = TEMPO_SQUAD;
export const COMBO_MECHANICAL_DECK = TEMPO_DECK;
export const COMBO_MECHANICAL_DECK_COUNTS = TEMPO_DECK_COUNTS;
export const COMBO_MECHANICAL_FACE_DECK = TEMPO_FACE_DECK;
export const COMBO_MECHANICAL_STARTING_DICE = TEMPO_STARTING_DICE;

export const BURN_SQUAD = TEMPO_SQUAD;
export const BURN_DECK = TEMPO_DECK;
export const BURN_DECK_COUNTS = TEMPO_DECK_COUNTS;
export const BURN_FACE_DECK = TEMPO_FACE_DECK;
export const BURN_STARTING_DICE = TEMPO_STARTING_DICE;

export const ALL_BUILTIN_LOADOUTS = [TEMPO_LOADOUT] as const;
