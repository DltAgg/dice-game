/**
 * Strength and strike of a hit or Technique. Not a face type (attack, grab,
 * movement) and not a sequence role (starter, extender, finisher).
 */
export const HIT_STRENGTHS = ["light", "medium", "heavy"] as const;

export type HitStrength = (typeof HIT_STRENGTHS)[number];

export const HIT_TYPES = ["kick", "punch"] as const;

export type HitType = (typeof HIT_TYPES)[number];

export function formatHitClass(hit: {
  readonly hitStrength: HitStrength;
  readonly hitType: HitType;
}): string {
  const strength = hit.hitStrength.charAt(0).toUpperCase() + hit.hitStrength.slice(1);
  const strike = hit.hitType.charAt(0).toUpperCase() + hit.hitType.slice(1);
  return `${strength} ${strike}`;
}
