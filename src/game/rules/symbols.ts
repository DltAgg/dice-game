import type { PlayerId, SymbolInstanceId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import {
  requirementEntries,
  type SymbolInstance,
  type SymbolRequirement,
  type SymbolType,
} from "../model/symbols.js";

/**
 * Symbols the engine may spend right now. Nothing outlives the turn, so this is
 * simply the unabsorbed part of this turn's roll.
 *
 * An absorbed symbol is deliberately absent: bible §7 removes it from engine
 * resolution, and that exclusion is the game's central tradeoff. It reappears
 * as fuel on the creature that took it, never here.
 */
export const usableSymbols = (state: GameState, playerId: PlayerId): readonly SymbolInstance[] =>
  Object.values(state.symbols).filter(
    (symbol) =>
      symbol.ownerId === playerId &&
      symbol.status === "available" &&
      symbol.usable !== false,
  );

/**
 * Symbols still in the absorption window (status `rolled`). Once the engine
 * phase opens they flip to `available` and leave this list.
 */
export const rolledSymbols = (state: GameState, playerId: PlayerId): readonly SymbolInstance[] =>
  Object.values(state.symbols).filter(
    (symbol) => symbol.ownerId === playerId && symbol.status === "rolled",
  );

export const availableSymbolCounts = (
  state: GameState,
  playerId: PlayerId,
): Readonly<Partial<Record<SymbolType, number>>> => {
  const counts: Partial<Record<SymbolType, number>> = {};
  for (const symbol of usableSymbols(state, playerId)) {
    counts[symbol.symbol] = (counts[symbol.symbol] ?? 0) + 1;
  }
  return counts;
};

/**
 * Chooses which specific symbols pay a requirement, or null when it cannot be
 * paid. Ids are sorted so the same state and requirement always select the same
 * symbols, which is what makes a replay reproduce a match exactly.
 *
 * Only engine abilities and cards pay this way. Attacks are funded from the
 * attacker's own absorbed tokens; see `rules/tokens.ts`.
 */
export function planConsumption(
  state: GameState,
  playerId: PlayerId,
  requirement: SymbolRequirement,
): readonly SymbolInstanceId[] | null {
  const pool = [...usableSymbols(state, playerId)].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );

  const chosen: SymbolInstanceId[] = [];
  const taken = new Set<SymbolInstanceId>();

  for (const [attribute, count] of requirementEntries(requirement)) {
    const matches = pool.filter(
      (candidate) => candidate.symbol === attribute && !taken.has(candidate.id),
    );
    if (matches.length < count) return null;
    for (const match of matches.slice(0, count)) {
      taken.add(match.id);
      chosen.push(match.id);
    }
  }

  return chosen;
}

export const canPay = (
  state: GameState,
  playerId: PlayerId,
  requirement: SymbolRequirement,
): boolean => planConsumption(state, playerId, requirement) !== null;

/** How many requirement pips are unpaid after matching the pool exactly. */
export function requirementShortfall(
  state: GameState,
  playerId: PlayerId,
  requirement: SymbolRequirement,
): number {
  const pool = usableSymbols(state, playerId);
  let short = 0;
  for (const [attribute, count] of requirementEntries(requirement)) {
    const have = pool.filter((candidate) => candidate.symbol === attribute).length;
    if (have < count) short += count - have;
  }
  return short;
}
