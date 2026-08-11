import { ATTRIBUTES, type Attribute } from "../model/attributes.js";
import type { FaceCardDefinition, FaceKind } from "../model/dice.js";
import { asFaceCardId, type FaceCardId } from "../model/ids.js";
import { SHIELD, type SymbolType } from "../model/symbols.js";

/**
 * Face cards from the Figma `Face card` page (`2:13`), translated to English.
 *
 * Basics are natural identity faces. Named specials carry printed inherent
 * effects; `onRoll` is set only when every clause is modelled.
 */

const face = (definition: FaceCardDefinition): FaceCardDefinition => definition;

export const naturalFaceId = (attribute: Attribute): FaceCardId =>
  asFaceCardId(`face-natural-${attribute}`);

export const syntheticFaceId = (attribute: Attribute): FaceCardId =>
  asFaceCardId(`face-synthetic-${attribute}`);

export const faceIdFor = (kind: FaceKind, attribute: Attribute): FaceCardId =>
  kind === "synthetic" ? syntheticFaceId(attribute) : naturalFaceId(attribute);

/** Shield is the one untyped natural face (bible §10 / starting dice). */
export const SHIELD_FACE_ID: FaceCardId = asFaceCardId("face-natural-shield");

export const faceIdForSymbol = (symbol: SymbolType): FaceCardId =>
  symbol === SHIELD ? SHIELD_FACE_ID : naturalFaceId(symbol);

/* ----------------------------------------------------------- Figma names --- */

const NATURAL_FACE_NAMES: Readonly<Record<Attribute, string>> = {
  martial: "Martial",
  wild: "Wild",
  toxin: "Toxin",
  arcane: "Arcane",
  luminar: "Luminar",
  mechanical: "Mechanical",
  corruption: "Corruption",
  darkness: "Darkness",
};

/** Generic synthetics kept as forge targets when no named special is chosen. */
const SYNTHETIC_FACE_NAMES: Readonly<Record<Attribute, string>> = {
  martial: "Forged Martial",
  wild: "Forged Wild",
  toxin: "Forged Toxin",
  arcane: "Forged Arcane",
  luminar: "Forged Luminar",
  mechanical: "Forged Mechanical",
  corruption: "Forged Corruption",
  darkness: "Forged Darkness",
};

/* ----------------------------------------------------- named specials --- */

export const ARCANE_ECHO_FACE: FaceCardId = asFaceCardId("face-synthetic-arcane-echo");
export const GREAT_SPARK: FaceCardId = asFaceCardId("face-synthetic-great-spark");
export const RENDING_CLAW: FaceCardId = asFaceCardId("face-synthetic-rending-claw");
export const CRUSH: FaceCardId = asFaceCardId("face-synthetic-crush");
export const REKINDLE: FaceCardId = asFaceCardId("face-synthetic-rekindle");
export const BLADE_RAIN: FaceCardId = asFaceCardId("face-synthetic-blade-rain");
export const FORBIDDEN_HERITAGE: FaceCardId = asFaceCardId("face-synthetic-forbidden-heritage");
export const PESTILENT_PLAGUE: FaceCardId = asFaceCardId("face-synthetic-pestilent-plague");

const naturalFace = (attribute: Attribute): FaceCardDefinition =>
  face({
    id: naturalFaceId(attribute),
    name: NATURAL_FACE_NAMES[attribute],
    kind: "natural",
    symbol: attribute,
    rulesText: "",
    onRoll: [],
    maxOverloads: 1,
    forgeRestriction: null,
  });

const genericSynthetic = (attribute: Attribute): FaceCardDefinition =>
  face({
    id: syntheticFaceId(attribute),
    name: SYNTHETIC_FACE_NAMES[attribute],
    kind: "synthetic",
    symbol: attribute,
    rulesText: "",
    onRoll: [],
    maxOverloads: 2,
    forgeRestriction: null,
  });

