import { getCard } from "../content/cards.js";
import type { CardInstanceId, CreatureId, PlayerId, SymbolInstanceId } from "../model/ids.js";
import type { GameError } from "../model/errors.js";
import type { GameState } from "../model/state.js";
import {
  isAttributeSymbol,
  requirementEntries,
  type AttributeTokens,
  type SymbolRequirement,
} from "../model/symbols.js";
import { isUnabsorbedPoolSymbol } from "./symbols.js";

function firstMissingActiveWhen(
  requirement: SymbolRequirement,
  progress: AttributeTokens,
): ReturnType<typeof requirementEntries>[number][0] | undefined {
  for (const [attribute, count] of requirementEntries(requirement)) {
    if ((progress[attribute] ?? 0) < count) return attribute;
  }
  return undefined;
}

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
 * Why `ABSORB_SYMBOL` would be refused, or `null` when the click is legal.
 * Read-only mirror of `absorbSymbol` gates — does not mutate.
 */
export function absorbSymbolToCreatureError(
  state: GameState,
  playerId: PlayerId,
  creatureId: CreatureId,
  symbolId: SymbolInstanceId,
): GameError | null {
  const poolError = poolSymbolError(state, playerId, symbolId);
  if (poolError !== null) return poolError;

  const creature = state.creatures[creatureId];
  if (creature === undefined) return "UNKNOWN_ENTITY";
  if (creature.ownerId !== playerId) return "INVALID_TARGET";
  if (creature.defeated) return "CREATURE_DEFEATED";
  return null;
}

/**
 * Why `ABSORB_SYMBOL_TO_RITUAL` would be refused, or `null` when legal.
 * Read-only mirror of `absorbSymbolToRitual` gates — does not mutate.
 */
export function absorbSymbolToRitualError(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  symbolId: SymbolInstanceId,
): GameError | null {
  const poolError = poolSymbolError(state, playerId, symbolId);
  if (poolError !== null) return poolError;

  const symbol = state.symbols[symbolId];
  if (symbol === undefined) return "UNKNOWN_ENTITY";
  if (!isAttributeSymbol(symbol.symbol)) return "INVALID_TARGET";

  const card = state.cards[cardInstanceId];
  if (card === undefined) return "UNKNOWN_ENTITY";
  if (card.ownerId !== playerId || card.zone !== "ritual") return "CARD_NOT_AVAILABLE";
  if (card.ritualOrientation === "exhausted") return "CARD_NOT_AVAILABLE";

  const region = getCard(card.cardId)?.ritual;
  if (region?.activeWhen === undefined) return "CARD_NOT_AVAILABLE";

  const attribute = symbol.symbol;
  let creditAs = attribute;
  const needed = region.activeWhen[attribute] ?? 0;
  if (needed < 1) {
    const missing = firstMissingActiveWhen(region.activeWhen, card.ritualProgress ?? {});
    const wildcards = state.requirementWildcardsThisTurn[playerId] ?? [];
    const wildcardIndex = wildcards.findIndex(
      (wildcard) => wildcard.fromSymbol === undefined || wildcard.fromSymbol === symbol.symbol,
    );
    if (missing === undefined || wildcardIndex < 0) return "INVALID_TARGET";
    creditAs = missing;
  }

  const progress = card.ritualProgress ?? {};
  if ((progress[creditAs] ?? 0) >= (region.activeWhen[creditAs] ?? 0)) return "INVALID_TARGET";
  return null;
}

export const canAbsorbSymbolToCreature = (
  state: GameState,
  playerId: PlayerId,
  creatureId: CreatureId,
  symbolId: SymbolInstanceId,
): boolean => absorbSymbolToCreatureError(state, playerId, creatureId, symbolId) === null;

export const canAbsorbSymbolToRitual = (
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  symbolId: SymbolInstanceId,
): boolean => absorbSymbolToRitualError(state, playerId, cardInstanceId, symbolId) === null;

/** Short player-facing reason a ritual cannot take the armed symbol. */
export function absorbRitualBlockHint(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  symbolId: SymbolInstanceId,
): string | null {
  const error = absorbSymbolToRitualError(state, playerId, cardInstanceId, symbolId);
  if (error === null) return null;
  const symbol = state.symbols[symbolId];
  switch (error) {
    case "SYMBOL_UNAVAILABLE":
      return "That pip is no longer in the pool.";
    case "INVALID_TARGET":
      if (symbol !== undefined && !isAttributeSymbol(symbol.symbol)) {
        return "Shield cannot fill a ritual.";
      }
      return `Does not need ${symbol?.symbol ?? "that"} (or the gate is already filled).`;
    case "CARD_NOT_AVAILABLE":
      return "This ritual cannot take symbols right now.";
    default:
      return "Cannot absorb here.";
  }
}
