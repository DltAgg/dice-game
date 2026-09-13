import type {
  CardDefinition,
  CardId,
  CardType,
  FaceCardDefinition,
  FaceCardId,
} from "@server";

/** Main hand-deck kinds from `CardType`, plus Faces (separate catalogue). */
export const CARD_TYPE_FILTERS = [
  "instant",
  "reaction",
  "equipment",
  "overload",
  "ritual",
] as const satisfies readonly CardType[];

export type CatalogueFilter = "all" | CardType | "faces";

export const CATALOGUE_FILTERS: readonly {
  readonly id: CatalogueFilter;
  readonly label: string;
}[] = [
  { id: "all", label: "All" },
  ...CARD_TYPE_FILTERS.map((id) => ({
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
  })),
  { id: "faces", label: "Faces" },
];

export type PreviewTarget =
  | { readonly kind: "tactic"; readonly id: CardId }
  | { readonly kind: "face"; readonly id: FaceCardId };

export function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Full-text match over hand-deck catalogue fields. */
export function matchesCardQuery(card: CardDefinition, query: string): boolean {
  if (query.length === 0) return true;
  const haystack = [
    card.name,
    card.id,
    card.type,
    card.attribute,
    ...card.subtypes,
    card.rulesText,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

/** Full-text match over face catalogue fields. */
export function matchesFaceQuery(face: FaceCardDefinition, query: string): boolean {
  if (query.length === 0) return true;
  const haystack = [
    face.name,
    face.id,
    face.kind,
    face.symbol,
    face.rulesText,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function catalogueSearchLabel(filter: CatalogueFilter): string {
  if (filter === "all") return "Search all cards…";
  if (filter === "faces") return "Search faces…";
  return `Search ${filter}s…`;
}
