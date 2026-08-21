import type { Attribute } from "../model/attributes.js";
import type { CardType, CardZone, RitualOrientation } from "../model/cards.js";
import type { BattlefieldPosition } from "../model/creatures.js";
import type { CardInstanceId, CreatureId, FaceCardId, PlayerId } from "../model/ids.js";
import type { AttributeTokens } from "../model/symbols.js";
import { getCard } from "../content/cards.js";
import { getFaceCard } from "../content/faces.js";
import type { RNG } from "../rng/rng.js";
import { emit, patchCreature, patchPlayer, type Draft } from "./draft.js";
import { fireOnChangePosition, fireOnDiscard } from "./triggers.js";

/**
 * Moving cards between deck, hand, graveyard, equipment, overload and ritual.
 * Every move goes through `moveCard` so that a card's `zone` field and the
 * owning player's ordered list can never disagree — the invariant tests assert
 * exactly that.
 *
 * Detaching from a creature or face card is the caller's job when the move is
 * not going through `destroyEquipment` / `destroyOverload`.
 */

function clearAttachmentFields(to: CardZone): {
  attachedToCreatureId: CreatureId | null;
  attachedToFaceCardId: FaceCardId | null;
  ritualOrientation: RitualOrientation | null;
  ritualProgress: AttributeTokens | null;
  ritualProgressCreditedThisTurn: readonly Attribute[] | null;
} {
  const onRitual = to === "ritual";
  return {
    attachedToCreatureId: null,
    attachedToFaceCardId: null,
    ritualOrientation: onRitual ? "preparing" : null,
    ritualProgress: onRitual ? {} : null,
    ritualProgressCreditedThisTurn: onRitual ? [] : null,
  };
}

export function moveCard(draft: Draft, cardInstanceId: CardInstanceId, to: CardZone): void {
  const card = draft.cards[cardInstanceId];
  if (card === undefined || card.zone === to) return;

  const player = draft.players[card.ownerId];
  if (player === undefined) return;

  const from = card.zone;
  const cleared = clearAttachmentFields(to);
  draft.cards[cardInstanceId] = {
    ...card,
    zone: to,
    ...cleared,
    // Callers that need attachments set them after the move (attachEquipment /
    // attachOverload / placeRitual). Ritual keeps preparing until refreshed.
    ritualOrientation: to === "ritual" ? (card.ritualOrientation ?? "preparing") : null,
    ritualProgress: to === "ritual" ? (card.ritualProgress ?? {}) : null,
    ritualProgressCreditedThisTurn:
      to === "ritual" ? (card.ritualProgressCreditedThisTurn ?? []) : null,
  };
  patchPlayer(draft, card.ownerId, {
    [from]: player[from].filter((id) => id !== cardInstanceId),
    [to]: [...player[to], cardInstanceId],
  });
}

/**
 * Drawing takes from the front of the deck. An empty deck is not an error and
 * costs nothing: the register settles running out as simply stopping, so this
 * logs the fact and returns.
 */
export function drawCards(draft: Draft, playerId: PlayerId, amount: number): void {
  for (let drawn = 0; drawn < amount; drawn += 1) {
    const player = draft.players[playerId];
    const cardInstanceId = player?.deck[0];
    if (cardInstanceId === undefined) {
      emit(draft, { type: "deck-empty", playerId });
      return;
    }

    moveCard(draft, cardInstanceId, "hand");
    emit(draft, { type: "card-drawn", playerId, cardInstanceId });
  }
}

/**
 * Darkness mill: top of deck → that player's graveyard. Not hand discard and
 * does not fire `on-discard`. Empty / short decks mill what remains (spec `015`).
 */
export function millCards(draft: Draft, playerId: PlayerId, amount: number): void {
  const milled: CardInstanceId[] = [];
  for (let i = 0; i < amount; i += 1) {
    const player = draft.players[playerId];
    const cardInstanceId = player?.deck[0];
    if (cardInstanceId === undefined) break;
    moveCard(draft, cardInstanceId, "graveyard");
    milled.push(cardInstanceId);
  }
  if (milled.length > 0) {
    emit(draft, { type: "cards-milled", playerId, cardInstanceIds: milled });
  }
}

/**
 * Discards the named hand cards. Used after the player resolves a pending
 * discard choice (Eclipse and similar).
 */
export function discardSpecificCards(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceIds: readonly CardInstanceId[],
): void {
  let discarded = 0;
  for (const cardInstanceId of cardInstanceIds) {
    const card = draft.cards[cardInstanceId];
    if (card === undefined || card.ownerId !== playerId || card.zone !== "hand") continue;
    moveCard(draft, cardInstanceId, "graveyard");
    emit(draft, { type: "card-discarded", playerId, cardInstanceId });
    discarded += 1;
  }
  if (discarded > 0) fireOnDiscard(draft, playerId);
}

