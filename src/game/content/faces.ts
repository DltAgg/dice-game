import {
  DUAL_KIND_ATTRIBUTES,
  isAttribute,
  type Attribute,
} from "../model/attributes.js";
import type { DieFaceLayout, FaceCardDefinition, ForgeableFaceKind, StartingDiceLayout } from "../model/dice.js";
import type { EffectDefinition } from "../model/effects.js";
import { asFaceCardId, type FaceCardId } from "../model/ids.js";
import { SHIELD, type SymbolType } from "../model/symbols.js";

/**
 * Face cards from the Figma `Face card` page (`2:13`), plus named synthetics
 * staged from `synthetic_faces.csv`. Translated to English.
 *
 * Basics are starting-die identity faces: natural faces for all eight
 * attributes, plus untyped Shield. Synthetics remain **named specials only**
 * — never blank `face-synthetic-<attr>` generics. Dual-timing print uses
 * `On roll:` / `On absorb:`; fill `onRoll` / `onAbsorb` only for clauses the
 * engine can resolve — leave the other array empty and keep the deferred
 * clause in `rulesText` (see DEFERRED_CATALOGUE).
 */

const face = (definition: FaceCardDefinition): FaceCardDefinition => definition;

export const naturalFaceId = (attribute: Attribute): FaceCardId =>
  asFaceCardId(`face-natural-${attribute}`);

/**
 * Starting-die identity only: naturals for every attribute. There is no
 * canonical `face-synthetic-<attr>` — forging names a special from the pool.
 */
