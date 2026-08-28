import {
  DUAL_KIND_ATTRIBUTES,
  isAttribute,
  type Attribute,
} from "../model/attributes.js";
import type { DieFaceLayout, FaceCardDefinition, ForgeableFaceKind, StartingDiceLayout } from "../model/dice.js";
import { asFaceCardId, type FaceCardId } from "../model/ids.js";
import { SHIELD, type SymbolType } from "../model/symbols.js";
import faceOrder from "./faces/_order.json";
import { catalogueFromModules } from "./catalogueLoader.js";

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

const faceModules = import.meta.glob("./faces/face-*.json", { eager: true, import: "default" });
const loadedFaces = catalogueFromModules<FaceCardDefinition>(faceModules, faceOrder);

export const FACE_CARDS: Readonly<Record<string, FaceCardDefinition>> = loadedFaces.byId;
export const getFaceCard = (id: FaceCardId): FaceCardDefinition | undefined => FACE_CARDS[id];

/** Catalogue order: starting naturals, untyped Shield, then named specials with printings. */
export const ALL_FACE_CARDS: readonly FaceCardDefinition[] = loadedFaces.list;

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


export {
  AGGRO_FACE_DECK,
  AGGRO_STARTING_DICE,
  BURN_FACE_DECK,
  BURN_STARTING_DICE,
  COMBO_MECHANICAL_FACE_DECK,
  COMBO_MECHANICAL_STARTING_DICE,
  CONTROL_FACE_DECK,
  CONTROL_STARTING_DICE,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_STARTING_DICE,
  TEMPO_FACE_DECK,
  TEMPO_STARTING_DICE,
} from "./loadouts/index.js";
