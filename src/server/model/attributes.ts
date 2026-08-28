/**
 * The eight attributes named in bible §26. Their strategic identities (§29)
 * are content concerns; the engine treats an attribute as an opaque tag.
 *
 * Face-kind policy: every attribute may have natural identity faces
 * (`face-natural-<attr>`) **and** named synthetics. Never author blank
 * `face-synthetic-<attr>` generics — synthetic forges always name a special
 * from the owner's pool.
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

/** Attributes that may appear as natural faces and as synthetics (all eight). */
export const DUAL_KIND_ATTRIBUTES = ATTRIBUTES;

export type DualKindAttribute = (typeof DUAL_KIND_ATTRIBUTES)[number];

/**
 * Formerly synthetic-only attributes. Kept empty for API stability; natural
 * identity faces are legal for every Attribute.
 */
export const SYNTHETIC_ONLY_ATTRIBUTES = [] as const satisfies readonly Attribute[];

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