export const faceIdFor = (kind: ForgeableFaceKind, attribute: Attribute): FaceCardId => {
  if (kind === "natural") {
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
  if (isAttribute(symbol)) return naturalFaceId(symbol);
  throw new Error(
    `starting dice have no identity face for "${symbol}"; Shield and attribute naturals are the only basics`,
  );
};

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
export const PACK_SHARE: FaceCardId = asFaceCardId("face-synthetic-pack-share");
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
    symbol: "mechanical",
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
    rulesText: "On roll: [Strip 3 Shield].",
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
    rulesText: "On roll: [Empower 1].",
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
      "Cannot be included on opening dice.\nOn roll: opponent [Draw 1]. [Retain].\nThis face cannot be replaced by forging.\nActivated: pay Energy equal to 2 plus 1 per Corruption face on this die to remove this face.",
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
      "Cannot be included on opening dice.\nOn roll: [Mark 1 Pestilence]. At 2 Pestilence: remove them and forge 1 Pestilent Plague onto an adjacent slot of this die.\nCannot be replaced by forging for 4 of this die's owner's turns. Whenever a Pestilent Plague is forged onto this die, reset the remaining lock to 4 on every Pestilent Plague on this die.\nActivated: pay Energy equal to 2 plus 1 per Corruption face on this die to remove this face.",
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
    "On roll: [Draw 1].\nOn absorb: [Insight 2].",
    { onRoll: [{ type: "draw-cards", amount: 1 }], onAbsorb: [{ type: "look-top-deck", amount: 2 }] },
  ),
  namedSynthetic(
    CONVERSION_RUNE,
    "Conversion Rune",
    "arcane",
    "On roll: you may [Convert 1] this Arcane into any Natural.\nOn absorb: [Gain 1 Energy].",
    {
      onRoll: [{ type: "convert-symbols", amount: 1, sourceOnly: true }],
      onAbsorb: [{ type: "gain-energy", amount: 1 }],
    },
  ),
  namedSynthetic(
    RESONANCE_RUNE,
    "Resonance Rune",
    "arcane",
    "On roll: if there is another Arcane symbol in the Pool, [Gain 1 Energy].\nOn absorb: [Resonance].",
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
    "On roll: [Heal 1] on an allied creature.\nOn absorb: [Prevent 1] on an allied creature.",
    {
      onRoll: [{ type: "heal", amount: 1, target: { kind: "most-damaged-ally" } }],
      onAbsorb: [
        { type: "grant-damage-prevent", amount: 1, target: { kind: "choose-ally" } },
      ],
    },
  ),
  namedSynthetic(
    AEGIS,
    "Aegis",
    "luminar",
    "On roll: [Generate 1 Shield].\nOn absorb: choose an allied creature; redirect up to 2 damage that would be dealt to another allied creature to that creature.",
    {
      onRoll: [{ type: "generate-symbol", symbol: SHIELD, amount: 1 }],
      onAbsorb: [{ type: "arm-redirect-damage", amount: 2, target: { kind: "choose-ally" } }],
    },
  ),
  namedSynthetic(
    REVELATION,
    "Revelation",
    "luminar",
    "On roll: [Generate 1 Luminar].\nOn absorb: [Heal 2] on a creature that has less than half its Life remaining.",
    {
      onRoll: [{ type: "generate-symbol", symbol: "luminar", amount: 1 }],
      onAbsorb: [{ type: "heal", amount: 2, target: { kind: "choose-ally-damage-over-half" } }],
    },
  ),
  namedSynthetic(
    INSTINCT,
    "Instinct",
    "wild",
    "On roll: [Empower 1] on an allied creature.\nOn absorb: [Empower 2] on an allied creature.",
    {
      onRoll: [
        { type: "grant-next-attack-bonus", amount: 1, target: { kind: "choose-ally" } },
      ],
      onAbsorb: [
        { type: "grant-next-attack-bonus", amount: 2, target: { kind: "choose-ally" } },
      ],
    },
  ),
  namedSynthetic(
    PRIMORDIAL_FURY,
    "Primordial Fury",
    "wild",
    "On roll: if an allied creature has attacked this turn, [Gain 1 Energy].\nOn absorb: [Empower 1].",
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
    "On roll: if you control another adjacent creature, [Generate 1 Wild].\nOn absorb: [Empower 1] on another allied creature.",
    {
      onRoll: [
        {
          type: "conditional",
          when: { type: "has-adjacent-ally" },
          then: [{ type: "generate-symbol", symbol: "wild", amount: 1 }],
        },
      ],
      onAbsorb: [
        { type: "grant-next-attack-bonus", amount: 1, target: { kind: "choose-ally-other" } },
      ],
    },
  ),
  namedSynthetic(
    PACK_SHARE,
    "Pack Share",
    "wild",
    "On absorb: [Generate 1 Wild].",
    {
      onAbsorb: [{ type: "generate-symbol", symbol: "wild", amount: 1 }],
    },
  ),
  namedSynthetic(
    COMMAND,
    "Command",
    "martial",
    "On roll: [Reposition].\nOn absorb: [Strip 1 Shield].",
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
    "On roll: [Empower 1].\nOn absorb: [Empower 2].",
    {
      onRoll: [{ type: "next-attack-bonus", amount: 1 }],
      onAbsorb: [{ type: "next-attack-bonus", amount: 2 }],
    },
  ),
  namedSynthetic(
    FORMATION,
    "Formation",
    "martial",
    "On roll: if you control a frontline creature, [Gain 1 Energy].\nOn absorb: [Mark 1 Shield] another allied frontline creature.",
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
          type: "grant-shield",
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
    "On roll: [Mark 1 Toxin].\nOn absorb: a chosen enemy creature takes +1 damage the next time it takes damage.",
    {
      onRoll: [{ type: "apply-toxin", amount: 1, target: { kind: "choose-enemy" } }],
      onAbsorb: [
        { type: "arm-next-incoming-bonus", amount: 1, target: { kind: "choose-enemy" } },
      ],
    },
  ),
  namedSynthetic(
    SPORES,
    "Spores",
    "toxin",
    "On roll: if an enemy creature already has Toxin, [Mark 1 Toxin].\nOn absorb: [Heal 1] on an allied creature that has Toxin.",
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
    "On roll: choose an enemy creature with Toxin; until its next turn, it cannot receive more than 1 Toxin marker.\nOn absorb: [Strip any Toxin]. [Strike equal].",
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
    "On roll: [Mark 1 Corruption].\nOn absorb: choose an opposing Corrupted face; it cannot be used as a resource this turn.",
    {
      onRoll: [{ type: "add-corruption-marker", amount: 1 }],
      onAbsorb: [{ type: "lock-corrupted-face-resource" }],
    },
  ),
  namedSynthetic(
    INFECTION,
    "Infection",
    "corruption",
    "On roll: if the opponent has a Corrupted face, [Mark 1 Corruption] on another face of the same die.\nOn absorb: [Lose 1 Energy].",
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
    "On roll: [Generate 1 Corruption].\nOn absorb: [Destroy Ritual].",
    {
      onRoll: [{ type: "generate-symbol", symbol: "corruption", amount: 1 }],
      onAbsorb: [{ type: "destroy-ritual", target: { kind: "choose-opponent-ritual" } }],
    },
  ),
  namedSynthetic(
    HEXBRAND,
    "Hexbrand",
    "corruption",
    "On roll: you choose an enemy creature; discard 1 attribute from that creature's controller's pile.\nOn absorb: [Destroy Equipment].",
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
    "On roll: [Mark 1 Corruption].\nOn absorb: [Forge 1 Synthetic Corruption] on the opponent's die.",
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
    "On roll: if you have another Synthetic symbol in the Pool, [Gain 1 Energy].\nOn absorb: [Discount 1] forge.",
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
    "On roll: you may gain 1 additional Energy; if you do, this face becomes Overcharged and cannot generate its effect on the next roll.\nOn absorb: [Double].",
    {
      onRoll: [{ type: "optional-overcharge-energy", amount: 1 }],
      onAbsorb: [{ type: "arm-resolve-next-face-effect-twice" }],
    },
  ),
  namedSynthetic(
    FLYWHEEL,
    "Flywheel",
    "mechanical",
    "On roll: [Gain 1 Energy].\nOn absorb: [Generate 1 Shield].",
    {
      onRoll: [{ type: "gain-energy", amount: 1 }],
      onAbsorb: [{ type: "generate-symbol", symbol: SHIELD, amount: 1 }],
    },
  ),
  namedSynthetic(
    PISTON,
    "Piston",
    "mechanical",
    "On roll: [Generate 1 Mechanical].\nOn absorb: [Gain 1 Energy].",
    {
      onRoll: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
      onAbsorb: [{ type: "gain-energy", amount: 1 }],
    },
  ),
  namedSynthetic(
    SHADOW_ECHO,
    "Shadow Echo",
    "darkness",
    "On roll: you may [Discard 1]; if you do, [Draw 1].\nOn absorb: [Recall 1] that costs 2 or less.",
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
    "On roll: [Lose 1 Energy]; you do not gain that Energy.\nOn absorb: [Move 1 Energy].",
    {
      onRoll: [{ type: "lose-energy", amount: 1, player: "opponent" }],
      onAbsorb: [{ type: "transfer-energy", amount: 1 }],
    },
  ),
  namedSynthetic(
    SACRIFICE,
    "Sacrifice",
    "darkness",
    "On roll: [Discard 1]; if you do, [Gain 2 Energy].\nOn absorb: [Discard 1] to [Strike 2].",
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
    "On roll: [Generate 1 Darkness].\nOn absorb: discard 1 attribute from the opponent's pile (choose an enemy creature).",
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
    "On roll: [Strike 1].\nOn absorb: [Draw 1].",
    {
      onRoll: [{ type: "damage", amount: 1, target: { kind: "choose-enemy" } }],
      onAbsorb: [{ type: "draw-cards", amount: 1 }],
    },
  ),
  namedSynthetic(
    WARHORN,
    "Warhorn",
    "martial",
    "On roll: [Generate 1 Martial].\nOn absorb: [Empower 1].",
    {
      onRoll: [{ type: "generate-symbol", symbol: "martial", amount: 1 }],
      onAbsorb: [{ type: "next-attack-bonus", amount: 1 }],
    },
  ),
  namedSynthetic(
    CLEAVING_STRIKE,
    "Cleaving Strike",
    "martial",
    "On roll: [Strip 2 Shield].\nOn absorb: [Empower 1].",
    {
      onRoll: [{ type: "remove-shield", amount: 2, target: { kind: "most-shielded-enemy" } }],
      onAbsorb: [{ type: "next-attack-bonus", amount: 1 }],
    },
  ),
  namedSynthetic(
    BLOODSCENT,
    "Bloodscent",
    "wild",
    "On roll: [Empower 1].\nOn absorb: [Generate 1 Wild].",
    {
      onRoll: [{ type: "next-attack-bonus", amount: 1 }],
      onAbsorb: [{ type: "generate-symbol", symbol: "wild", amount: 1 }],
    },
  ),
  namedSynthetic(
    GORE,
    "Gore",
    "wild",
    "On roll: [Strike 1].\nOn absorb: [Empower 1].",
    {
      onRoll: [{ type: "damage", amount: 1, target: { kind: "choose-enemy" } }],
      onAbsorb: [{ type: "next-attack-bonus", amount: 1 }],
    },
  ),
  namedSynthetic(
    NEEDLE,
    "Needle",
    "toxin",
    "On roll: [Empower 1].\nOn absorb: [Mark 1 Toxin].",
    {
      onRoll: [{ type: "next-attack-bonus", amount: 1 }],
      onAbsorb: [{ type: "apply-toxin", amount: 1, target: { kind: "choose-enemy" } }],
    },
  ),
  namedSynthetic(
    SEEP,
    "Seep",
    "toxin",
    "On roll: [Generate 1 Toxin].\nOn absorb: [Mark 1 Toxin on attacks].",
    {
      onRoll: [{ type: "generate-symbol", symbol: "toxin", amount: 1 }],
      onAbsorb: [{ type: "arm-attack-toxin", amount: 1 }],
    },
  ),
  namedSynthetic(
    MARROW_ROT,
    "Marrow Rot",
    "toxin",
    "On roll: [Mark 1 Toxin].\nOn absorb: [Mark 1 Toxin] a chosen enemy that already has Toxin.",
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
    "On roll: [Strike 1].\nOn absorb: [Mark 1 Toxin].",
    {
      onRoll: [{ type: "damage", amount: 1, target: { kind: "choose-enemy" } }],
      onAbsorb: [{ type: "apply-toxin", amount: 1, target: { kind: "choose-enemy" } }],
    },
  ),
  namedSynthetic(
    WASTING_BRAND,
    "Wasting Brand",
    "corruption",
    "On roll: [Strike 1] your creature with the most damage.\nOn absorb: [Mark 1 Toxin] your creature with the most damage.",
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
  FACE_CARDS[PACK_SHARE]!,
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

/** Starting naturals for all eight attributes, plus untyped Shield. */
export const BASIC_FACE_CARDS: readonly FaceCardDefinition[] = ALL_FACE_CARDS.slice(
  0,
  DUAL_KIND_ATTRIBUTES.length + 1,
);

/** Named synthetic specials that have printed rules text. */
export const SPECIAL_FACE_CARDS: readonly FaceCardDefinition[] = ALL_FACE_CARDS.slice(
  DUAL_KIND_ATTRIBUTES.length + 1,
);

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
 * Builtin Aggro face deck — Martial + Wild only (≤3 per attribute → max 6).
 * Crush and Bloodscent open installed (`PROTOTYPE_STARTING_DICE`). Leftover
 * Martial / Wild pressure specials remain Temper / Untamed forge targets.
 * Pack Share is the Wild absorb→Generate special (pile-era; former pack-feed
 * copy retired). No Toxin faces (Needle / Seep / Venom / toxin naturals).
 * Opening Martial / Wild naturals are not listed here — they do not consume the 12.
 */
export const PROTOTYPE_FACE_DECK: readonly FaceCardId[] = [
  CRUSH,
  WARHORN,
  CLEAVING_STRIKE,
  BLOODSCENT,
  GORE,
  PACK_SHARE,
];

/**
 * Aggro opening die: one Martial or Wild pressure special + Martial/Wild
 * naturals densified + Shield. Obeys starting caps (1 Shield, ≤2 synthetics /
 * on-roll per die, ≤4 same attribute).
 */
const openingDieMartialWild = (special: FaceCardId): DieFaceLayout => [
  special,
  naturalFaceId("martial"),
  naturalFaceId("martial"),
  naturalFaceId("wild"),
  naturalFaceId("wild"),
  SHIELD_FACE_ID,
];

export const AGGRO_STARTING_DICE: StartingDiceLayout = [
  openingDieMartialWild(CRUSH),
  openingDieMartialWild(BLOODSCENT),
];

/**
 * Builtin control face deck — twelve unique cards, ≤3 per attribute.
 * Nightwell and Resonance Rune open installed. Engine colors are Arcane and
 * Darkness only; Martial / Wild / Luminar specials are utility (shield hate,
 * redirect), not a third manabase. Great Spark / Rekindle are empty-print
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


/**
 * Generic helper for non-Aggro builtins / tests: one named special + the old
 * four-color natural paint (Martial/Wild/Arcane/Luminar) + Shield. Aggro uses
 * `openingDieMartialWild` instead — do not reuse this for Martial/Wild Aggro.
 */
const openingDieArcaneDarkness = (special: FaceCardId): DieFaceLayout => [
  special,
  naturalFaceId("arcane"),
  naturalFaceId("arcane"),
  naturalFaceId("darkness"),
  naturalFaceId("darkness"),
  SHIELD_FACE_ID,
];

export const CONTROL_STARTING_DICE: StartingDiceLayout = [
  openingDieArcaneDarkness(NIGHTWELL),
  openingDieArcaneDarkness(RESONANCE_RUNE),
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


/**
 * Generic helper for non-Aggro builtins / tests: one named special + the old
 * four-color natural paint (Martial/Wild/Arcane/Luminar) + Shield. Aggro uses
 * `openingDieMartialWild` instead — do not reuse this for Martial/Wild Aggro.
 */
const openingDieMechLuminar = (special: FaceCardId): DieFaceLayout => [
  special,
  naturalFaceId("mechanical"),
  naturalFaceId("mechanical"),
  naturalFaceId("luminar"),
  naturalFaceId("luminar"),
  SHIELD_FACE_ID,
];

export const TEMPO_STARTING_DICE: StartingDiceLayout = [
  openingDieMechLuminar(GEAR),
  openingDieMechLuminar(VITAL_SPARK),
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
  openingDieMechLuminar(GEAR),
  openingDieMechLuminar(CATALYST),
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


/**
 * Generic helper for non-Aggro builtins / tests: one named special + the old
 * four-color natural paint (Martial/Wild/Arcane/Luminar) + Shield. Aggro uses
 * `openingDieMartialWild` instead — do not reuse this for Martial/Wild Aggro.
 */
const openingDieToxinCorruption = (special: FaceCardId): DieFaceLayout => [
  special,
  naturalFaceId("toxin"),
  naturalFaceId("toxin"),
  naturalFaceId("corruption"),
  naturalFaceId("corruption"),
  SHIELD_FACE_ID,
];

export const BURN_STARTING_DICE: StartingDiceLayout = [
  openingDieToxinCorruption(SEEP),
  openingDieToxinCorruption(CINDER),
];
