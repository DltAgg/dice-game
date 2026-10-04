/**
 * Named-action face types (spec `029`). Extensible: add a string to
 * `FACE_TYPES` without rewriting combat resolution. Types have **no**
 * inherent damage or legality — the named face owns effects.
 *
 * Distinct from `Technique` (spec `028` toolkit category: strike/guard/…).
 */
export const FACE_TYPES = [
  "attack",
  "grab",
  "guard",
  "movement",
  "projectile",
  "tag",
] as const;

export type FaceType = (typeof FACE_TYPES)[number];

export function isFaceType(value: string): value is FaceType {
  return (FACE_TYPES as readonly string[]).includes(value);
}
