import { getCard } from "../content/cards.js";
import { getFaceCard } from "../content/faces.js";
import type { CardInstanceId, FaceCardId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { isAttributeSymbol } from "../model/symbols.js";
import { diceOf } from "./dice.js";

/** `PlayerState.spentOncePerTurnKeys` entry after a successful Overcharge. */
export const OVERCHARGE_ONCE_PER_TURN_KEY = "overcharge";

/**
 * Unique attribute face cards installed on the actor's own dice (not Shield).
 * Stay / cannot-replace does not exclude a face — Overcharge does not replace.
 */
export function legalOverchargeFaces(
  state: GameState,
  playerId: PlayerId,
): readonly FaceCardId[] {
  const faces: FaceCardId[] = [];
  const seen = new Set<string>();
  for (const die of diceOf(state, playerId)) {
    for (const slot of die.slots) {
      if (seen.has(slot.faceCardId)) continue;
      const face = getFaceCard(slot.faceCardId);
      if (face === undefined || !isAttributeSymbol(face.symbol)) continue;
      seen.add(slot.faceCardId);
      faces.push(slot.faceCardId);
    }
  }
  return faces;
}

/**
 * UI enablement for Overcharge. False when not actions, not the active seat,
 * a decision is pending, the card is not in the actor's hand, the once-per-turn
 * key is spent, or no attribute face exists on the actor's dice. Any hand card
 * is legal fodder (spec `021`).
 */
export function canOvercharge(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
): boolean {
  if (state.phase !== "actions") return false;
  if (state.activePlayerId !== playerId) return false;
  if (state.pendingDecision !== null) return false;
  if (state.players[playerId]?.spentOncePerTurnKeys.includes(OVERCHARGE_ONCE_PER_TURN_KEY)) {
    return false;
  }
  const card = state.cards[cardInstanceId];
  if (card === undefined || card.ownerId !== playerId || card.zone !== "hand") return false;
  if (getCard(card.cardId) === undefined) return false;
  return legalOverchargeFaces(state, playerId).length > 0;
}
