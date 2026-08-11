import { create } from "zustand";
import {
  createLocalStorageDeckRepository,
  PROTOTYPE_SAVED_DECK_ID,
  type DeckDraft,
  type DeckRepository,
  type SavedDeck,
  type SavedDeckId,
} from "@/decks";

const repo: DeckRepository = createLocalStorageDeckRepository();

export interface DeckStore {
  readonly decks: readonly SavedDeck[];
  readonly selectedId: SavedDeckId | null;
  refresh: () => void;
  select: (id: SavedDeckId | null) => void;
  save: (draft: DeckDraft, id?: SavedDeckId) => SavedDeck;
  remove: (id: SavedDeckId) => boolean;
  get: (id: SavedDeckId) => SavedDeck | undefined;
}

export const useDeckStore = create<DeckStore>((set, get) => ({
  decks: repo.list(),
  selectedId: PROTOTYPE_SAVED_DECK_ID,

  refresh: () => set({ decks: repo.list() }),

  select: (id) => set({ selectedId: id }),

  save: (draft, id) => {
    const saved = repo.save(draft, id);
    set({ decks: repo.list(), selectedId: saved.id });
    return saved;
  },

  remove: (id) => {
    const ok = repo.remove(id);
    const decks = repo.list();
    const selectedId = get().selectedId === id ? PROTOTYPE_SAVED_DECK_ID : get().selectedId;
    set({ decks, selectedId });
    return ok;
  },

  get: (id) => repo.get(id),
}));
