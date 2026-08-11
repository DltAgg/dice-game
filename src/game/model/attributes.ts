/**
 * The eight attributes named in bible §26. Their strategic identities (§29)
 * are content concerns; the engine treats an attribute as an opaque tag.
 */
export const ATTRIBUTES = [
  "martial",
  "wild",
  "toxin",
  "arcane",
  "luminar",
  "mechanical",
  "corruption",
  "darkness",
] as const;

export type Attribute = (typeof ATTRIBUTES)[number];

export const isAttribute = (value: string): value is Attribute =>
  (ATTRIBUTES as readonly string[]).includes(value);
