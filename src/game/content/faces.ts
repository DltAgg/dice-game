import { ATTRIBUTES, type Attribute } from "../model/attributes.js";
import type { FaceCardDefinition, FaceKind } from "../model/dice.js";
import { asFaceCardId, type FaceCardId } from "../model/ids.js";
import { SHIELD, type SymbolType } from "../model/symbols.js";

/**
 * Face cards from the Figma `Face card` page (`2:13`), plus named synthetics
 * staged from `synthetic_faces.csv`. Translated to English.
 *
 * Basics are natural identity faces. Named specials carry printed inherent
 * effects; `onRoll` is set only when every clause is modelled (including any
 * On absorb line — absorb triggers are not engine vocabulary yet).
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

/** Named synthetics from the synthetic_faces CSV worksheet (print-first). */
export const INSIGHT_RUNE: FaceCardId = asFaceCardId("face-synthetic-insight-rune");
export const CONVERSION_RUNE: FaceCardId = asFaceCardId("face-synthetic-conversion-rune");
export const RESONANCE_RUNE: FaceCardId = asFaceCardId("face-synthetic-resonance-rune");
export const VITAL_SPARK: FaceCardId = asFaceCardId("face-synthetic-vital-spark");
export const AEGIS: FaceCardId = asFaceCardId("face-synthetic-aegis");
export const REVELATION: FaceCardId = asFaceCardId("face-synthetic-revelation");
export const INSTINCT: FaceCardId = asFaceCardId("face-synthetic-instinct");
export const PRIMORDIAL_FURY: FaceCardId = asFaceCardId("face-synthetic-primordial-fury");
export const PACK: FaceCardId = asFaceCardId("face-synthetic-pack");
export const COMMAND: FaceCardId = asFaceCardId("face-synthetic-command");
export const IMPACT: FaceCardId = asFaceCardId("face-synthetic-impact");
export const FORMATION: FaceCardId = asFaceCardId("face-synthetic-formation");
export const VENOM: FaceCardId = asFaceCardId("face-synthetic-venom");
export const SPORES: FaceCardId = asFaceCardId("face-synthetic-spores");
export const ADAPTIVE_TOXIN: FaceCardId = asFaceCardId("face-synthetic-adaptive-toxin");
export const STAIN: FaceCardId = asFaceCardId("face-synthetic-stain");
export const INFECTION: FaceCardId = asFaceCardId("face-synthetic-infection");
export const DECAY: FaceCardId = asFaceCardId("face-synthetic-decay");
export const GEAR: FaceCardId = asFaceCardId("face-synthetic-gear");
export const CATALYST: FaceCardId = asFaceCardId("face-synthetic-catalyst");
export const OVERCHARGE: FaceCardId = asFaceCardId("face-synthetic-overcharge");
export const SHADOW_ECHO: FaceCardId = asFaceCardId("face-synthetic-shadow-echo");
export const DRAIN: FaceCardId = asFaceCardId("face-synthetic-drain");
export const SACRIFICE: FaceCardId = asFaceCardId("face-synthetic-sacrifice");

/** Print-only named synthetic: accurate English text, empty `onRoll` until absorb + clauses land. */
const namedSynthetic = (
  id: FaceCardId,
  name: string,
  symbol: Attribute,
  rulesText: string,
  maxOverloads = 2,
): FaceCardDefinition =>
  face({
    id,
    name,
    kind: "synthetic",
    symbol,
    rulesText,
    onRoll: [],
    onAbsorb: [],
    maxOverloads,
    forgeRestriction: null,
  });

