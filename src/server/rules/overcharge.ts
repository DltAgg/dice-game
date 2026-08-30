import { getCard } from "../content/cards.js";
import { getFaceCard } from "../content/faces.js";
import type { CardDefinition } from "../model/cards.js";
import type { DieId, CardInstanceId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { isAttributeSymbol } from "../model/symbols.js";
import { diceOf } from "./dice.js";

/** `PlayerState.spentOncePerTurnKeys` entry after a successful Overcharge. */
export const OVERCHARGE_ONCE_PER_TURN_KEY = "overcharge";

export type OverchargeSlotRef = {
  readonly dieId: DieId;
  readonly slotIndex: number;
};

/** True when the card's forge region is a natural own-die spend (spec `021`). */
export function isOverchargeLegalCard(definition: CardDefinition): boolean {
  return definition.forge.kind === "natural" && definition.forge.target === "own-die";
}

/** Own-die physical slots whose showing face is an attribute (not Shield). */
export function legalOverchargeSlots(
  state: GameState,
  playerId: PlayerId,
): readonly OverchargeSlotRef[] {
  const slots: OverchargeSlotRef[] = [];
  for (const die of diceOf(state, playerId)) {
    for (const slot of die.slots) {
      const face = getFaceCard(slot.faceCardId);
      if (face === undefined || !isAttributeSymbol(face.symbol)) continue;
      slots.push({ dieId: die.id, slotIndex: slot.index });
    }
  }
  return slots;
}

/**
 * UI enablement for Overcharge. False when not actions, not the active seat,
 * a decision is pending, the card cannot Overcharge, the once-per-turn key is
 * spent, or no attribute slot exists on the actor's dice.
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
  const definition = getCard(card.cardId);
  if (definition === undefined || !isOverchargeLegalCard(definition)) return false;
  return legalOverchargeSlots(state, playerId).length > 0;
}
