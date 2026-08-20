import {
  DUAL_KIND_ATTRIBUTES,
  isDualKindAttribute,
  type Attribute,
  type DualKindAttribute,
} from "../model/attributes.js";
import type { DieFaceLayout, FaceCardDefinition, ForgeableFaceKind, StartingDiceLayout } from "../model/dice.js";
import type { EffectDefinition } from "../model/effects.js";
import { asFaceCardId, type FaceCardId } from "../model/ids.js";
import { SHIELD, type SymbolType } from "../model/symbols.js";

/**
 * Face cards from the Figma `Face card` page (`2:13`), plus named synthetics
 * staged from `synthetic_faces.csv`. Translated to English.
 *
 * Basics are starting-die identity faces: Natural Martial / Wild / Arcane /
 * Luminar, plus untyped Shield. Toxin / Mechanical / Corruption / Darkness are
 * synthetic-only attributes — forge those as named specials from the owner's
 * pool. Dual-timing print uses `On roll:` / `On absorb:`; fill `onRoll` /
 * `onAbsorb` only for clauses the engine can resolve — leave the other array
 * empty and keep the deferred clause in `rulesText` (see DEFERRED_CATALOGUE).
 */

const face = (definition: FaceCardDefinition): FaceCardDefinition => definition;

export const naturalFaceId = (attribute: DualKindAttribute): FaceCardId =>
  asFaceCardId(`face-natural-${attribute}`);

/**
 * Starting-die identity only: naturals for dual-kind attributes. There is no
 * canonical `face-synthetic-<attr>` — forging names a special from the pool.
 */
export const faceIdFor = (kind: ForgeableFaceKind, attribute: Attribute): FaceCardId => {
  if (kind === "natural") {
    if (!isDualKindAttribute(attribute)) {
      throw new Error(
        `attribute "${attribute}" is synthetic-only; natural faces are not allowed`,
      );
    }
    return naturalFaceId(attribute);
  }
  throw new Error(
    `there is no canonical synthetic face for "${attribute}"; name a special from the owner's pool`,
  );
};

/** Shield is the one untyped starting face (bible §10 / starting dice). */
export const SHIELD_FACE_ID: FaceCardId = asFaceCardId("face-untyped-shield");

export const faceIdForSymbol = (symbol: SymbolType): FaceCardId => {
  if (symbol === SHIELD) return SHIELD_FACE_ID;
  if (isDualKindAttribute(symbol)) return naturalFaceId(symbol);
  throw new Error(
    `starting dice have no identity face for "${symbol}"; use a named synthetic from the face pool`,
  );
};

/* ----------------------------------------------------------- Figma names --- */

