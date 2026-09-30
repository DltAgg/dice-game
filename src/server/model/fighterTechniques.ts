import type { FaceCardId } from "./ids.js";
import type { EffectDefinition } from "./effects.js";
import type { FaceType } from "./faceTypes.js";

/**
 * Two-face Fighter move (spec `029`). Not a combo chain and not spec `028`
 * `Technique` (face category).
 */
export type FighterTechniqueSecondary =
  | { readonly faceId: FaceCardId }
  | { readonly faceType: FaceType };

export interface FighterTechniqueDefinition {
  readonly id: string;
  readonly name: string;
  /** Showing face on the Fighter's own bound die that unlocks this move. */
  readonly primaryFaceId: FaceCardId;
  readonly secondary: FighterTechniqueSecondary;
  readonly effects: readonly EffectDefinition[];
  readonly rulesText?: string;
}

export function secondaryRequiresFaceId(
  secondary: FighterTechniqueSecondary,
): secondary is { readonly faceId: FaceCardId } {
  return "faceId" in secondary;
}

export function secondaryRequiresFaceType(
  secondary: FighterTechniqueSecondary,
): secondary is { readonly faceType: FaceType } {
  return "faceType" in secondary;
}
