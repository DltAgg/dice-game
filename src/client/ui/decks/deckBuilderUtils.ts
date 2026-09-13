import { isOpeningBasicFace, type FaceCardId } from "@server";

export function countOf<T extends string>(list: readonly T[], id: T): number {
  return list.filter((entry) => entry === id).length;
}

export function addCopy<T extends string>(list: readonly T[], id: T, max: number): T[] {
  if (countOf(list, id) >= max) return [...list];
  return [...list, id];
}

export function removeOne<T extends string>(list: readonly T[], id: T): T[] {
  const index = list.indexOf(id);
  if (index < 0) return [...list];
  return [...list.slice(0, index), ...list.slice(index + 1)];
}

export function uniqueSortedCounts<T extends string>(
  list: readonly T[],
  labelOf: (id: T) => string,
): readonly { readonly id: T; readonly copies: number }[] {
  const counts = new Map<T, number>();
  for (const id of list) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, copies]) => ({ id, copies }))
    .sort((a, b) => labelOf(a.id).localeCompare(labelOf(b.id)));
}

/** Unique named specials already in the face deck (not basics). */
export function uniqueFaceDeckSpecials(faceDeck: readonly FaceCardId[]): FaceCardId[] {
  const seen = new Set<FaceCardId>();
  const ids: FaceCardId[] = [];
  for (const id of faceDeck) {
    if (isOpeningBasicFace(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}
