import type { FaceCardDefinition } from "../model/dice.js";
import { asFaceCardId, type FaceCardId } from "../model/ids.js";
import faceOrder from "./faces/_order.json";
import { catalogueFromModules } from "./catalogueLoader.js";
import { lookupOverlayFace } from "./runtimeOverlay.js";

/**
 * Face cards backing die faces (spec `004` / `028` / `030`).
 * A face is a named card. It is not natural, synthetic, an attribute, or Shield.
 */

export const JAB: FaceCardId = asFaceCardId("face-natural-jab");

export const GRAPPLER_LARIAT: FaceCardId = asFaceCardId("face-natural-grappler-lariat");
export const GRAPPLER_COMMAND_GRAB: FaceCardId = asFaceCardId(
  "face-natural-grappler-command-grab",
);
export const GRAPPLER_GUARD: FaceCardId = asFaceCardId("face-natural-grappler-guard");
export const GRAPPLER_MOVEMENT: FaceCardId = asFaceCardId("face-natural-grappler-movement");
export const GRAPPLER_TAG: FaceCardId = asFaceCardId("face-natural-grappler-tag");

export const MAGNUS_GRAB: FaceCardId = asFaceCardId("face-natural-magnus-grab");
export const MAGNUS_LARIAT: FaceCardId = asFaceCardId("face-natural-magnus-lariat");
export const MAGNUS_HEAVY: FaceCardId = asFaceCardId("face-natural-magnus-heavy");
export const VEGA_KICK: FaceCardId = asFaceCardId("face-natural-vega-kick");
export const VEGA_DASH: FaceCardId = asFaceCardId("face-natural-vega-dash");
export const VEGA_RUSH: FaceCardId = asFaceCardId("face-natural-vega-rush");
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
