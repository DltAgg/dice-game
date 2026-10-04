import type { FaceCardId } from "./ids.js";
import type { EffectDefinition } from "./effects.js";
import type { FaceType } from "./faceTypes.js";
import type { HitStrength, HitType } from "./hitClass.js";
import type { SequenceRole } from "./offensive.js";

/**
 * Two-face Fighter move (spec `029`). Not a combo chain and not spec `028`
 * `Technique` (face category).
 */
/**
 * The other rolled face. A named face, any face of a type, any face with
 * that sequence role, or a strike class such as a light kick.
 * Strength and kick/punch may be required together or one at a time.
 */
export type FighterTechniqueSecondary =
  | { readonly faceId: FaceCardId }
  | { readonly faceType: FaceType }
  | { readonly sequenceRole: SequenceRole }
  | { readonly hitStrength: HitStrength; readonly hitType: HitType }
  | { readonly hitStrength: HitStrength }
  | { readonly hitType: HitType };

export interface FighterTechniqueDefinition {
  readonly id: string;
  readonly name: string;
  /** Showing face on the Fighter's own bound die that unlocks this move. */
  readonly primaryFaceId: FaceCardId;
  /** Strength of this Technique. Paired with `hitType`. */
  readonly hitStrength: HitStrength;
  /** Kick or punch. Paired with `hitStrength`. */
  readonly hitType: HitType;
  readonly secondary: FighterTechniqueSecondary;
  readonly effects: readonly EffectDefinition[];
  /**
   * When set, `USE_TECHNIQUE` is a sequence action (spec `030`). The technique
   * role wins over any `sequenceRole` on the primary face. Omit for spec `029`
   * immediate resolution.
   */
  readonly sequenceRole?: SequenceRole;
  /** Ends the sequence after it resolves. A finisher does this even when omitted. */
  readonly endsSequence?: boolean;
  /** Passes initiative after it resolves. Not implied by `endsSequence`. */
  readonly passesInitiative?: boolean;
  /** Checked at declare and spent when the sequence link conducts. */
  readonly meterCost?: number;
  /** Granted when the sequence link conducts, after `meterCost`. */
  readonly meterGain?: number;
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

export function secondaryRequiresSequenceRole(
  secondary: FighterTechniqueSecondary,
): secondary is { readonly sequenceRole: SequenceRole } {
  return "sequenceRole" in secondary;
}

export function secondaryRequiresHitClass(
  secondary: FighterTechniqueSecondary,
): secondary is
  | { readonly hitStrength: HitStrength; readonly hitType: HitType }
  | { readonly hitStrength: HitStrength }
  | { readonly hitType: HitType } {
  return "hitStrength" in secondary || "hitType" in secondary;
}
