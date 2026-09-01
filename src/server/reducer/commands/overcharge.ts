import { getCard } from "../../content/cards.js";
import { getFaceCard } from "../../content/faces.js";
import type { GameError } from "../../model/errors.js";
import type { CardInstanceId, FaceCardId, PlayerId } from "../../model/ids.js";
import { isAttributeSymbol } from "../../model/symbols.js";
import { diceOf } from "../../rules/dice.js";
import { OVERCHARGE_ONCE_PER_TURN_KEY } from "../../rules/overcharge.js";
import { emit, patchPlayer, type Draft } from "../draft.js";
import { isPlayerSpent, markPlayerSpent } from "../triggerSpent.js";
import { moveCard } from "../zones.js";

/**
 * Spend any hand card to Overcharge one attribute face card on the actor's
 * dice (spec `021`). No pile cost, draw, yield, or reaction window. Pips are
 * player-scoped and shared across copies. The pip is the spent card's
 * attribute.
 */
export function overchargeCard(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  faceCardId: FaceCardId,
): GameError | null {
  if (draft.phase !== "actions") return "INVALID_PHASE";

  const card = draft.cards[cardInstanceId];
  if (card === undefined) return "UNKNOWN_ENTITY";
  if (card.ownerId !== playerId || card.zone !== "hand") return "CARD_NOT_AVAILABLE";

  const definition = getCard(card.cardId);
  if (definition === undefined) return "UNKNOWN_ENTITY";

  if (isPlayerSpent(draft, playerId, OVERCHARGE_ONCE_PER_TURN_KEY)) {
    return "ALREADY_USED";
  }

  const face = getFaceCard(faceCardId);
  if (face === undefined || !isAttributeSymbol(face.symbol)) return "INVALID_FACE";

  const onOwnDie = diceOf(draft, playerId).some((die) =>
    die.slots.some((slot) => slot.faceCardId === faceCardId),
  );
  if (!onOwnDie) return "INVALID_TARGET";

  const player = draft.players[playerId];
  if (player === undefined) return "UNKNOWN_ENTITY";
  const attribute = definition.attribute;
  patchPlayer(draft, playerId, {
    overchargeByFace: {
      ...player.overchargeByFace,
      [faceCardId]: [...(player.overchargeByFace[faceCardId] ?? []), attribute],
    },
  });
  markPlayerSpent(draft, playerId, OVERCHARGE_ONCE_PER_TURN_KEY);
  moveCard(draft, cardInstanceId, "graveyard");
  emit(draft, {
    type: "face-overcharged",
    playerId,
    cardInstanceId,
    faceCardId,
    attribute,
  });
  return null;
}
