import type { CreatureId, PlayerId, SymbolInstanceId } from "../model/ids.js";
import type { GameError } from "../model/errors.js";
import type { GameState } from "../model/state.js";
import { isAttributeSymbol } from "../model/symbols.js";
import { isUnabsorbedPoolSymbol } from "./symbols.js";

function poolSymbolError(
  state: GameState,
  playerId: PlayerId,
  symbolId: SymbolInstanceId,
): GameError | null {
  if (state.phase !== "actions") return "INVALID_PHASE";
  const symbol = state.symbols[symbolId];
  if (symbol === undefined) return "UNKNOWN_ENTITY";
  if (symbol.ownerId !== playerId) return "INVALID_TARGET";
  if (!isUnabsorbedPoolSymbol(symbol)) return "SYMBOL_UNAVAILABLE";
  return null;
}

/**
 * Why `ABSORB_SYMBOL` would be refused, or `null` when legal.
 * Attribute pips bank into the player's pile (no creature). Shield requires a
 * living owned creature. Spec `016`.
 */
export function absorbSymbolError(
  state: GameState,
  playerId: PlayerId,
  symbolId: SymbolInstanceId,
  creatureId: CreatureId | undefined,
): GameError | null {
  const poolError = poolSymbolError(state, playerId, symbolId);
  if (poolError !== null) return poolError;

  const symbol = state.symbols[symbolId];
  if (symbol === undefined) return "UNKNOWN_ENTITY";

  if (isAttributeSymbol(symbol.symbol)) {
    return null;
  }

  // Shield: creature target required.
  if (creatureId === undefined) return "INVALID_TARGET";
  const creature = state.creatures[creatureId];
  if (creature === undefined) return "UNKNOWN_ENTITY";
  if (creature.ownerId !== playerId) return "INVALID_TARGET";
  if (creature.defeated) return "CREATURE_DEFEATED";
  return null;
}

/** @deprecated Prefer `absorbSymbolError` — Shield creature gate only. */
export function absorbSymbolToCreatureError(
  state: GameState,
  playerId: PlayerId,
  creatureId: CreatureId,
  symbolId: SymbolInstanceId,
): GameError | null {
  return absorbSymbolError(state, playerId, symbolId, creatureId);
}

export const canAbsorbSymbol = (
  state: GameState,
  playerId: PlayerId,
  symbolId: SymbolInstanceId,
  creatureId?: CreatureId,
): boolean => absorbSymbolError(state, playerId, symbolId, creatureId) === null;

/** @deprecated Prefer `canAbsorbSymbol` with optional creatureId. */
export const canAbsorbSymbolToCreature = (
  state: GameState,
  playerId: PlayerId,
  creatureId: CreatureId,
  symbolId: SymbolInstanceId,
): boolean => absorbSymbolError(state, playerId, symbolId, creatureId) === null;
