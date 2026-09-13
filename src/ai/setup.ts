import {
  ALL_BUILTIN_LOADOUTS,
  asPlayerId,
  createMatch,
  type GameState,
} from "@server";
import type { LoadoutId } from "./types.js";

const P1 = asPlayerId("p1");
const P2 = asPlayerId("p2");

export const PLAYTEST_P1 = P1;
export const PLAYTEST_P2 = P2;

export function builtinLoadoutById(id: LoadoutId) {
  const needle = id.trim().toLowerCase();
  const found = ALL_BUILTIN_LOADOUTS.find(
    (loadout) =>
      loadout.id.toLowerCase() === needle ||
      loadout.name.toLowerCase() === needle ||
      loadout.id.toLowerCase() === `deck-${needle}`,
  );
  if (found === undefined) {
    const known = ALL_BUILTIN_LOADOUTS.map((loadout) => loadout.id).join(", ");
    throw new Error(`unknown loadout "${id}" (known: ${known})`);
  }
  return found;
}

export function createPlaytestMatch(
  seed: number,
  p1LoadoutId: LoadoutId,
  p2LoadoutId: LoadoutId,
): GameState {
  const p1 = builtinLoadoutById(p1LoadoutId);
  const p2 = builtinLoadoutById(p2LoadoutId);
  return createMatch({
    matchId: `ai-playtest-${String(seed)}`,
    seed,
    players: [
      {
        id: P1,
        squad: p1.squad,
        deck: p1.deck,
        faceDeck: p1.faceDeck,
        startingDice: p1.startingDice,
      },
      {
        id: P2,
        squad: p2.squad,
        deck: p2.deck,
        faceDeck: p2.faceDeck,
        startingDice: p2.startingDice,
      },
    ],
  });
}
