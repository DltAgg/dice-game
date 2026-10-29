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

export const GRAB: FaceCardId = asFaceCardId("face-natural-grab");
export const LARIAT: FaceCardId = asFaceCardId("face-natural-lariat");
export const HEAVY: FaceCardId = asFaceCardId("face-natural-heavy");
export const KICK: FaceCardId = asFaceCardId("face-natural-kick");
export const DASH: FaceCardId = asFaceCardId("face-natural-dash");
export const RUSH: FaceCardId = asFaceCardId("face-natural-rush");
export const PROJECTILE: FaceCardId = asFaceCardId("face-natural-projectile");
export const FOCUS: FaceCardId = asFaceCardId("face-natural-focus");
export const CHARGE: FaceCardId = asFaceCardId("face-natural-charge");

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