const NATURAL_FACE_NAMES: Readonly<Record<DualKindAttribute, string>> = {
  martial: "Martial",
  wild: "Wild",
  arcane: "Arcane",
  luminar: "Luminar",
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
export const BLIGHT: FaceCardId = asFaceCardId("face-synthetic-blight");
export const HEXBRAND: FaceCardId = asFaceCardId("face-synthetic-hexbrand");
export const CANKER: FaceCardId = asFaceCardId("face-synthetic-canker");
export const GEAR: FaceCardId = asFaceCardId("face-synthetic-gear");
export const CATALYST: FaceCardId = asFaceCardId("face-synthetic-catalyst");
export const OVERCHARGE: FaceCardId = asFaceCardId("face-synthetic-overcharge");
export const FLYWHEEL: FaceCardId = asFaceCardId("face-synthetic-flywheel");
export const PISTON: FaceCardId = asFaceCardId("face-synthetic-piston");
export const SHADOW_ECHO: FaceCardId = asFaceCardId("face-synthetic-shadow-echo");
export const DRAIN: FaceCardId = asFaceCardId("face-synthetic-drain");
export const SACRIFICE: FaceCardId = asFaceCardId("face-synthetic-sacrifice");
export const WARHORN: FaceCardId = asFaceCardId("face-synthetic-warhorn");
export const CLEAVING_STRIKE: FaceCardId = asFaceCardId("face-synthetic-cleaving-strike");
export const BLOODSCENT: FaceCardId = asFaceCardId("face-synthetic-bloodscent");
export const GORE: FaceCardId = asFaceCardId("face-synthetic-gore");
export const NEEDLE: FaceCardId = asFaceCardId("face-synthetic-needle");
export const SEEP: FaceCardId = asFaceCardId("face-synthetic-seep");
export const NIGHTWELL: FaceCardId = asFaceCardId("face-synthetic-nightwell");
export const RUNEFLARE: FaceCardId = asFaceCardId("face-synthetic-runeflare");
export const MARROW_ROT: FaceCardId = asFaceCardId("face-synthetic-marrow-rot");
export const CINDER: FaceCardId = asFaceCardId("face-synthetic-cinder");
export const WASTING_BRAND: FaceCardId = asFaceCardId("face-synthetic-wasting-brand");

/** Named synthetic with accurate English; wire hooks only for modellable clauses. */
const namedSynthetic = (
  id: FaceCardId,
  name: string,
  symbol: Attribute,
  rulesText: string,
  options?: {
    readonly onRoll?: readonly EffectDefinition[];
    readonly onAbsorb?: readonly EffectDefinition[];
    readonly maxOverloads?: number;
  },
): FaceCardDefinition =>
  face({
    id,
    name,
    kind: "synthetic",
    symbol,
    rulesText,
    onRoll: options?.onRoll ?? [],
    onAbsorb: options?.onAbsorb ?? [],
    maxOverloads: options?.maxOverloads ?? 2,
    forgeRestriction: null,
  });

const naturalFace = (attribute: DualKindAttribute): FaceCardDefinition =>
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

const DEFINITIONS: readonly FaceCardDefinition[] = [
  ...DUAL_KIND_ATTRIBUTES.map(naturalFace),
  face({
    id: SHIELD_FACE_ID,
    name: "Shield",
    kind: "untyped",
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
      "Cannot be included on opening dice.\n" +
      "On roll: copy the other die's face, applying its effects, attributes, and overloads.",
    onRoll: [{ type: "copy-other-die-face" }],
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
      "On roll: you may distribute the damage of the next attack freely among enemies within [Range].",
    onRoll: [{ type: "arm-blade-rain" }],
    onAbsorb: [],
    maxOverloads: 3,
    forgeRestriction: null,
  }),
  face({
    id: RENDING_CLAW,
    name: "Rending Claw",
    kind: "synthetic",
    symbol: "wild",
    rulesText: "On roll: a targeted enemy creature loses 3 [Shield].",
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
    rulesText: "On roll: the next attack this turn deals +1 damage.",
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
      "Cannot be included on opening dice.\n" +
      "On roll: your opponent draws 1 card. Retain this die.\n" +
      "This face cannot be replaced by forging.\n" +
      "Activated: pay Energy equal to 2 plus 1 per Corruption face on this die to remove this face.",
    onRoll: [
      { type: "draw-cards", amount: 1, player: "opponent" },
      { type: "retain-die" },
    ],
    onAbsorb: [],
    maxOverloads: 1,
    forgeRestriction: null,
    stayPolicy: { kind: "cannot-replace-by-forge" },
    activated: {
      kind: "remove-corruption-face",
      energyBase: 2,
      energyPerCorruptionOnDie: 1,
    },
  }),
  face({
    id: PESTILENT_PLAGUE,
    name: "Pestilent Plague",
    kind: "synthetic",
    symbol: "corruption",
    rulesText:
      "Cannot be included on opening dice.\n" +
      "On roll: put 1 pestilence counter on this face. At 2 pestilence counters: remove them and forge 1 Pestilent Plague onto an adjacent slot of this die.\n" +
      "Cannot be replaced by forging for 4 of this die's owner's turns. Whenever a Pestilent Plague is forged onto this die, reset the remaining lock to 4 on every Pestilent Plague on this die.\n" +
      "Activated: pay Energy equal to 2 plus 1 per Corruption face on this die to remove this face.",
    onRoll: [{ type: "add-pestilence-counter" }],
    onAbsorb: [],
    maxOverloads: 2,
    forgeRestriction: null,
    stayPolicy: { kind: "forge-lock", turns: 4 },
    pestilenceSpreadAt: 2,
    activated: {
      kind: "remove-corruption-face",
      energyBase: 2,
      energyPerCorruptionOnDie: 1,
    },
  }),

  // --- synthetic_faces.csv (On roll / On absorb; wire only modellable clauses) ---
  namedSynthetic(
    INSIGHT_RUNE,
    "Insight Rune",
    "arcane",
    "On roll: draw 1 card.\n" +
      "On absorb: look at the top 2 cards of your deck; put one into your hand and the other on the bottom.",
    { onRoll: [{ type: "draw-cards", amount: 1 }], onAbsorb: [{ type: "look-top-deck", amount: 2 }] },
  ),
  namedSynthetic(
    CONVERSION_RUNE,
    "Conversion Rune",
    "arcane",
    "On roll: you may convert this Arcane symbol into any Natural symbol.\n" +
      "On absorb: gain 1 Energy.",
    {
      onRoll: [{ type: "convert-symbols", amount: 1, sourceOnly: true }],
      onAbsorb: [{ type: "gain-energy", amount: 1 }],
    },
  ),
  namedSynthetic(
    RESONANCE_RUNE,
    "Resonance Rune",
    "arcane",
    "On roll: if there is another Arcane symbol in the Pool, gain 1 additional Energy.\n" +
      "On absorb: the next Arcane symbol used this turn may be treated as any attribute.",
    {
      onRoll: [
        {
          type: "conditional",
          when: { type: "has-other-symbol", symbol: "arcane" },
          then: [{ type: "gain-energy", amount: 1 }],
        },
      ],
      onAbsorb: [{ type: "arm-requirement-wildcard", fromSymbol: "arcane" }],
    },
  ),
  namedSynthetic(
    VITAL_SPARK,
    "Vital Spark",
    "luminar",
    "On roll: heal 1 on an allied creature.\n" +
      "On absorb: prevent 1 damage that would be dealt to this creature this turn.",
    {
      onRoll: [{ type: "heal", amount: 1, target: { kind: "most-damaged-ally" } }],
      onAbsorb: [
        { type: "grant-damage-prevent", amount: 1, target: { kind: "source-creature" } },
      ],
    },
  ),
  namedSynthetic(
    AEGIS,
    "Aegis",
    "luminar",
    "On roll: generate 1 Shield.\n" +
      "On absorb: redirect up to 2 damage that would be dealt to another allied creature to this creature.",
    { onRoll: [{ type: "generate-symbol", symbol: SHIELD, amount: 1 }], onAbsorb: [{ type: "arm-redirect-damage", amount: 2, target: { kind: "source-creature" } }] },
  ),
  namedSynthetic(
    REVELATION,
    "Revelation",
    "luminar",
    "On roll: reveal the top card of your deck; you may put it on the bottom.\n" +
      "On absorb: heal 2 on a creature that has less than half its Life remaining.",
    {
      onRoll: [{ type: "peek-deck-optional-bottom" }],
      onAbsorb: [{ type: "heal", amount: 2, target: { kind: "choose-ally-damage-over-half" } }],
    },
  ),
  namedSynthetic(
    INSTINCT,
    "Instinct",
    "wild",
    "On roll: an allied creature may reposition 1 space.\n" +
      "On absorb: it may perform a Basic Attack if it has not attacked this turn.",
    {
      onRoll: [
        { type: "reposition-creature", target: { kind: "choose-ally" }, optional: true },
      ],
      onAbsorb: [{ type: "optional-bonus-basic-attack" }],
    },
  ),
  namedSynthetic(
    PRIMORDIAL_FURY,
    "Primordial Fury",
    "wild",
    "On roll: if an allied creature has attacked this turn, gain 1 Energy.\n" +
      "On absorb: this creature's next Basic Attack deals +1 damage.",
    {
      onRoll: [
        {
          type: "conditional",
          when: { type: "any-ally-attacked-this-turn" },
          then: [{ type: "gain-energy", amount: 1 }],
        },
      ],
      onAbsorb: [{ type: "next-attack-bonus", amount: 1 }],
    },
  ),
  namedSynthetic(
    PACK,
    "Pack",
    "wild",
    "On roll: if you control another adjacent creature, generate 1 additional Wild symbol in the Pool.\n" +
      "On absorb: another allied creature may reposition 1 space.",
    {
      onRoll: [
        {
          type: "conditional",
          when: { type: "has-adjacent-ally" },
          then: [{ type: "generate-symbol", symbol: "wild", amount: 1 }],
        },
      ],
      onAbsorb: [
        { type: "reposition-creature", target: { kind: "choose-ally-other" }, optional: true },
      ],
    },
  ),
  namedSynthetic(
    COMMAND,
    "Command",
    "martial",
    "On roll: reposition an allied creature 1 space.\n" +
      "On absorb: remove 1 Shield from an enemy creature.",
    {
      onRoll: [{ type: "reposition-creature", target: { kind: "choose-ally" } }],
      onAbsorb: [
        { type: "remove-shield", amount: 1, target: { kind: "most-shielded-enemy" } },
      ],
    },
  ),
  namedSynthetic(
    IMPACT,
    "Impact",
    "martial",
    "On roll: the next attack this turn deals +1 damage.\n" +
      "On absorb: this creature's next attack deals +2 damage.",
    {
      onRoll: [{ type: "next-attack-bonus", amount: 1 }],
      onAbsorb: [{ type: "next-attack-bonus", amount: 2 }],
    },
  ),
  namedSynthetic(
    FORMATION,
    "Formation",
    "martial",
    "On roll: if this creature is on the frontline, gain 1 Energy.\n" +
      "On absorb: another allied frontline creature gains +1 Defense this turn.",
    {
      onRoll: [
        {
          type: "conditional",
          when: { type: "controller-has-frontline" },
          then: [{ type: "gain-energy", amount: 1 }],
        },
      ],
      onAbsorb: [
        {
          type: "grant-damage-prevent",
          amount: 1,
          target: { kind: "choose-allied-frontline-other" },
        },
      ],
    },
  ),
  namedSynthetic(
    VENOM,
    "Venom",
    "toxin",
    "On roll: apply 1 Toxin marker to an enemy creature.\n" +
      "On absorb: the target creature takes +1 damage the next time it takes damage.",
    {
      onRoll: [{ type: "apply-toxin", amount: 1, target: { kind: "choose-enemy" } }],
      onAbsorb: [
        { type: "arm-next-incoming-bonus", amount: 1, target: { kind: "source-creature" } },
      ],
    },
  ),
  namedSynthetic(
    SPORES,
    "Spores",
    "toxin",
    "On roll: if an enemy creature already has Toxin, apply 1 additional marker.\n" +
      "On absorb: heal 1 on an allied creature that has Toxin.",
    {
      onRoll: [
        {
          type: "conditional",
          when: { type: "any-enemy-has-toxin" },
          then: [{ type: "apply-toxin", amount: 1, target: { kind: "choose-enemy-with-toxin" } }],
        },
      ],
      onAbsorb: [{ type: "heal", amount: 1, target: { kind: "choose-ally-with-toxin" } }],
    },
  ),
  namedSynthetic(
    ADAPTIVE_TOXIN,
    "Adaptive Toxin",
    "toxin",
    "On roll: choose an enemy creature with Toxin; until its next turn, it cannot receive more than 1 Toxin marker.\n" +
      "On absorb: remove any number of markers from an enemy creature; for each marker removed, deal 1 damage.",
    {
      onRoll: [
        {
          type: "arm-toxin-receive-cap",
          amount: 1,
          target: { kind: "choose-enemy-with-toxin" },
        },
      ],
      onAbsorb: [
        {
          type: "remove-toxin-deal-damage",
          target: { kind: "choose-enemy" },
        },
      ],
    },
  ),
  namedSynthetic(
    STAIN,
    "Stain",
    "corruption",
    "On roll: put 1 Corruption marker on an opposing synthetic face.\n" +
      "On absorb: choose an opposing Corrupted face; it cannot be used as a resource this turn.",
    {
      onRoll: [{ type: "add-corruption-marker", amount: 1 }],
      onAbsorb: [{ type: "lock-corrupted-face-resource" }],
    },
  ),
  namedSynthetic(
    INFECTION,
    "Infection",
    "corruption",
    "On roll: if the opponent has a Corrupted face, put 1 Corruption marker on another face of the same die.\n" +
      "On absorb: the opponent loses 1 unspent Energy.",
    {
      onRoll: [{ type: "spread-corruption-marker" }],
      onAbsorb: [{ type: "lose-energy", amount: 1, player: "opponent" }],
    },
  ),
  namedSynthetic(
    DECAY,
    "Decay",
    "corruption",
    "On roll: choose an opposing Natural face; until the next roll, it has no inherent effect.\n" +
      "On absorb: remove a Corrupted face from the opponent's die and put it into its controller's Pool as an unusable Corruption symbol.",
    {
      onRoll: [{ type: "suppress-opposing-natural-inherent" }],
      onAbsorb: [{ type: "strip-corrupted-face-unusable-symbol" }],
    },
  ),
  namedSynthetic(
    BLIGHT,
    "Blight",
    "corruption",
    "On roll: generate 1 Corruption.\n" +
      "On absorb: send 1 opposing Ritual to its owner's graveyard.",
    {
      onRoll: [{ type: "generate-symbol", symbol: "corruption", amount: 1 }],
      onAbsorb: [{ type: "destroy-ritual", target: { kind: "choose-opponent-ritual" } }],
    },
  ),
  namedSynthetic(
    HEXBRAND,
    "Hexbrand",
    "corruption",
    "On roll: a chosen enemy creature discards 1 attribute token.\n" +
      "On absorb: destroy 1 Equipment on an opposing creature.",
    {
      onRoll: [
        { type: "discard-attribute-tokens", amount: 1, target: { kind: "choose-enemy" } },
      ],
      onAbsorb: [{ type: "destroy-equipment", target: { kind: "choose-enemy" } }],
    },
  ),
  namedSynthetic(
    CANKER,
    "Canker",
    "corruption",
    "On roll: put 1 Corruption marker on an opposing synthetic face.\n" +
      "On absorb: forge 1 synthetic Corruption face on the opponent's die.",
    {
      onRoll: [{ type: "add-corruption-marker", amount: 1 }],
      onAbsorb: [
        {
          type: "forge-faces",
          faces: 1,
          kind: "synthetic",
          attribute: "corruption",
          target: "opponent-die",
        },
      ],
    },
  ),
  namedSynthetic(
    GEAR,
    "Gear",
    "mechanical",
    "On roll: if you have another Synthetic symbol in the Pool, gain 1 Energy.\n" +
      "On absorb: the next face you install this turn costs 1 Energy less.",
    {
      onRoll: [
        {
          type: "conditional",
          when: { type: "has-other-symbol", faceKind: "synthetic" },
          then: [{ type: "gain-energy", amount: 1 }],
        },
      ],
      onAbsorb: [{ type: "arm-forge-discount", amount: 1 }],
    },
  ),
  namedSynthetic(
    CATALYST,
    "Catalyst",
    "mechanical",
    "On roll: choose a Synthetic face in the Pool; it may be used as any attribute.\n" +
      "On absorb: copy the effect of a Synthetic face that appeared this roll.",
    {
      onRoll: [{ type: "arm-wildcard-from-synthetic-pool" }],
      onAbsorb: [{ type: "copy-appeared-synthetic-onroll" }],
    },
  ),
  namedSynthetic(
    OVERCHARGE,
    "Overcharge",
    "mechanical",
    "On roll: you may gain 1 additional Energy; if you do, this face becomes Overcharged and cannot generate its effect on the next roll.\n" +
      "On absorb: the next face effect you resolve this turn is resolved twice.",
    {
      onRoll: [{ type: "optional-overcharge-energy", amount: 1 }],
      onAbsorb: [{ type: "arm-resolve-next-face-effect-twice" }],
    },
  ),
  namedSynthetic(
    FLYWHEEL,
    "Flywheel",
    "mechanical",
    "On roll: gain 1 Energy.\nOn absorb: generate 1 Shield.",
    {
      onRoll: [{ type: "gain-energy", amount: 1 }],
      onAbsorb: [{ type: "generate-symbol", symbol: SHIELD, amount: 1 }],
    },
  ),
  namedSynthetic(
    PISTON,
    "Piston",
    "mechanical",
    "On roll: generate Mechanical.\nOn absorb: gain 1 Energy.",
    {
      onRoll: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
      onAbsorb: [{ type: "gain-energy", amount: 1 }],
    },
  ),
  namedSynthetic(
    SHADOW_ECHO,
    "Shadow Echo",
    "darkness",
    "On roll: you may discard a card; if you do, draw a card.\n" +
      "On absorb: return a card that costs 2 or less from your discard pile to your hand.",
    {
      onRoll: [
        { type: "discard-cards", amount: 1, optional: true, then: [{ type: "draw-cards", amount: 1 }] },
      ],
      onAbsorb: [{ type: "search-graveyard", amount: 1, maxEnergyCost: 2 }],
    },
  ),
  namedSynthetic(
    DRAIN,
    "Drain",
    "darkness",
    "On roll: your opponent loses 1 Energy; you do not gain that Energy.\n" +
      "On absorb: transfer 1 Energy from the opponent's reserve to yours.",
    {
      onRoll: [{ type: "lose-energy", amount: 1, player: "opponent" }],
      onAbsorb: [{ type: "transfer-energy", amount: 1 }],
    },
  ),
  namedSynthetic(
    SACRIFICE,
    "Sacrifice",
    "darkness",
    "On roll: discard a card; if you do, gain 2 Energy.\n" +
      "On absorb: discard a card to deal 2 damage to a creature.",
    {
      onRoll: [
        { type: "discard-cards", amount: 1, then: [{ type: "gain-energy", amount: 2 }] },
      ],
      onAbsorb: [
        {
          type: "discard-cards",
          amount: 1,
          then: [{ type: "damage", amount: 2, target: { kind: "choose-enemy" } }],
        },
      ],
    },
  ),
  namedSynthetic(
    NIGHTWELL,
    "Nightwell",
    "darkness",
    "On roll: generate 1 Darkness.\n" +
      "On absorb: a chosen enemy creature discards 1 attribute token.",
    {
      onRoll: [{ type: "generate-symbol", symbol: "darkness", amount: 1 }],
      onAbsorb: [
        { type: "discard-attribute-tokens", amount: 1, target: { kind: "choose-enemy" } },
      ],
    },
  ),
  namedSynthetic(
    RUNEFLARE,
    "Runeflare",
    "arcane",
    "On roll: deal 1 damage to a chosen enemy.\n" + "On absorb: draw 1 card.",
    {
      onRoll: [{ type: "damage", amount: 1, target: { kind: "choose-enemy" } }],
      onAbsorb: [{ type: "draw-cards", amount: 1 }],
    },
  ),
  namedSynthetic(
    WARHORN,
    "Warhorn",
    "martial",
    "On roll: generate 1 Martial.\n" +
      "On absorb: the next attack this turn deals +1 damage.",
    {
      onRoll: [{ type: "generate-symbol", symbol: "martial", amount: 1 }],
      onAbsorb: [{ type: "next-attack-bonus", amount: 1 }],
    },
  ),
  namedSynthetic(
    CLEAVING_STRIKE,
    "Cleaving Strike",
    "martial",
    "On roll: an enemy creature with the most Shield loses 2 Shield.\n" +
      "On absorb: the next attack this turn deals +1 damage.",
    {
      onRoll: [{ type: "remove-shield", amount: 2, target: { kind: "most-shielded-enemy" } }],
      onAbsorb: [{ type: "next-attack-bonus", amount: 1 }],
    },
  ),
  namedSynthetic(
    BLOODSCENT,
    "Bloodscent",
    "wild",
    "On roll: the next attack this turn deals +1 damage.\n" +
      "On absorb: generate 1 Wild.",
    {
      onRoll: [{ type: "next-attack-bonus", amount: 1 }],
      onAbsorb: [{ type: "generate-symbol", symbol: "wild", amount: 1 }],
    },
  ),
  namedSynthetic(
    GORE,
    "Gore",
    "wild",
    "On roll: deal 1 damage to a chosen enemy.\n" +
      "On absorb: the next attack this turn deals +1 damage.",
    {
      onRoll: [{ type: "damage", amount: 1, target: { kind: "choose-enemy" } }],
      onAbsorb: [{ type: "next-attack-bonus", amount: 1 }],
    },
  ),
  namedSynthetic(
    NEEDLE,
    "Needle",
    "toxin",
    "On roll: the next attack this turn deals +1 damage.\n" +
      "On absorb: apply 1 Toxin marker to a chosen enemy.",
    {
      onRoll: [{ type: "next-attack-bonus", amount: 1 }],
      onAbsorb: [{ type: "apply-toxin", amount: 1, target: { kind: "choose-enemy" } }],
    },
  ),
  namedSynthetic(
    SEEP,
    "Seep",
    "toxin",
    "On roll: generate 1 Toxin.\n" +
      "On absorb: all attacks this turn apply 1 Toxin marker.",
    {
      onRoll: [{ type: "generate-symbol", symbol: "toxin", amount: 1 }],
      onAbsorb: [{ type: "arm-attack-toxin", amount: 1 }],
    },
  ),
  namedSynthetic(
    MARROW_ROT,
    "Marrow Rot",
    "toxin",
    "On roll: apply 1 Toxin marker to a chosen enemy.\n" +
      "On absorb: apply 1 Toxin marker to a chosen enemy that already has Toxin.",
    {
      onRoll: [{ type: "apply-toxin", amount: 1, target: { kind: "choose-enemy" } }],
      onAbsorb: [
        {
          type: "conditional",
          when: { type: "any-enemy-has-toxin" },
          then: [{ type: "apply-toxin", amount: 1, target: { kind: "choose-enemy-with-toxin" } }],
        },
      ],
    },
  ),
  namedSynthetic(
    CINDER,
    "Cinder",
    "corruption",
    "On roll: deal 1 damage to a chosen enemy.\n" +
      "On absorb: apply 1 Toxin marker to a chosen enemy.",
    {
      onRoll: [{ type: "damage", amount: 1, target: { kind: "choose-enemy" } }],
      onAbsorb: [{ type: "apply-toxin", amount: 1, target: { kind: "choose-enemy" } }],
    },
  ),
  namedSynthetic(
    WASTING_BRAND,
    "Wasting Brand",
    "corruption",
    "On roll: deal 1 damage to your creature with the most damage.\n" +
      "On absorb: apply 1 Toxin marker to your creature with the most damage.",
    {
      onRoll: [{ type: "damage", amount: 1, target: { kind: "most-damaged-ally" } }],
      onAbsorb: [{ type: "apply-toxin", amount: 1, target: { kind: "most-damaged-ally" } }],
    },
  ),
];

export const FACE_CARDS: Readonly<Record<string, FaceCardDefinition>> = Object.fromEntries(
  DEFINITIONS.map((definition) => [definition.id, definition]),
);

export const getFaceCard = (id: FaceCardId): FaceCardDefinition | undefined => FACE_CARDS[id];

/** Catalogue order: starting naturals, untyped Shield, then named specials with printings. */
export const ALL_FACE_CARDS: readonly FaceCardDefinition[] = [
  ...DUAL_KIND_ATTRIBUTES.map((attribute) => FACE_CARDS[naturalFaceId(attribute)]!),
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
  FACE_CARDS[BLIGHT]!,
  FACE_CARDS[HEXBRAND]!,
  FACE_CARDS[CANKER]!,
  FACE_CARDS[GEAR]!,
  FACE_CARDS[CATALYST]!,
  FACE_CARDS[OVERCHARGE]!,
  FACE_CARDS[FLYWHEEL]!,
  FACE_CARDS[PISTON]!,
  FACE_CARDS[SHADOW_ECHO]!,
  FACE_CARDS[DRAIN]!,
  FACE_CARDS[SACRIFICE]!,
  FACE_CARDS[NIGHTWELL]!,
  FACE_CARDS[RUNEFLARE]!,
  FACE_CARDS[WARHORN]!,
  FACE_CARDS[CLEAVING_STRIKE]!,
  FACE_CARDS[BLOODSCENT]!,
  FACE_CARDS[GORE]!,
  FACE_CARDS[NEEDLE]!,
  FACE_CARDS[SEEP]!,
  FACE_CARDS[MARROW_ROT]!,
  FACE_CARDS[CINDER]!,
  FACE_CARDS[WASTING_BRAND]!,
];

/** Starting naturals only — Martial, Wild, Arcane, Luminar, plus Shield. */
export const BASIC_FACE_CARDS: readonly FaceCardDefinition[] = ALL_FACE_CARDS.slice(0, 5);

/** Named synthetic specials that have printed rules text. */
export const SPECIAL_FACE_CARDS: readonly FaceCardDefinition[] = ALL_FACE_CARDS.slice(5);

/**
 * Default six-symbol opening die for **engine tests** (`legacyStartingLayout`).
 * Live matches must pass per-loadout `startingDice` — do not fill this in
 * createMatch / persistence.
 */
export const DEFAULT_BASIC_LAYOUT: readonly SymbolType[] = [
  "martial",
  "wild",
  "arcane",
  "luminar",
  SHIELD,
  SHIELD,
];

/** @deprecated Test alias for `DEFAULT_BASIC_LAYOUT`. */
export const STARTING_DIE_SYMBOLS = DEFAULT_BASIC_LAYOUT;

const basicDieLayout = (): DieFaceLayout => [
  naturalFaceId("martial"),
  naturalFaceId("wild"),
  naturalFaceId("arcane"),
  naturalFaceId("luminar"),
  SHIELD_FACE_ID,
  SHIELD_FACE_ID,
];

/** Expands `DEFAULT_BASIC_LAYOUT` into two identical dice (engine tests only). */
export function legacyStartingLayout(): StartingDiceLayout {
  const die = basicDieLayout();
  return [die, die];
}

/** One named special + four dual-kind naturals + Shield. */
const openingDieWithSpecial = (special: FaceCardId): DieFaceLayout => [
  special,
  naturalFaceId("martial"),
  naturalFaceId("wild"),
  naturalFaceId("arcane"),
  naturalFaceId("luminar"),
  SHIELD_FACE_ID,
];

/**
 * Scenario / forge-test face pool. Unique ids (ledger: pooled xor installed).
 * Named specials cover Eclipse / Library / Contamination forge paths. The
 * builtin hotseat loadout uses `PROTOTYPE_FACE_DECK` instead.
 */
export const ENGINE_TEST_FACE_DECK: readonly FaceCardId[] = [
  SHADOW_ECHO,
  INFECTION,
  VENOM,
  GEAR,
  INSIGHT_RUNE,
  ARCANE_ECHO_FACE,
  RENDING_CLAW,
  BLADE_RAIN,
  CRUSH,
  FORBIDDEN_HERITAGE,
  PESTILENT_PLAGUE,
  SACRIFICE,
];

/**
 * Builtin aggro face deck — at most twelve unique cards, at most three per
 * attribute (bible §12). Crush and Needle start installed (`PROTOTYPE_STARTING_DICE`)
 * and therefore leave the pool. Leftover Martial / Wild / Toxin specials remain
 * forge targets. Naturals may be packed here for density swaps; opening basics
 * that are not listed do not count toward the 12.
 */
export const PROTOTYPE_FACE_DECK: readonly FaceCardId[] = [
  CRUSH,
  WARHORN,
  CLEAVING_STRIKE,
  BLOODSCENT,
  GORE,
  PRIMORDIAL_FURY,
  NEEDLE,
  SEEP,
  VENOM,
];

export const PROTOTYPE_STARTING_DICE: StartingDiceLayout = [
  openingDieWithSpecial(CRUSH),
  openingDieWithSpecial(NEEDLE),
];

/**
 * Builtin control face deck — twelve unique cards, ≤3 per attribute.
 * Nightwell and Resonance Rune open installed. Engine colors are Arcane and
 * Darkness only; Martial / Wild / Luminar specials are utility (shield hate,
 * peek, redirect), not a third manabase. Great Spark / Rekindle are empty-print
 * stubs — not pooled. Corruption specials are not pooled.
 */
/**
 * Builtin control face deck — twelve unique cards, ≤3 per attribute.
 * Nightwell and Resonance Rune open installed. Engine colors are Arcane and
 * Darkness only; Martial / Wild / Luminar specials are utility (shield hate,
 * peek, redirect), not a third manabase. Great Spark / Rekindle are empty-print
 * stubs — not pooled. Corruption specials are not pooled.
 */
export const CONTROL_FACE_DECK: readonly FaceCardId[] = [
  NIGHTWELL,
  SACRIFICE,
  SHADOW_ECHO,
  RESONANCE_RUNE,
  INSIGHT_RUNE,
  RUNEFLARE,
  CLEAVING_STRIKE,
  COMMAND,
  RENDING_CLAW,
  AEGIS,
  REVELATION,
  VITAL_SPARK,
];

export const CONTROL_STARTING_DICE: StartingDiceLayout = [
  openingDieWithSpecial(NIGHTWELL),
  openingDieWithSpecial(RESONANCE_RUNE),
];

/**
 * Builtin Tempo face deck — twelve unique cards, ≤3 per attribute.
 * Gear and Vital Spark open installed; leftover Mechanical / Luminar / Wild /
 * Toxin specials remain forgeable.
 */
export const TEMPO_FACE_DECK: readonly FaceCardId[] = [
  GEAR,
  PISTON,
  FLYWHEEL,
  VITAL_SPARK,
  AEGIS,
  REVELATION,
  INSTINCT,
  PACK,
  BLOODSCENT,
  NEEDLE,
  SEEP,
  VENOM,
];

export const TEMPO_STARTING_DICE: StartingDiceLayout = [
  openingDieWithSpecial(GEAR),
  openingDieWithSpecial(VITAL_SPARK),
];

/**
 * Builtin Combo Mechanical face deck — twelve unique cards, ≤3 per attribute.
 * Gear and Catalyst open installed; leftover Luminar / Wild / Toxin / Mech
 * specials remain Reforge targets.
 */
export const COMBO_MECHANICAL_FACE_DECK: readonly FaceCardId[] = [
  GEAR,
  CATALYST,
  OVERCHARGE,
  VITAL_SPARK,
  AEGIS,
  REVELATION,
  INSTINCT,
  PACK,
  BLOODSCENT,
  NEEDLE,
  SEEP,
  VENOM,
];

export const COMBO_MECHANICAL_STARTING_DICE: StartingDiceLayout = [
  openingDieWithSpecial(GEAR),
  openingDieWithSpecial(CATALYST),
];

/**
 * Builtin Burn face deck — Toxin stackers + Corruption DoT specials (≤3 per
 * attribute). Seep and Cinder open installed; leftover Marrow Rot / Spores
 * feed Virulent Rite, leftover Wasting Brand is the opponent-die install.
 * Hexbrand / Blight / Canker stay off this list (engine-hate, not ticks).
 */
export const BURN_FACE_DECK: readonly FaceCardId[] = [
  SEEP,
  MARROW_ROT,
  SPORES,
  CINDER,
  WASTING_BRAND,
];

export const BURN_STARTING_DICE: StartingDiceLayout = [
  openingDieWithSpecial(SEEP),
  openingDieWithSpecial(CINDER),
];
