import {
  advance,
  asPlayerId,
  createMatch,
  type GameAction,
  type GameError,
  type GameState,
} from "@server";
import {
  createLocalStorageDeckRepository,
  PROTOTYPE_SAVED_DECK_ID,
  validateSavedDeck,
  type SavedDeck,
  type SavedDeckId,
} from "@client/decks";
import type { WireLoadout } from "@client/networking";
import { autoPassPriorityAction } from "./autoPassPriority.js";

export const MATCH_P1 = asPlayerId("p1");
export const MATCH_P2 = asPlayerId("p2");

const deckRepo = createLocalStorageDeckRepository();

export function requireDeck(id: SavedDeckId): SavedDeck {
  const deck = deckRepo.get(id);
  if (deck === undefined) {
    throw new Error(`matchStore: deck “${id}” was not found`);
  }
  return deck;
}

/** Resolve a playable loadout; never silently substitutes another deck. */
export function resolvePlayableLoadout(
  id: SavedDeckId,
): { ok: true; deck: SavedDeck } | { ok: false; reason: string } {
  const deck = deckRepo.get(id);
  if (deck === undefined) {
    return {
      ok: false,
      reason: `Deck “${id}” was not found. Pick a loadout in Play before claiming a seat.`,
    };
  }
  const check = validateSavedDeck(deck);
  if (!check.ok) {
    return { ok: false, reason: `“${deck.name}” is not legal to play: ${check.reason}` };
  }
  return { ok: true, deck };
}

export function toWireLoadout(deck: SavedDeck): WireLoadout {
  return { squad: deck.squad, deck: deck.deck, faceDeck: deck.faceDeck, startingDice: deck.startingDice };
}

/** Null when every id is a legal playable loadout. */
export function playBlockReasonFor(...ids: readonly SavedDeckId[]): string | null {
  for (const id of ids) {
    const resolved = resolvePlayableLoadout(id);
    if (!resolved.ok) return resolved.reason;
  }
  return null;
}

export function newMatchState(
  seed: number,
  p1DeckId: SavedDeckId = PROTOTYPE_SAVED_DECK_ID,
  p2DeckId: SavedDeckId = PROTOTYPE_SAVED_DECK_ID,
): GameState {
  const p1 = requireDeck(p1DeckId);
  const p2 = requireDeck(p2DeckId);
  return createMatch({
    matchId: `local-${String(seed)}`,
    seed,
    players: [
      { id: MATCH_P1, squad: p1.squad, deck: p1.deck, faceDeck: p1.faceDeck, startingDice: p1.startingDice },
      { id: MATCH_P2, squad: p2.squad, deck: p2.deck, faceDeck: p2.faceDeck, startingDice: p2.startingDice },
    ],
  });
}

export function deckName(id: SavedDeckId): string {
  return deckRepo.get(id)?.name ?? id;
}

export type ObserveMatch = (
  prevState: GameState | null,
  state: GameState,
  action: GameAction | null,
  accepted: boolean,
  error: GameError | null,
) => void;

export function dispatchHotseat(
  prev: GameState,
  action: GameAction,
  observe: ObserveMatch,
): { ok: true; state: GameState } | { ok: false; state: GameState; error: GameError } {
  const result = advance(prev, action);
  if (result.ok) {
    let current = result.state;
    observe(prev, current, action, true, null);
    for (let i = 0; i < 16; i += 1) {
      const pass = autoPassPriorityAction({
        state: current,
        mode: "local",
        localPlayerId: null,
        canAct: true,
      });
      if (pass === null) break;
      const next = advance(current, pass);
      if (!next.ok) break;
      observe(current, next.state, pass, true, null);
      current = next.state;
    }
    return { ok: true, state: current };
  }
  observe(prev, prev, action, false, result.error);
  return { ok: false, state: prev, error: result.error };
}