/**
 * @deprecated Prefer pending discard + discardSpecificCards. Kept for callers
 * that still need a deterministic fallback (empty hand is a no-op).
 *
 * Discards from the front of the hand — the card held longest.
 */
export function discardCards(draft: Draft, playerId: PlayerId, amount: number): void {
  for (let discarded = 0; discarded < amount; discarded += 1) {
    const player = draft.players[playerId];
    const cardInstanceId = player?.hand[0];
    if (cardInstanceId === undefined) return;

    moveCard(draft, cardInstanceId, "graveyard");
    emit(draft, { type: "card-discarded", playerId, cardInstanceId });
  }
}

/** Deck cards that match a search filter, in current deck order. */
export function searchableDeckCards(
  draft: Draft,
  playerId: PlayerId,
  filter: readonly CardType[],
): readonly CardInstanceId[] {
  const player = draft.players[playerId];
  if (player === undefined) return [];

  return player.deck.filter((id) => {
    const card = draft.cards[id];
    if (card === undefined) return false;
    const definition = getCard(card.cardId);
    if (definition === undefined) return false;
    return filter.includes(definition.type);
  });
}

/**
 * Fisher–Yates on the player's remaining deck. Uses the same injectable RNG as
 * rolls so a mid-match search stays replayable from the action log.
 */
export function shuffleDeck(draft: Draft, playerId: PlayerId, rng: RNG): void {
  const player = draft.players[playerId];
  if (player === undefined || player.deck.length <= 1) return;

  const deck = [...player.deck];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = rng.integer(0, i);
    const a = deck[i];
    const b = deck[j];
    if (a === undefined || b === undefined) continue;
    deck[i] = b;
    deck[j] = a;
  }
  patchPlayer(draft, playerId, { deck });
}

/**
 * Attaches a card already moved (or about to be moved) into the equipment zone
 * onto a creature. Keeps the creature's list and the card's attachment pointer
 * in lockstep.
 */
export function attachEquipment(
  draft: Draft,
  cardInstanceId: CardInstanceId,
  creatureId: CreatureId,
): void {
  const card = draft.cards[cardInstanceId];
  const creature = draft.creatures[creatureId];
  if (card === undefined || creature === undefined) return;

  draft.cards[cardInstanceId] = {
    ...card,
    attachedToCreatureId: creatureId,
    zone: "equipment",
    attachedToFaceCardId: null,
    ritualOrientation: null,
    ritualProgress: null,
    ritualProgressCreditedThisTurn: null,
  };
  if (!creature.equipmentIds.includes(cardInstanceId)) {
    patchCreature(draft, creatureId, {
      equipmentIds: [...creature.equipmentIds, cardInstanceId],
    });
  }
  emit(draft, { type: "equipment-attached", cardInstanceId, creatureId });
}

/** Sends one attached card to its owner's graveyard and clears the creature. */
export function destroyEquipment(draft: Draft, cardInstanceId: CardInstanceId): void {
  const card = draft.cards[cardInstanceId];
  if (card === undefined || card.zone !== "equipment") return;

  const creatureId = card.attachedToCreatureId;
  if (creatureId !== null) {
    const creature = draft.creatures[creatureId];
    if (creature !== undefined) {
      patchCreature(draft, creatureId, {
        equipmentIds: creature.equipmentIds.filter((id) => id !== cardInstanceId),
      });
    }
    emit(draft, { type: "equipment-destroyed", cardInstanceId, creatureId });
  }

  moveCard(draft, cardInstanceId, "graveyard");
}

/** When a creature dies, its gear leaves with it. */
export function releaseEquipmentOn(draft: Draft, creatureId: CreatureId): void {
  const creature = draft.creatures[creatureId];
  if (creature === undefined) return;
  for (const cardInstanceId of [...creature.equipmentIds]) {
    destroyEquipment(draft, cardInstanceId);
  }
}

/**
 * Attaches an Overload onto a face card. Every die face that references this
 * face card will fire the overload when that face is rolled.
 */
export function attachOverload(
  draft: Draft,
  cardInstanceId: CardInstanceId,
  faceCardId: FaceCardId,
): void {
  const card = draft.cards[cardInstanceId];
  if (card === undefined) return;

  draft.cards[cardInstanceId] = {
    ...card,
    zone: "overload",
    attachedToCreatureId: null,
    attachedToFaceCardId: faceCardId,
    ritualOrientation: null,
    ritualProgress: null,
    ritualProgressCreditedThisTurn: null,
  };

  emit(draft, {
    type: "overload-attached",
    cardInstanceId,
    faceCardId,
    playerId: card.ownerId,
  });
}

/** Detaches an Overload from its face card and sends the card to the graveyard. */
export function destroyOverload(draft: Draft, cardInstanceId: CardInstanceId): void {
  const card = draft.cards[cardInstanceId];
  if (card === undefined || card.zone !== "overload") return;

  const faceCardId = card.attachedToFaceCardId;
  if (faceCardId !== null) {
    emit(draft, {
      type: "overload-detached",
      cardInstanceId,
      faceCardId,
      playerId: card.ownerId,
    });
  }

  moveCard(draft, cardInstanceId, "graveyard");
}

