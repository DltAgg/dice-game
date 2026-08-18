import { METRICS_LOCAL_STORAGE_KEY, METRICS_SCHEMA_VERSION } from "./thresholds.js";
import type { MatchRecording, MetricsRepository } from "./types.js";
import { isMetricsRecording } from "./observe.js";
import { pruneRecordings } from "./memoryRepo.js";

interface StorageBlob {
  readonly schemaVersion: number;
  readonly recordings: readonly MatchRecording[];
}

function readBlob(): MatchRecording[] {
  if (typeof localStorage === "undefined") return [];
  const raw = localStorage.getItem(METRICS_LOCAL_STORAGE_KEY);
  if (raw === null || raw === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return [];
    const blob = parsed as Partial<StorageBlob>;
    if (blob.schemaVersion !== METRICS_SCHEMA_VERSION || !Array.isArray(blob.recordings)) {
      return [];
    }
    return blob.recordings.filter(isMetricsRecording);
  } catch {
    return [];
  }
}

function writeBlob(recordings: readonly MatchRecording[]): void {
  if (typeof localStorage === "undefined") return;
  const blob: StorageBlob = {
    schemaVersion: METRICS_SCHEMA_VERSION,
    recordings: pruneRecordings(recordings),
  };
  localStorage.setItem(METRICS_LOCAL_STORAGE_KEY, JSON.stringify(blob));
}

export function createLocalStorageMetricsRepository(): MetricsRepository {
  return {
    async list() {
      return pruneRecordings(readBlob()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async get(recordingId) {
      return readBlob().find((row) => row.recordingId === recordingId);
    },
    async findByMatchId(matchId) {
      return readBlob()
        .filter((row) => row.matchId === matchId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    },
    async save(recording) {
      const current = readBlob().filter((row) => row.recordingId !== recording.recordingId);
      writeBlob([...current, recording]);
    },
    async remove(recordingId) {
      const current = readBlob();
      const next = current.filter((row) => row.recordingId !== recordingId);
      if (next.length === current.length) return false;
      writeBlob(next);
      return true;
    },
    async clear() {
      writeBlob([]);
    },
  };
}
