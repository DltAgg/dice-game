import type { PlayerId, SymbolInstanceId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import {
  requirementEntries,
  type SymbolInstance,
  type SymbolRequirement,
  type SymbolStatus,
  type SymbolType,
} from "../model/symbols.js";

/**
 * Die pips (`rolled`) and effect-generated symbols (`available`) share one
 * unabsorbed pool. Absorb and `[Requires]` spend both see this set.
 */
export const isUnabsorbedPoolStatus = (status: SymbolStatus): boolean =>
  status === "rolled" || status === "available";

export const isUnabsorbedPoolSymbol = (symbol: SymbolInstance): boolean =>
  isUnabsorbedPoolStatus(symbol.status) && symbol.usable !== false;

/**
 * Symbols the engine may spend or absorb right now. Nothing outlives the turn,
 * so this is the unabsorbed pool (rolled pips and effect-generated symbols).
 *
 * An absorbed symbol is deliberately absent: bible §7 removes it from engine
 * resolution, and that exclusion is the game's central tradeoff. It reappears
 * as fuel on the creature that took it, never here.
 */
export const usableSymbols = (state: GameState, playerId: PlayerId): readonly SymbolInstance[] =>
  Object.values(state.symbols).filter(
    (symbol) => symbol.ownerId === playerId && isUnabsorbedPoolSymbol(symbol),
  );

/**
 * Symbols generated from dice this turn (`rolled`). Effect-generated pips use
 * `available`; both are unabsorbed pool and appear in `usableSymbols`.
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
 * paid. Prefer `canPay` / pile checks for `[Requires]` — usable attributes now
 * auto-bank into `attributePool` (spec `016`). This planner still matches the
 * turn pool for any rare leftover unabsorbed pips (e.g. locked faces).
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

/**
 * Whether `[Requires]` can be paid from the owner's attribute pile (plus
 * requirement wildcards for shortfall).
 */
export const canPay = (
  state: GameState,
  playerId: PlayerId,
  requirement: SymbolRequirement,
): boolean => {
  const pile = state.players[playerId]?.attributePool ?? {};
  let shortfall = 0;
  for (const [attribute, count] of requirementEntries(requirement)) {
    const held = pile[attribute] ?? 0;
    if (held < count) shortfall += count - held;
  }
  const wildcards = state.requirementWildcardsThisTurn[playerId]?.length ?? 0;
  return shortfall <= wildcards;
};

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
