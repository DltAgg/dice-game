import type { PlayerId, SymbolInstanceId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import {
  genericCount,
  isAttributeSymbol,
  requirementEntries,
  type SymbolInstance,
  type SymbolRequirement,
  type SymbolStatus,
  type SymbolType,
} from "../model/symbols.js";
import { pileRequirementShortfall } from "./tokens.js";

/**
 * Die pips (`rolled`) and effect-generated symbols (`available`) share one
 * unabsorbed pool. Attribute banking and leftover Shield absorb see this set.
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
 * Chooses which specific turn-pool symbols match a requirement, or null when
 * it cannot be paid. Prefer `canPay` / pile checks for `[Spend]` / gates —
 * usable attributes auto-bank into `attributePool` (spec `016`). This planner
 * still matches the turn pool for rare leftover unabsorbed pips.
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

  const generic = genericCount(requirement);
  if (generic > 0) {
    const matches = pool.filter(
      (candidate) => isAttributeSymbol(candidate.symbol) && !taken.has(candidate.id),
    );
    if (matches.length < generic) return null;
    for (const match of matches.slice(0, generic)) {
      taken.add(match.id);
      chosen.push(match.id);
    }
  }

  return chosen;
}

/**
 * Whether a pile gate or Spend can be met from the owner's attribute pile
 * (plus Resonance wildcards for shortfall).
 */
export const canPay = (
  state: GameState,
  playerId: PlayerId,
  requirement: SymbolRequirement,
): boolean => {
  const pile = state.players[playerId]?.attributePool ?? {};
  const wildcards = state.requirementWildcardsThisTurn[playerId]?.length ?? 0;
  return pileRequirementShortfall(pile, requirement) <= wildcards;
};

/** How many requirement pips are unpaid after matching the pool exactly. */
export function requirementShortfall(
  state: GameState,
  playerId: PlayerId,
  requirement: SymbolRequirement,
): number {
  const pool = usableSymbols(state, playerId);
  let short = 0;
  const remaining = [...pool];
  for (const [attribute, count] of requirementEntries(requirement)) {
    let have = 0;
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (remaining[i]?.symbol !== attribute) continue;
      have += 1;
      remaining.splice(i, 1);
      if (have >= count) break;
    }
    if (have < count) short += count - have;
  }
  const generic = genericCount(requirement);
  if (generic > 0) {
    const leftover = remaining.filter((candidate) => isAttributeSymbol(candidate.symbol)).length;
    if (leftover < generic) short += generic - leftover;
  }
  return short;
}
