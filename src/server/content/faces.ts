import type { FaceCardDefinition } from "../model/dice.js";
import { asFaceCardId, type FaceCardId } from "../model/ids.js";
import faceOrder from "./faces/_order.json";
import { catalogueFromModules } from "./catalogueLoader.js";
import { lookupOverlayFace } from "./runtimeOverlay.js";

/**
 * Face cards backing die faces (spec `004` / `028` / `030`).
 * A face is a named card. It is not natural, synthetic, an attribute, or Shield.
 */

export const JAB: FaceCardId = asFaceCardId("face-jab");

export const GRAB: FaceCardId = asFaceCardId("face-grab");
export const VEGA_QUICK_GRAB: FaceCardId = asFaceCardId("face-quick-grab");
export const MAGNUS_POWER_GRAB: FaceCardId = asFaceCardId("face-power-grab");
export const LARIAT: FaceCardId = asFaceCardId("face-lariat");
export const HEAVY: FaceCardId = asFaceCardId("face-heavy");
export const KICK: FaceCardId = asFaceCardId("face-kick");
export const VEGA_FLASH_KICK: FaceCardId = asFaceCardId("face-flash-kick");
export const MAGNUS_BOOT_KICK: FaceCardId = asFaceCardId("face-boot-kick");
export const DASH: FaceCardId = asFaceCardId("face-dash");
export const RUSH: FaceCardId = asFaceCardId("face-rush");
export const RYU_FORWARD_RUSH: FaceCardId = asFaceCardId("face-forward-rush");
export const VEGA_BLITZ_RUSH: FaceCardId = asFaceCardId("face-blitz-rush");
export const MAGNUS_BULL_RUSH: FaceCardId = asFaceCardId("face-bull-rush");
export const PROJECTILE: FaceCardId = asFaceCardId("face-projectile");
export const FOCUS: FaceCardId = asFaceCardId("face-focus");
export const CHARGE: FaceCardId = asFaceCardId("face-charge");

/** Combination probes. Not on a Fighter's base die. */
export const SNAP: FaceCardId = asFaceCardId("face-snap");
export const HOOK: FaceCardId = asFaceCardId("face-hook");
export const UPPERCUT: FaceCardId = asFaceCardId("face-uppercut");
export const HAYMAKER: FaceCardId = asFaceCardId("face-haymaker");
export const SHIN: FaceCardId = asFaceCardId("face-shin");
export const SWEEP: FaceCardId = asFaceCardId("face-sweep");
export const KNEE: FaceCardId = asFaceCardId("face-knee");
export const CRESCENT: FaceCardId = asFaceCardId("face-crescent");
export const STOMP: FaceCardId = asFaceCardId("face-stomp");
export const ROUNDHOUSE: FaceCardId = asFaceCardId("face-roundhouse");

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