/**
 * Sends a field ritual to its owner's graveyard (orientation / progress cleared
 * by `moveCard`). Spec `011` — Dispel Circle.
 */
export function destroyRitual(draft: Draft, cardInstanceId: CardInstanceId): void {
  const card = draft.cards[cardInstanceId];
  if (card === undefined || card.zone !== "ritual") return;

  emit(draft, {
    type: "ritual-destroyed",
    cardInstanceId,
    playerId: card.ownerId,
  });
  moveCard(draft, cardInstanceId, "graveyard");
}

/** When a face card leaves play (last copy orphaned), its overloads leave too. */
export function clearOverloadsOnFace(
  draft: Draft,
  faceCardId: FaceCardId,
  ownerId: PlayerId,
): void {
  const player = draft.players[ownerId];
  if (player === undefined) return;
  for (const cardInstanceId of [...player.overload]) {
    const card = draft.cards[cardInstanceId];
    if (card?.attachedToFaceCardId === faceCardId) {
      destroyOverload(draft, cardInstanceId);
    }
  }
}

export function placeRitual(draft: Draft, cardInstanceId: CardInstanceId): void {
  const card = draft.cards[cardInstanceId];
  if (card === undefined) return;

  draft.cards[cardInstanceId] = {
    ...card,
    zone: "ritual",
    attachedToCreatureId: null,
    attachedToFaceCardId: null,
    ritualOrientation: "preparing",
    ritualProgress: {},
    ritualProgressCreditedThisTurn: [],
  };
  emit(draft, { type: "ritual-placed", cardInstanceId, playerId: card.ownerId });
}

export function setRitualOrientation(
  draft: Draft,
  cardInstanceId: CardInstanceId,
  orientation: RitualOrientation,
): void {
  const card = draft.cards[cardInstanceId];
  if (card === undefined || card.zone !== "ritual") return;
  if (card.ritualOrientation === orientation) return;

  draft.cards[cardInstanceId] = { ...card, ritualOrientation: orientation };
  emit(draft, { type: "ritual-orientation-changed", cardInstanceId, orientation });
}

/**
 * Whether a face card can host this overload, given printed restrictions and
 * remaining capacity on that face card (shared across all die faces).
 */
export function overloadFitsFace(
  draft: Draft,
  cardInstanceId: CardInstanceId,
  faceCardId: FaceCardId,
  ownerId: PlayerId,
): boolean {
  const card = draft.cards[cardInstanceId];
  const definition = card === undefined ? undefined : getCard(card.cardId);
  const region = definition?.overload;
  if (region === undefined) return false;

  const face = getFaceCard(faceCardId);
  if (face === undefined) return false;

  const installed = Object.values(draft.dice).some(
    (die) =>
      die.ownerId === ownerId &&
      die.slots.some(
        (slot) => slot.faceCardId === faceCardId && slot.faceCardOwnerId === ownerId,
      ),
  );
  if (!installed) return false;

  const current = (draft.players[ownerId]?.overload ?? [])
    .map((id) => draft.cards[id])
    .filter((candidate) => candidate?.attachedToFaceCardId === faceCardId).length;
  if (current >= face.maxOverloads) return false;

  if (region.faceSymbols !== undefined && !region.faceSymbols.includes(face.symbol)) {
    return false;
  }
  if (region.faceKinds !== undefined && !region.faceKinds.includes(face.kind)) {
    return false;
  }
  return true;
}

/**
 * Single mover entry point so standing `on-change-position` triggers always fire
 * (Hunter's Collar). Callers must not patch `position` directly.
 */
export function setCreaturePosition(
  draft: Draft,
  creatureId: CreatureId,
  to: BattlefieldPosition,
): void {
  const creature = draft.creatures[creatureId];
  if (creature === undefined || creature.defeated) return;
  if (creature.position === to) return;
  const from = creature.position;
  patchCreature(draft, creatureId, { position: to });
  fireOnChangePosition(draft, creatureId, from, to);
}

/**
 * Swap two living **allied** creatures via `setCreaturePosition`. Opposing
 * pairs whiff (enemy push/move is banned). Same creature or same position is a
 * no-op (Garuda already frontline swapping with another frontline).
 */
export function swapCreaturePositions(
  draft: Draft,
  firstId: CreatureId,
  secondId: CreatureId,
): void {
  if (firstId === secondId) return;
  const first = draft.creatures[firstId];
  const second = draft.creatures[secondId];
  if (first === undefined || second === undefined) return;
  if (first.defeated || second.defeated) return;
  if (first.ownerId !== second.ownerId) return;
  const firstTo = second.position;
  const secondTo = first.position;
  setCreaturePosition(draft, firstId, firstTo);
  setCreaturePosition(draft, secondId, secondTo);
}
