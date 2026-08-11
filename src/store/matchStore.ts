import { create } from "zustand";
import {
  advance,
  asPlayerId,
  createMatch,
  type GameAction,
  type GameError,
  type GameState,
} from "@/game";
import {
  createLocalStorageDeckRepository,
  PROTOTYPE_SAVED_DECK_ID,
  type SavedDeck,
  type SavedDeckId,
} from "@/decks";

const P1 = asPlayerId("p1");
const P2 = asPlayerId("p2");

const deckRepo = createLocalStorageDeckRepository();

export type MatchView = "match" | "catalogue" | "decks";

function loadoutOrPrototype(id: SavedDeckId | undefined): SavedDeck {
  const deck = deckRepo.get(id ?? PROTOTYPE_SAVED_DECK_ID) ?? deckRepo.get(PROTOTYPE_SAVED_DECK_ID);
  if (deck === undefined) {
    throw new Error("matchStore: prototype deck missing");
  }
  return deck;
}

function newMatchState(
  seed: number,
  p1DeckId?: SavedDeckId,
  p2DeckId?: SavedDeckId,
): GameState {
  const p1 = loadoutOrPrototype(p1DeckId);
  const p2 = loadoutOrPrototype(p2DeckId);
  return createMatch({
    matchId: `local-${String(seed)}`,
    seed,
    players: [
      { id: P1, squad: p1.squad, deck: p1.deck, faceDeck: p1.faceDeck },
      { id: P2, squad: p2.squad, deck: p2.deck, faceDeck: p2.faceDeck },
    ],
  });
}

export interface MatchStore {
  readonly state: GameState;
  readonly lastError: GameError | null;
  readonly view: MatchView;
  readonly seed: number;
  readonly p1DeckId: SavedDeckId;
  readonly p2DeckId: SavedDeckId;

  setView: (view: MatchView) => void;
  setMatchDecks: (p1DeckId: SavedDeckId, p2DeckId: SavedDeckId) => void;
  newMatch: (seed?: number, p1DeckId?: SavedDeckId, p2DeckId?: SavedDeckId) => void;
  dispatch: (action: GameAction) => boolean;
  clearError: () => void;
}

export const useMatchStore = create<MatchStore>((set, get) => {
  const seed = Date.now() % 100_000;
  return {
    state: newMatchState(seed, PROTOTYPE_SAVED_DECK_ID, PROTOTYPE_SAVED_DECK_ID),
    lastError: null,
    view: "match",
    seed,
    p1DeckId: PROTOTYPE_SAVED_DECK_ID,
    p2DeckId: PROTOTYPE_SAVED_DECK_ID,

    setView: (view) => set({ view }),

    setMatchDecks: (p1DeckId, p2DeckId) => set({ p1DeckId, p2DeckId }),

    newMatch: (nextSeed = Date.now() % 100_000, p1DeckId, p2DeckId) => {
      const p1 = p1DeckId ?? get().p1DeckId;
      const p2 = p2DeckId ?? get().p2DeckId;
      set({
        state: newMatchState(nextSeed, p1, p2),
        lastError: null,
        seed: nextSeed,
        p1DeckId: p1,
        p2DeckId: p2,
      });
    },

    clearError: () => set({ lastError: null }),

    dispatch: (action) => {
      const result = advance(get().state, action);
      if (result.ok) {
        set({ state: result.state, lastError: null });
        return true;
      }
      set({ lastError: result.error });
      return false;
    },
  };
});

export const MATCH_P1 = P1;
export const MATCH_P2 = P2;