const DEFINITIONS: readonly FaceCardDefinition[] = [
  ...ATTRIBUTES.map(naturalFace),
  ...ATTRIBUTES.map(genericSynthetic),
  face({
    id: SHIELD_FACE_ID,
    name: "Shield",
    kind: "natural",
    symbol: SHIELD,
    rulesText: "",
    onRoll: [],
    maxOverloads: 1,
    forgeRestriction: null,
  }),
  face({
    id: ARCANE_ECHO_FACE,
    name: "Arcane Echo",
    kind: "synthetic",
    symbol: "arcane",
    rulesText:
      '[Requirement: may only be forged by "Echo" cards]\n' +
      "Copy the other die's face, applying its effects, attributes, and overloads.",
    // Copying a face with overloads is not modelled yet.
    onRoll: [],
    maxOverloads: 0,
    forgeRestriction: "echo-cards",
  }),
  face({
    id: GREAT_SPARK,
    name: "Great Spark",
    kind: "synthetic",
    symbol: "luminar",
    // No printing supplied yet on the Face card page.
    rulesText: "",
    onRoll: [],
    maxOverloads: 2,
    forgeRestriction: null,
  }),
  face({
    id: BLADE_RAIN,
    name: "Blade Rain",
    kind: "synthetic",
    symbol: "wild",
    rulesText:
      "You may distribute the damage of the next attack freely among enemies within [Range].",
    // Attack-damage splitting is not modelled yet.
    onRoll: [],
    maxOverloads: 3,
    forgeRestriction: null,
  }),
  face({
    id: RENDING_CLAW,
    name: "Rending Claw",
    kind: "synthetic",
    symbol: "wild",
    rulesText: "A targeted enemy creature loses 3 [Shield].",
    onRoll: [{ type: "remove-shield", amount: 3, target: { kind: "most-shielded-enemy" } }],
    maxOverloads: 3,
    forgeRestriction: null,
  }),
  face({
    id: CRUSH,
    name: "Crush",
    kind: "synthetic",
    symbol: "martial",
    rulesText: "The next attack this turn deals +1 damage.",
    onRoll: [{ type: "next-attack-bonus", amount: 1 }],
    maxOverloads: 3,
    forgeRestriction: null,
  }),
  face({
    id: REKINDLE,
    name: "Rekindle",
    kind: "synthetic",
    symbol: "luminar",
    // No printing supplied yet on the Face card page.
    rulesText: "",
    onRoll: [],
    maxOverloads: 2,
    forgeRestriction: null,
  }),
  face({
    id: FORBIDDEN_HERITAGE,
    name: "Forbidden Heritage",
    kind: "synthetic",
    symbol: "corruption",
    rulesText:
      "Your opponent draws 1 card. [Retain] this face.\n" +
      "You may pay [Energy], 2 + 1 per [Corruption] face on your die, to remove 1 [Corruption] face from your die.",
    // Opponent draw + retain + activated remove are not modelled yet.
    onRoll: [],
    maxOverloads: 1,
    forgeRestriction: null,
  }),
  face({
    id: PESTILENT_PLAGUE,
    name: "Pestilent Plague",
    kind: "synthetic",
    symbol: "corruption",
    rulesText:
      "When you roll this face, put 1 pestilence counter on this card.\n" +
      "If this card has 5 pestilence counters, remove them and [Forge] 1 [Pestilent Plague] face next to a [Pestilent Plague] face.\n" +
      "You may pay [Energy], 2 + 1 per [Corruption] face on your die, to remove 1 [Corruption] face from your die.",
    // Pestilence counters and adjacent forge are not modelled yet.
    onRoll: [],
    maxOverloads: 2,
    forgeRestriction: null,
  }),
];

export const FACE_CARDS: Readonly<Record<string, FaceCardDefinition>> = Object.fromEntries(
  DEFINITIONS.map((definition) => [definition.id, definition]),
);

export const getFaceCard = (id: FaceCardId): FaceCardDefinition | undefined => FACE_CARDS[id];

/** Catalogue order: basics (attributes + Shield), then named specials with printings. */
export const ALL_FACE_CARDS: readonly FaceCardDefinition[] = [
  ...ATTRIBUTES.map((attribute) => FACE_CARDS[naturalFaceId(attribute)]!),
  FACE_CARDS[SHIELD_FACE_ID]!,
  FACE_CARDS[ARCANE_ECHO_FACE]!,
  FACE_CARDS[BLADE_RAIN]!,
  FACE_CARDS[RENDING_CLAW]!,
  FACE_CARDS[CRUSH]!,
  FACE_CARDS[FORBIDDEN_HERITAGE]!,
  FACE_CARDS[PESTILENT_PLAGUE]!,
];

/** Basics only — the eight attributes plus Shield. */
export const BASIC_FACE_CARDS: readonly FaceCardDefinition[] = ALL_FACE_CARDS.slice(0, 9);

/** Named synthetic specials that have printed rules text. */
export const SPECIAL_FACE_CARDS: readonly FaceCardDefinition[] = ALL_FACE_CARDS.slice(9);

/**
 * Opening die for both players (OPEN_DESIGN). Four attributes plus two Shields.
 * These installed naturals sit outside the twelve-card face-deck limit (bible §12).
 */
export const STARTING_DIE_SYMBOLS: readonly SymbolType[] = [
  "martial",
  "wild",
  "arcane",
  "luminar",
  SHIELD,
  SHIELD,
];

/**
 * Prototype face deck — twelve cards, at most three per attribute (bible §12).
 * Starting naturals stay off this list so the ownership ledger stays consistent.
 * Includes a generic synthetic Arcane for Living Library; Arcane Echo is
 * Echo-card-only.
 */
export const PROTOTYPE_FACE_DECK: readonly FaceCardId[] = [
  naturalFaceId("darkness"),
  naturalFaceId("corruption"),
  naturalFaceId("toxin"),
  naturalFaceId("mechanical"),
  syntheticFaceId("arcane"),
  ARCANE_ECHO_FACE,
  RENDING_CLAW,
  BLADE_RAIN,
  CRUSH,
  FORBIDDEN_HERITAGE,
  PESTILENT_PLAGUE,
  syntheticFaceId("darkness"),
];
