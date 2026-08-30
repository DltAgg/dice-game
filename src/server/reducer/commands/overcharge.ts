import { getCard } from "../../content/cards.js";
import { getFaceCard } from "../../content/faces.js";
import type { GameError } from "../../model/errors.js";
import type { CardInstanceId, DieId, PlayerId } from "../../model/ids.js";
import { isAttributeSymbol } from "../../model/symbols.js";
import {
  isOverchargeLegalCard,
  OVERCHARGE_ONCE_PER_TURN_KEY,
} from "../../rules/overcharge.js";
import { emit, patchDie, type Draft } from "../draft.js";
import { isPlayerSpent, markPlayerSpent } from "../triggerSpent.js";
import { moveCard } from "../zones.js";

/**
 * Spend a natural own-die forge card from hand to Overcharge one attribute
 * slot on the actor's die (spec `021`). No pile cost, draw, yield, or
 * reaction window.
 */
export function overchargeCard(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  dieId: DieId,
  slotIndex: number,
): GameError | null {
  if (draft.phase !== "actions") return "INVALID_PHASE";

  const card = draft.cards[cardInstanceId];
  if (card === undefined) return "UNKNOWN_ENTITY";
  if (card.ownerId !== playerId || card.zone !== "hand") return "CARD_NOT_AVAILABLE";

  const definition = getCard(card.cardId);
  if (definition === undefined) return "UNKNOWN_ENTITY";
  if (!isOverchargeLegalCard(definition)) return "CARD_HAS_NO_EFFECT";

  if (isPlayerSpent(draft, playerId, OVERCHARGE_ONCE_PER_TURN_KEY)) {
    return "ALREADY_USED";
  }

  const die = draft.dice[dieId];
  if (die === undefined) return "UNKNOWN_ENTITY";
  if (die.ownerId !== playerId) return "INVALID_TARGET";

  const slot = die.slots[slotIndex];
  if (slot === undefined) return "INVALID_FACE";
  const face = getFaceCard(slot.faceCardId);
  if (face === undefined || !isAttributeSymbol(face.symbol)) return "INVALID_FACE";

  const attribute = definition.forge.attribute;
  const nextOvercharge = [...(slot.overcharge ?? []), attribute];
  const slots = die.slots.map((candidate) =>
    candidate.index === slotIndex ? { ...candidate, overcharge: nextOvercharge } : candidate,
  );
  patchDie(draft, dieId, { slots });
  markPlayerSpent(draft, playerId, OVERCHARGE_ONCE_PER_TURN_KEY);
  moveCard(draft, cardInstanceId, "graveyard");
  emit(draft, {
    type: "face-overcharged",
    playerId,
    cardInstanceId,
    dieId,
    slotIndex,
    attribute,
  });
  return null;
}
