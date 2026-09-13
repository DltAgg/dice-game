/** Drop editor-only `$schema` so catalogue objects stay engine DTOs. */
function asCatalogueEntry<T extends { readonly id: string }>(value: unknown): T {
  if (value === null || typeof value !== "object") {
    throw new Error("catalogue module is not an object");
  }
  const { $schema: _schema, ...rest } = value as { readonly $schema?: string } & T;
  void _schema;
  return rest as T;
}

export function catalogueFromModules<T extends { readonly id: string }>(
  modules: Record<string, unknown>,
  order: readonly string[],
): { readonly list: readonly T[]; readonly byId: Readonly<Record<string, T>> } {
  const byId: Record<string, T> = {};
  for (const value of Object.values(modules)) {
    const entry = asCatalogueEntry<T>(value);
    byId[entry.id] = entry;
  }
  const list = order.map((id) => {
    const entry = byId[id];
    if (entry === undefined) {
      throw new Error(`catalogue missing "${id}"`);
    }
    return entry;
  });
  return { list, byId };
}