const naturalFace = (attribute: Attribute): FaceCardDefinition =>
  face({
    id: naturalFaceId(attribute),
    name: NATURAL_FACE_NAMES[attribute],
    kind: "natural",
    symbol: attribute,
    rulesText: "",
    onRoll: [],
    onAbsorb: [],
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
    onAbsorb: [],
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
    onAbsorb: [],
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
    onAbsorb: [],
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
    onAbsorb: [],
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
    onAbsorb: [],
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
    onAbsorb: [],
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
    onAbsorb: [],
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
    onAbsorb: [],
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
    onAbsorb: [],
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
    onAbsorb: [],
    maxOverloads: 2,
    forgeRestriction: null,
  }),

  // --- synthetic_faces.csv (Roll + Absorb; absorb path not modelled — print only) ---
  namedSynthetic(
    INSIGHT_RUNE,
    "Insight Rune",
    "arcane",
    "On roll: draw 1 card.\n" +
      "On absorb: look at the top 2 cards of your deck; put one into your hand and the other on the bottom.",
  ),
  namedSynthetic(
    CONVERSION_RUNE,
    "Conversion Rune",
    "arcane",
    "On roll: you may convert this Arcane symbol into any Natural symbol.\n" +
      "On absorb: gain 1 Energy.",
  ),
  namedSynthetic(
    RESONANCE_RUNE,
    "Resonance Rune",
    "arcane",
    "On roll: if there is another Arcane symbol in the Pool, gain 1 additional Energy.\n" +
      "On absorb: the next Arcane symbol used this turn may be treated as any attribute.",
  ),
  namedSynthetic(
    VITAL_SPARK,
    "Vital Spark",
    "luminar",
    "On roll: heal 1 on an allied creature.\n" +
      "On absorb: prevent 1 damage that would be dealt to this creature this turn.",
  ),
  namedSynthetic(
    AEGIS,
    "Aegis",
    "luminar",
    "On roll: generate 1 Shield.\n" +
      "On absorb: redirect up to 2 damage that would be dealt to another allied creature to this creature.",
  ),
  namedSynthetic(
    REVELATION,
    "Revelation",
    "luminar",
    "On roll: reveal the top card of your deck; you may put it on the bottom.\n" +
      "On absorb: heal 2 on a creature that has less than half its Life remaining.",
  ),
  namedSynthetic(
    INSTINCT,
    "Instinct",
    "wild",
    "On roll: an allied creature may reposition 1 space.\n" +
      "On absorb: it may perform a Basic Attack if it has not attacked this turn.",
  ),
  namedSynthetic(
    PRIMORDIAL_FURY,
    "Primordial Fury",
    "wild",
    "On roll: if an allied creature has attacked this turn, gain 1 Energy.\n" +
      "On absorb: this creature's next Basic Attack deals +1 damage.",
  ),
  namedSynthetic(
    PACK,
    "Pack",
    "wild",
    "On roll: if you control another adjacent creature, generate 1 additional Wild symbol in the Pool.\n" +
      "On absorb: another allied creature may reposition 1 space.",
  ),
  namedSynthetic(
    COMMAND,
    "Command",
    "martial",
    "On roll: reposition an allied creature 1 space.\n" +
      "On absorb: move an enemy creature 1 space.",
  ),
  namedSynthetic(
    IMPACT,
    "Impact",
    "martial",
    "On roll: the next Basic Attack this turn pushes the target 1 space.\n" +
      "On absorb: this creature's next attack deals +2 damage.",
  ),
  namedSynthetic(
    FORMATION,
    "Formation",
    "martial",
    "On roll: if this creature is on the frontline, gain 1 Energy.\n" +
      "On absorb: another allied frontline creature gains +1 Defense this turn.",
  ),
  namedSynthetic(
    VENOM,
    "Venom",
    "toxin",
    "On roll: apply 1 Toxin marker to an enemy creature.\n" +
      "On absorb: the target creature takes +1 damage the next time it takes damage.",
  ),
  namedSynthetic(
    SPORES,
    "Spores",
    "toxin",
    "On roll: if an enemy creature already has Toxin, apply 1 additional marker.\n" +
      "On absorb: heal 1 on an allied creature that has Toxin.",
  ),
  namedSynthetic(
    ADAPTIVE_TOXIN,
    "Adaptive Toxin",
    "toxin",
    "On roll: choose an enemy creature with Toxin; until its next turn, it cannot receive more than 1 Toxin marker.\n" +
      "On absorb: remove any number of markers from an enemy creature; for each marker removed, deal 1 damage.",
  ),
  namedSynthetic(
    STAIN,
    "Stain",
    "corruption",
    "On roll: put 1 Corruption marker on an opposing synthetic face.\n" +
      "On absorb: choose an opposing Corrupted face; it cannot be used as a resource this turn.",
  ),
  namedSynthetic(
    INFECTION,
    "Infection",
    "corruption",
    "On roll: if the opponent has a Corrupted face, put 1 Corruption marker on another face of the same die.\n" +
      "On absorb: the opponent loses 1 unspent Energy.",
  ),
  namedSynthetic(
    DECAY,
    "Decay",
    "corruption",
    "On roll: choose an opposing Natural face; until the next roll, it has no inherent effect.\n" +
      "On absorb: remove a Corrupted face from the opponent's die and put it into its controller's Pool as an unusable Corruption symbol.",
  ),
  namedSynthetic(
    GEAR,
    "Gear",
    "mechanical",
    "On roll: if you have another Synthetic symbol in the Pool, gain 1 Energy.\n" +
      "On absorb: the next face you install this turn costs 1 Energy less.",
  ),
  namedSynthetic(
    CATALYST,
    "Catalyst",
    "mechanical",
    "On roll: choose a Synthetic face in the Pool; it may be used as any attribute.\n" +
      "On absorb: copy the effect of a Synthetic face that appeared this roll.",
  ),
  namedSynthetic(
    OVERCHARGE,
    "Overcharge",
    "mechanical",
    "On roll: you may gain 1 additional Energy; if you do, this face becomes Overcharged and cannot generate its effect on the next roll.\n" +
      "On absorb: the next face effect you resolve this turn is resolved twice.",
  ),
  namedSynthetic(
    SHADOW_ECHO,
    "Shadow Echo",
    "darkness",
    "On roll: you may discard a card; if you do, draw a card.\n" +
      "On absorb: return a card that costs 2 or less from your discard pile to your hand.",
  ),
  namedSynthetic(
    DRAIN,
    "Drain",
    "darkness",
    "On roll: your opponent loses 1 Energy; you do not gain that Energy.\n" +
      "On absorb: transfer 1 Energy from the opponent's reserve to yours.",
  ),
  namedSynthetic(
    SACRIFICE,
    "Sacrifice",
    "darkness",
    "On roll: discard a card; if you do, gain 2 Energy.\n" +
      "On absorb: discard a card to deal 2 damage to a creature.",
  ),
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
  FACE_CARDS[INSIGHT_RUNE]!,
  FACE_CARDS[CONVERSION_RUNE]!,
  FACE_CARDS[RESONANCE_RUNE]!,
  FACE_CARDS[VITAL_SPARK]!,
  FACE_CARDS[AEGIS]!,
  FACE_CARDS[REVELATION]!,
  FACE_CARDS[INSTINCT]!,
  FACE_CARDS[PRIMORDIAL_FURY]!,
  FACE_CARDS[PACK]!,
  FACE_CARDS[COMMAND]!,
  FACE_CARDS[IMPACT]!,
  FACE_CARDS[FORMATION]!,
  FACE_CARDS[VENOM]!,
  FACE_CARDS[SPORES]!,
  FACE_CARDS[ADAPTIVE_TOXIN]!,
  FACE_CARDS[STAIN]!,
  FACE_CARDS[INFECTION]!,
  FACE_CARDS[DECAY]!,
  FACE_CARDS[GEAR]!,
  FACE_CARDS[CATALYST]!,
  FACE_CARDS[OVERCHARGE]!,
  FACE_CARDS[SHADOW_ECHO]!,
  FACE_CARDS[DRAIN]!,
  FACE_CARDS[SACRIFICE]!,
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
