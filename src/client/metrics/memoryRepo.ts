import { MAX_STORED_RECORDINGS } from "./thresholds.js";
import type { MatchRecording, MetricsRepository } from "./types.js";
import { isMetricsRecording } from "./observe.js";

export function pruneRecordings(recordings: readonly MatchRecording[]): MatchRecording[] {
  if (recordings.length <= MAX_STORED_RECORDINGS) return [...recordings];
  return [...recordings]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_STORED_RECORDINGS);
}

export function createMemoryMetricsRepository(
  initial: readonly MatchRecording[] = [],
): MetricsRepository {
  let rows = pruneRecordings(initial.filter(isMetricsRecording));

  return {
    async list() {
      return [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async get(recordingId) {
      return rows.find((row) => row.recordingId === recordingId);
    },
    async findByMatchId(matchId) {
      const matches = rows.filter((row) => row.matchId === matchId);
      return matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    },
    async save(recording) {
      rows = pruneRecordings([
        ...rows.filter((row) => row.recordingId !== recording.recordingId),
        recording,
      ]);
    },
    async remove(recordingId) {
      const next = rows.filter((row) => row.recordingId !== recordingId);
      if (next.length === rows.length) return false;
      rows = next;
      return true;
    },
    async clear() {
      rows = [];
    },
  };
}
