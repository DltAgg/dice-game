import { METRICS_IDB_NAME, METRICS_IDB_STORE, METRICS_SCHEMA_VERSION } from "./thresholds.js";
import type { MetricsRepository } from "./types.js";
import { isMetricsRecording } from "./observe.js";
import { pruneRecordings } from "./memoryRepo.js";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(METRICS_IDB_NAME, METRICS_SCHEMA_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(METRICS_IDB_STORE)) {
        const store = db.createObjectStore(METRICS_IDB_STORE, { keyPath: "recordingId" });
        store.createIndex("matchId", "matchId", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexedDB open failed"));
  });
}

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("indexedDB request failed"));
  });
}

export function createIndexedDbMetricsRepository(): MetricsRepository {
  const withStore = async <T>(
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> => {
    const db = await openDb();
    try {
      const tx = db.transaction(METRICS_IDB_STORE, mode);
      const store = tx.objectStore(METRICS_IDB_STORE);
      return await work(store);
    } finally {
      db.close();
    }
  };

  return {
    async list() {
      const rows = await withStore("readonly", async (store) => {
        const result = await reqToPromise(store.getAll());
        return Array.isArray(result) ? result.filter(isMetricsRecording) : [];
      });
      return pruneRecordings(rows).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async get(recordingId) {
      return withStore("readonly", async (store) => {
        const row: unknown = await reqToPromise(store.get(recordingId));
        return isMetricsRecording(row) ? row : undefined;
      });
    },
    async findByMatchId(matchId) {
      const rows = await withStore("readonly", async (store) => {
        const index = store.index("matchId");
        const result = await reqToPromise(index.getAll(matchId));
        return Array.isArray(result) ? result.filter(isMetricsRecording) : [];
      });
      return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    },
    async save(recording) {
      await withStore("readwrite", async (store) => {
        await reqToPromise(store.put(recording));
        const allUnknown: unknown = await reqToPromise(store.getAll());
        const all = Array.isArray(allUnknown) ? allUnknown.filter(isMetricsRecording) : [];
        const pruned = pruneRecordings(all);
        if (pruned.length === all.length) return;
        const keep = new Set(pruned.map((row) => row.recordingId));
        for (const row of all) {
          if (!keep.has(row.recordingId)) await reqToPromise(store.delete(row.recordingId));
        }
      });
    },
    async remove(recordingId) {
      const existing = await this.get(recordingId);
      if (existing === undefined) return false;
      await withStore("readwrite", async (store) => {
        await reqToPromise(store.delete(recordingId));
      });
      return true;
    },
    async clear() {
      await withStore("readwrite", async (store) => {
        await reqToPromise(store.clear());
      });
    },
  };
}
