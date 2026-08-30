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
 * Face cards backing die faces (spec `004`).
 *
 * Basics are starting-die identity faces: natural faces for all eight
 * attributes, plus untyped Shield. Synthetics are **named specials only**
 * — never blank `face-synthetic-<attr>` generics. Dual-timing print uses
 * `On roll:` / `On absorb:`; fill `onRoll` / `onAbsorb` only for clauses the
 * engine can resolve — leave the other array empty and keep the deferred
 * clause in `rulesText` (see DEFERRED_CATALOGUE).
 *
 * The special pool holds the Mechanical + Luminar Tempo set and the
 * Arcane + Darkness Control set (3 named specials per attribute, so a face
 * deck can run either pair inside the 3-per-attribute cap).
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

/** Mechanical: own-die reconstruction and forge discounts. */
export const COGTOOTH: FaceCardId = asFaceCardId("face-synthetic-cogtooth");
export const GEAR_TRAIN: FaceCardId = asFaceCardId("face-synthetic-gear-train");
export const MAINSPRING: FaceCardId = asFaceCardId("face-synthetic-mainspring");

/** Luminar: shields, sustain, and the Luminar → Mechanical hand-off. */
export const HALO_LAMP: FaceCardId = asFaceCardId("face-synthetic-halo-lamp");
export const LUCENT_CHOIR: FaceCardId = asFaceCardId("face-synthetic-lucent-choir");
export const SUNWARD_LENS: FaceCardId = asFaceCardId("face-synthetic-sunward-lens");

/** Arcane: deck-top manipulation and face-sourced chip damage. */
export const AUGUR_GLASS: FaceCardId = asFaceCardId("face-synthetic-augur-glass");
export const SIGIL_FLARE: FaceCardId = asFaceCardId("face-synthetic-sigil-flare");
export const WARD_LATTICE: FaceCardId = asFaceCardId("face-synthetic-ward-lattice");

/** Darkness: mill ticks and graveyard value. */
export const GLOOMWELL: FaceCardId = asFaceCardId("face-synthetic-gloomwell");
export const OSSUARY: FaceCardId = asFaceCardId("face-synthetic-ossuary");
export const PYRE_OF_NAMES: FaceCardId = asFaceCardId("face-synthetic-pyre-of-names");

const faceModules = import.meta.glob("./faces/face-*.json", { eager: true, import: "default" });
const loadedFaces = catalogueFromModules<FaceCardDefinition>(faceModules, faceOrder);

export const FACE_CARDS: Readonly<Record<string, FaceCardDefinition>> = loadedFaces.byId;
export const getFaceCard = (id: FaceCardId): FaceCardDefinition | undefined => FACE_CARDS[id];

/** Catalogue order: starting naturals, untyped Shield, then named specials. */
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
 * Scenario / forge-test face pool. Unique ids (ledger: pooled xor installed);
 * 3 Mechanical + 3 Luminar stays inside the per-attribute face-deck cap.
 */
export const ENGINE_TEST_FACE_DECK: readonly FaceCardId[] = [
  COGTOOTH,
  GEAR_TRAIN,
  MAINSPRING,
  HALO_LAMP,
  LUCENT_CHOIR,
  SUNWARD_LENS,
];
