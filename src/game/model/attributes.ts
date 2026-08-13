/**
 * The eight attributes named in bible §26. Their strategic identities (§29)
 * are content concerns; the engine treats an attribute as an opaque tag.
 *
 * Face-kind policy:
 * - Dual-kind (Martial, Wild, Arcane, Luminar): natural identity faces and
 *   synthetics are both legal.
 * - Synthetic-only (Toxin, Mechanical, Corruption, Darkness): no natural faces
 *   or natural forge regions — only synthetics.
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

/** Attributes that may appear as natural faces and as synthetics. */
export const DUAL_KIND_ATTRIBUTES = [
  "martial",
  "wild",
  "arcane",
  "luminar",
] as const satisfies readonly Attribute[];

export type DualKindAttribute = (typeof DUAL_KIND_ATTRIBUTES)[number];

/** Attributes that exist only as synthetic faces (no natural identity face). */
export const SYNTHETIC_ONLY_ATTRIBUTES = [
  "toxin",
  "mechanical",
  "corruption",
  "darkness",
] as const satisfies readonly Attribute[];

export type SyntheticOnlyAttribute = (typeof SYNTHETIC_ONLY_ATTRIBUTES)[number];

export const isAttribute = (value: string): value is Attribute =>
  (ATTRIBUTES as readonly string[]).includes(value);

export const isDualKindAttribute = (value: string): value is DualKindAttribute =>
  (DUAL_KIND_ATTRIBUTES as readonly string[]).includes(value);

export const isSyntheticOnlyAttribute = (value: string): value is SyntheticOnlyAttribute =>
  (SYNTHETIC_ONLY_ATTRIBUTES as readonly string[]).includes(value);

/** True when a natural face (or natural forge region) is legal for this attribute. */
export const attributeAllowsNaturalFaces = (attribute: Attribute): boolean =>
  isDualKindAttribute(attribute);
