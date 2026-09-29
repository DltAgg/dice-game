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
import { lookupOverlayFace } from "./runtimeOverlay.js";

/**
 * Face cards backing die faces (spec `004` / `028`).
 *
 * Basics are starting-die identity faces: natural faces for all eight
 * attributes, plus untyped Shield. Tag Skirmish named specials are the
 * technique faces (Strike, Guard, Heavy, …). Identity naturals omit
 * `technique`. Face `onAbsorb` stays empty.
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

export const TECHNIQUE_STRIKE: FaceCardId = asFaceCardId("face-natural-technique-strike");
export const TECHNIQUE_GUARD: FaceCardId = asFaceCardId("face-natural-technique-guard");
export const TECHNIQUE_HEAVY: FaceCardId = asFaceCardId("face-natural-technique-heavy");
export const TECHNIQUE_SPECIAL: FaceCardId = asFaceCardId("face-natural-technique-special");
export const TECHNIQUE_TAG: FaceCardId = asFaceCardId("face-natural-technique-tag");
export const TECHNIQUE_ASSIST: FaceCardId = asFaceCardId("face-natural-technique-assist");
export const TECHNIQUE_SIGNATURE: FaceCardId = asFaceCardId("face-natural-technique-signature");

const faceModules = import.meta.glob("./faces/face-*.json", { eager: true, import: "default" });
const loadedFaces = catalogueFromModules<FaceCardDefinition>(faceModules, faceOrder);

export const FACE_CARDS: Readonly<Record<string, FaceCardDefinition>> = loadedFaces.byId;
export const getFaceCard = (id: FaceCardId): FaceCardDefinition | undefined =>
  lookupOverlayFace(id) ?? FACE_CARDS[id];

/** Catalogue order: starting naturals, untyped Shield, then named specials. */
export const ALL_FACE_CARDS: readonly FaceCardDefinition[] = loadedFaces.list;

/** Starting naturals for all eight attributes, plus untyped Shield. */
export const BASIC_FACE_CARDS: readonly FaceCardDefinition[] = ALL_FACE_CARDS.slice(
  0,
  DUAL_KIND_ATTRIBUTES.length + 1,
);

/**
 * Packable named specials: Tag Skirmish technique faces. Everything after
 * the opening basics.
 */
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
 * Scenario / forge-test face pool: Tag Skirmish technique faces (unique ids).
 */
export const ENGINE_TEST_FACE_DECK: readonly FaceCardId[] = [
  TECHNIQUE_STRIKE,
  TECHNIQUE_GUARD,
  TECHNIQUE_HEAVY,
  TECHNIQUE_SPECIAL,
  TECHNIQUE_TAG,
  TECHNIQUE_ASSIST,
];
