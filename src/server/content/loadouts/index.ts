import type { DieFaceLayout, StartingDiceLayout } from "../../model/dice.js";
import { asCardId, asCreatureDefinitionId, asFaceCardId, type CardId } from "../../model/ids.js";
import tagSkirmishDoc from "./tag-skirmish.json";

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

const asDie = (faces: readonly string[]): DieFaceLayout => [
  asFaceCardId(faces[0]!),
  asFaceCardId(faces[1]!),
  asFaceCardId(faces[2]!),
  asFaceCardId(faces[3]!),
  asFaceCardId(faces[4]!),
  asFaceCardId(faces[5]!),
];

const asStartingDice = (dice: BuiltinLoadoutDocument["startingDice"]): StartingDiceLayout => {
  if (dice.length < 2) {
    throw new Error("loadout startingDice must contain at least two dice");
  }
  return dice.map((faces) => asDie(faces));
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

export const TAG_SKIRMISH_LOADOUT = hydrate(tagSkirmishDoc as unknown as BuiltinLoadoutDocument);

/**
 * Retired Tempo / Control / Aggro / Burn aliases all resolve to Tag Skirmish
 * so older tests, CLI flags, and saved-deck ids keep working.
 */
export const TEMPO_LOADOUT = TAG_SKIRMISH_LOADOUT;
export const CONTROL_LOADOUT = TAG_SKIRMISH_LOADOUT;
export const AGGRO_LOADOUT = TAG_SKIRMISH_LOADOUT;
export const COMBO_MECHANICAL_LOADOUT = TAG_SKIRMISH_LOADOUT;
export const BURN_LOADOUT = TAG_SKIRMISH_LOADOUT;

export const TEMPO_SQUAD = TAG_SKIRMISH_LOADOUT.squad;
export const TEMPO_DECK = TAG_SKIRMISH_LOADOUT.deck;
export const TEMPO_DECK_COUNTS = TAG_SKIRMISH_LOADOUT.deckCounts;
export const TEMPO_FACE_DECK = TAG_SKIRMISH_LOADOUT.faceDeck;
export const TEMPO_STARTING_DICE = TAG_SKIRMISH_LOADOUT.startingDice;

export const CONTROL_SQUAD = TAG_SKIRMISH_LOADOUT.squad;
export const CONTROL_DECK = TAG_SKIRMISH_LOADOUT.deck;
export const CONTROL_DECK_COUNTS = TAG_SKIRMISH_LOADOUT.deckCounts;
export const CONTROL_FACE_DECK = TAG_SKIRMISH_LOADOUT.faceDeck;
export const CONTROL_STARTING_DICE = TAG_SKIRMISH_LOADOUT.startingDice;

export const AGGRO_SQUAD = TAG_SKIRMISH_LOADOUT.squad;
export const AGGRO_DECK = TAG_SKIRMISH_LOADOUT.deck;
export const AGGRO_DECK_COUNTS = TAG_SKIRMISH_LOADOUT.deckCounts;
export const AGGRO_FACE_DECK = TAG_SKIRMISH_LOADOUT.faceDeck;
export const AGGRO_STARTING_DICE = TAG_SKIRMISH_LOADOUT.startingDice;

export const PROTOTYPE_SQUAD = TAG_SKIRMISH_LOADOUT.squad;
export const PROTOTYPE_DECK = TAG_SKIRMISH_LOADOUT.deck;
export const PROTOTYPE_DECK_COUNTS = TAG_SKIRMISH_LOADOUT.deckCounts;
export const PROTOTYPE_FACE_DECK = TAG_SKIRMISH_LOADOUT.faceDeck;
export const PROTOTYPE_STARTING_DICE = TAG_SKIRMISH_LOADOUT.startingDice;

export const COMBO_MECHANICAL_SQUAD = TAG_SKIRMISH_LOADOUT.squad;
export const COMBO_MECHANICAL_DECK = TAG_SKIRMISH_LOADOUT.deck;
export const COMBO_MECHANICAL_DECK_COUNTS = TAG_SKIRMISH_LOADOUT.deckCounts;
export const COMBO_MECHANICAL_FACE_DECK = TAG_SKIRMISH_LOADOUT.faceDeck;
export const COMBO_MECHANICAL_STARTING_DICE = TAG_SKIRMISH_LOADOUT.startingDice;

export const BURN_SQUAD = TAG_SKIRMISH_LOADOUT.squad;
export const BURN_DECK = TAG_SKIRMISH_LOADOUT.deck;
export const BURN_DECK_COUNTS = TAG_SKIRMISH_LOADOUT.deckCounts;
export const BURN_FACE_DECK = TAG_SKIRMISH_LOADOUT.faceDeck;
export const BURN_STARTING_DICE = TAG_SKIRMISH_LOADOUT.startingDice;

export const ALL_BUILTIN_LOADOUTS = [TAG_SKIRMISH_LOADOUT] as const;
