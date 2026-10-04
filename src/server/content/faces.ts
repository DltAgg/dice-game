import type { DieFaceLayout, FaceCardDefinition, StartingDiceLayout } from "../model/dice.js";
import { asFaceCardId, type FaceCardId } from "../model/ids.js";
import faceOrder from "./faces/_order.json";
import { catalogueFromModules } from "./catalogueLoader.js";
import { lookupOverlayFace } from "./runtimeOverlay.js";

/**
 * Face cards backing die faces (spec `004` / `028` / `030`).
 * A face is a named card. It is not natural, synthetic, an attribute, or Shield.
 */

export const TECHNIQUE_STRIKE: FaceCardId = asFaceCardId("face-natural-technique-strike");
export const TECHNIQUE_GUARD: FaceCardId = asFaceCardId("face-natural-technique-guard");
export const TECHNIQUE_HEAVY: FaceCardId = asFaceCardId("face-natural-technique-heavy");
export const TECHNIQUE_SPECIAL: FaceCardId = asFaceCardId("face-natural-technique-special");
export const TECHNIQUE_TAG: FaceCardId = asFaceCardId("face-natural-technique-tag");
export const TECHNIQUE_ASSIST: FaceCardId = asFaceCardId("face-natural-technique-assist");
export const TECHNIQUE_SIGNATURE: FaceCardId = asFaceCardId("face-natural-technique-signature");

export const GRAPPLER_LARIAT: FaceCardId = asFaceCardId("face-natural-grappler-lariat");
export const GRAPPLER_JAB: FaceCardId = asFaceCardId("face-natural-grappler-jab");
export const GRAPPLER_COMMAND_GRAB: FaceCardId = asFaceCardId(
  "face-natural-grappler-command-grab",
);
export const GRAPPLER_GUARD: FaceCardId = asFaceCardId("face-natural-grappler-guard");
export const GRAPPLER_MOVEMENT: FaceCardId = asFaceCardId("face-natural-grappler-movement");
export const GRAPPLER_TAG: FaceCardId = asFaceCardId("face-natural-grappler-tag");

export const MAGNUS_JAB: FaceCardId = asFaceCardId("face-natural-magnus-jab");
export const MAGNUS_GRAB: FaceCardId = asFaceCardId("face-natural-magnus-grab");
export const MAGNUS_LARIAT: FaceCardId = asFaceCardId("face-natural-magnus-lariat");
export const MAGNUS_HEAVY: FaceCardId = asFaceCardId("face-natural-magnus-heavy");
export const VEGA_JAB: FaceCardId = asFaceCardId("face-natural-vega-jab");
export const VEGA_KICK: FaceCardId = asFaceCardId("face-natural-vega-kick");
export const VEGA_DASH: FaceCardId = asFaceCardId("face-natural-vega-dash");
export const VEGA_RUSH: FaceCardId = asFaceCardId("face-natural-vega-rush");
export const RYU_JAB: FaceCardId = asFaceCardId("face-natural-ryu-jab");
export const RYU_PROJECTILE: FaceCardId = asFaceCardId("face-natural-ryu-projectile");
export const RYU_FOCUS: FaceCardId = asFaceCardId("face-natural-ryu-focus");
export const RYU_CHARGE: FaceCardId = asFaceCardId("face-natural-ryu-charge");

const faceModules = import.meta.glob("./faces/face-*.json", { eager: true, import: "default" });
const loadedFaces = catalogueFromModules<FaceCardDefinition>(faceModules, faceOrder);

export const FACE_CARDS: Readonly<Record<string, FaceCardDefinition>> = loadedFaces.byId;
export const getFaceCard = (id: FaceCardId): FaceCardDefinition | undefined =>
  lookupOverlayFace(id) ?? FACE_CARDS[id];

/** Catalogue order. */
export const ALL_FACE_CARDS: readonly FaceCardDefinition[] = loadedFaces.list;

/** There is no blank Shield face. Every catalogue face is a named face. */
export const BASIC_FACE_CARDS: readonly FaceCardDefinition[] = [];

/** Named faces a deck can pack. */
export const SPECIAL_FACE_CARDS: readonly FaceCardDefinition[] = ALL_FACE_CARDS;

const basicDieLayout = (): DieFaceLayout => [
  TECHNIQUE_STRIKE,
  TECHNIQUE_GUARD,
  TECHNIQUE_HEAVY,
  TECHNIQUE_SPECIAL,
  TECHNIQUE_TAG,
  TECHNIQUE_ASSIST,
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
