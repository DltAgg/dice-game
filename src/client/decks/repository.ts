import type { DeckDraft, SavedDeck, SavedDeckId } from "./types.js";

export interface DeckRepository {
  list(): readonly SavedDeck[];
  get(id: SavedDeckId): SavedDeck | undefined;
  save(draft: DeckDraft, id?: SavedDeckId): SavedDeck;
  remove(id: SavedDeckId): boolean;
}
