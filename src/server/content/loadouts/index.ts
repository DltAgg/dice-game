import type { StartingDiceLayout } from "../../model/dice.js";
import { asCardId, asCreatureDefinitionId, asFaceCardId, type CardId } from "../../model/ids.js";
import aggroDoc from "./aggro.json";
import burnDoc from "./burn.json";
import comboDoc from "./combo-mechanical.json";
import controlDoc from "./control.json";
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

export const AGGRO_LOADOUT = hydrate(aggroDoc as unknown as BuiltinLoadoutDocument);
export const CONTROL_LOADOUT = hydrate(controlDoc as unknown as BuiltinLoadoutDocument);
export const TEMPO_LOADOUT = hydrate(tempoDoc as unknown as BuiltinLoadoutDocument);
export const COMBO_MECHANICAL_LOADOUT = hydrate(comboDoc as unknown as BuiltinLoadoutDocument);
export const BURN_LOADOUT = hydrate(burnDoc as unknown as BuiltinLoadoutDocument);

export const AGGRO_SQUAD = AGGRO_LOADOUT.squad;
export const AGGRO_DECK = AGGRO_LOADOUT.deck;
export const AGGRO_DECK_COUNTS = AGGRO_LOADOUT.deckCounts;
export const AGGRO_FACE_DECK = AGGRO_LOADOUT.faceDeck;
export const AGGRO_STARTING_DICE = AGGRO_LOADOUT.startingDice;

/** @deprecated Prefer `AGGRO_*` — Aggro’s persisted id remains `deck-prototype`. */
export const PROTOTYPE_SQUAD = AGGRO_SQUAD;
export const PROTOTYPE_DECK = AGGRO_DECK;
export const PROTOTYPE_FACE_DECK = AGGRO_FACE_DECK;
export const PROTOTYPE_STARTING_DICE = AGGRO_STARTING_DICE;

export const CONTROL_SQUAD = CONTROL_LOADOUT.squad;
export const CONTROL_DECK = CONTROL_LOADOUT.deck;
export const CONTROL_FACE_DECK = CONTROL_LOADOUT.faceDeck;
export const CONTROL_STARTING_DICE = CONTROL_LOADOUT.startingDice;

export const TEMPO_SQUAD = TEMPO_LOADOUT.squad;
export const TEMPO_DECK = TEMPO_LOADOUT.deck;
export const TEMPO_FACE_DECK = TEMPO_LOADOUT.faceDeck;
export const TEMPO_STARTING_DICE = TEMPO_LOADOUT.startingDice;

export const COMBO_MECHANICAL_SQUAD = COMBO_MECHANICAL_LOADOUT.squad;
export const COMBO_MECHANICAL_DECK = COMBO_MECHANICAL_LOADOUT.deck;
export const COMBO_MECHANICAL_FACE_DECK = COMBO_MECHANICAL_LOADOUT.faceDeck;
export const COMBO_MECHANICAL_STARTING_DICE = COMBO_MECHANICAL_LOADOUT.startingDice;

export const BURN_SQUAD = BURN_LOADOUT.squad;
export const BURN_DECK = BURN_LOADOUT.deck;
export const BURN_DECK_COUNTS = BURN_LOADOUT.deckCounts;
export const BURN_FACE_DECK = BURN_LOADOUT.faceDeck;
export const BURN_STARTING_DICE = BURN_LOADOUT.startingDice;

export const ALL_BUILTIN_LOADOUTS = [
  AGGRO_LOADOUT,
  CONTROL_LOADOUT,
  TEMPO_LOADOUT,
  COMBO_MECHANICAL_LOADOUT,
  BURN_LOADOUT,
] as const;
