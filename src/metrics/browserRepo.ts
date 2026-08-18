import { createIndexedDbMetricsRepository } from "./indexedDbRepo.js";
import { createLocalStorageMetricsRepository } from "./localStorageRepo.js";
import type { MetricsRepository } from "./types.js";

/**
 * IndexedDB first so long recordings survive refresh without the 5MB
 * localStorage cliff. Falls back to localStorage if IDB is missing or throws.
 */
export function createBrowserMetricsRepository(): MetricsRepository {
  if (typeof indexedDB === "undefined") {
    return createLocalStorageMetricsRepository();
  }

  const idb = createIndexedDbMetricsRepository();
  const fallback = createLocalStorageMetricsRepository();

  const use = async <T>(
    primary: () => Promise<T>,
    secondary: () => Promise<T>,
  ): Promise<T> => {
    try {
      return await primary();
    } catch {
      return secondary();
    }
  };

  return {
    list: () => use(() => idb.list(), () => fallback.list()),
    get: (id) => use(() => idb.get(id), () => fallback.get(id)),
    findByMatchId: (matchId) =>
      use(() => idb.findByMatchId(matchId), () => fallback.findByMatchId(matchId)),
    save: (recording) => use(() => idb.save(recording), () => fallback.save(recording)),
    remove: (id) => use(() => idb.remove(id), () => fallback.remove(id)),
    clear: () => use(() => idb.clear(), () => fallback.clear()),
  };
}
