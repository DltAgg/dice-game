/**
 * Combat-toolkit faces (spec `028`). A showing technique answers “what can
 * this fighter do right now?”, not a mana pip.
 */
export const TECHNIQUES = [
  "strike",
  "guard",
  "heavy",
  "special",
  "tag",
  "assist",
  "signature",
  "combo",
  "dodge",
  "counter",
] as const;

export type Technique = (typeof TECHNIQUES)[number];

export function isTechnique(value: string): value is Technique {
  return (TECHNIQUES as readonly string[]).includes(value);
}
