import { create } from "zustand";
import {
  createBrowserMetricsRepository,
  type MatchRecording,
  type MetricsRepository,
} from "@client/metrics";

const repo: MetricsRepository = createBrowserMetricsRepository();

export interface MetricsStore {
  readonly recordings: readonly MatchRecording[];
  readonly loading: boolean;
  readonly selectedId: string | null;
  readonly notice: string | null;
  refresh: () => Promise<void>;
  select: (recordingId: string | null) => void;
  remove: (recordingId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export const useMetricsStore = create<MetricsStore>((set, get) => ({
  recordings: [],
  loading: false,
  selectedId: null,
  notice: null,

  refresh: async () => {
    set({ loading: true, notice: null });
    try {
      const recordings = await repo.list();
      const selectedId = get().selectedId;
      const stillThere =
        selectedId !== null && recordings.some((row) => row.recordingId === selectedId);
      set({
        recordings,
        loading: false,
        selectedId: stillThere ? selectedId : null,
      });
    } catch (error) {
      set({
        loading: false,
        notice: error instanceof Error ? error.message : "Could not read metrics storage",
      });
    }
  },

  select: (recordingId) => set({ selectedId: recordingId }),

  remove: async (recordingId) => {
    await repo.remove(recordingId);
    await get().refresh();
  },

  clearAll: async () => {
    await repo.clear();
    set({ selectedId: null });
    await get().refresh();
  },
}));
