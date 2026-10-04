import { getCard } from "../../content/cards.js";
import { getFaceCard } from "../../content/faces.js";
import type { GameError } from "../../model/errors.js";
import type { CardInstanceId, DieId, FaceCardId, PlayerId } from "../../model/ids.js";
import {
  countInstalledCopies,
  eligibleFacesForForge,
  overwrittenSlot,
  returnFaceToPoolIfOrphaned,
  slotCannotBeReplacedByForge,
  takeFaceFromPool,
  withForgeLockResetOnInstall,
} from "../../rules/faces.js";
import { emit, patchDie, type Draft } from "../draft.js";
import { payForgeCost } from "../payments.js";
import { drainResolution, pushEffect } from "../resolution.js";
import { clearOverchargeOnFace, clearOverloadsOnFace, drawCards, moveCard } from "../zones.js";

export function activateFace(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
): GameError | null {
  if (draft.phase !== "actions") return "INVALID_PHASE";
  const die = draft.dice[dieId];
  if (die === undefined) return "UNKNOWN_ENTITY";
  if (die.ownerId !== playerId) return "INVALID_TARGET";
  if (die.rolledSlotIndex !== slotIndex) return "INVALID_FACE";
  const slot = die.slots[slotIndex];
  if (slot === undefined) return "INVALID_FACE";
  const face = getFaceCard(slot.faceCardId);
  if (face?.activated === undefined) return "CARD_HAS_NO_EFFECT";
  // The old payoff installed a Shield face. There is no Shield face.
  return "CARD_HAS_NO_EFFECT";
}

/**
 * Bible §13 install: first copy takes the face from the pool; further copies
 * of an already-installed face do not. Displaced faces return if orphaned.
 * Draws one card per face installed.
 */
export function installFacesOnDie(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId,
  slotIndexes: readonly number[],
  faceCardId: FaceCardId,
  cardInstanceId: CardInstanceId | null,
): GameError | null {
  const currentDie = draft.dice[dieId];
  if (currentDie === undefined) return "UNKNOWN_ENTITY";
  if (
    slotIndexes.some((index) => {
      const slot = currentDie.slots[index];
      return slot !== undefined && slotCannotBeReplacedByForge(slot);
    })
  ) {
    return "INVALID_FACE";
  }

  const alreadyInstalled = countInstalledCopies(draft, faceCardId, playerId) > 0;
  if (!alreadyInstalled && !takeFaceFromPool(draft, playerId, faceCardId)) {
    return "FACE_NOT_AVAILABLE";
  }

  const die = draft.dice[dieId];
  if (die === undefined) return "UNKNOWN_ENTITY";

  const ownDie = die.ownerId === playerId;
  const displaced: Array<{ faceCardId: FaceCardId; ownerId: PlayerId }> = [];
  const slots = withForgeLockResetOnInstall(
    die.slots.map((slot) => {
      if (!slotIndexes.includes(slot.index)) return slot;
      displaced.push({ faceCardId: slot.faceCardId, ownerId: slot.faceCardOwnerId });
      const next = overwrittenSlot(slot, faceCardId, playerId);
      return ownDie ? { ...next, forgeYield: true } : next;
    }),
    faceCardId,
  );
  patchDie(draft, dieId, { slots });

  for (const old of displaced) {
    returnFaceToPoolIfOrphaned(draft, old.faceCardId, old.ownerId);
    if (countInstalledCopies(draft, old.faceCardId, old.ownerId) === 0) {
      clearOverloadsOnFace(draft, old.faceCardId, old.ownerId);
      clearOverchargeOnFace(draft, old.faceCardId, old.ownerId);
    }
  }

  for (const slotIndex of slotIndexes) {
    emit(draft, { type: "face-forged", playerId, cardInstanceId, dieId, slotIndex, faceCardId });
  }

  drawCards(draft, playerId, slotIndexes.length);
  return null;
}

/**
 * The forge region (bible §13). Replacing a face is the only way an engine
 * changes, and the player names which slots to give up because that sacrifice
 * is the decision the card is really asking about.
 *
 * Synthetic forge: the first `FORGE_CARD` each turn is free; later ones burn
 * header pile `playCost` (with forge-discount). Natural forge is always free
 * and does not consume that waiver — play still pays the header when resolving
 * the effect region instead.
 */
export function forgeCard(
  draft: Draft,
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  dieId: DieId,
  slotIndexes: readonly number[],
  faceCardId: FaceCardId,
): GameError | null {
  // Play and forge share the actions window.
  if (draft.phase !== "actions") return "INVALID_PHASE";

  const card = draft.cards[cardInstanceId];
  if (card === undefined) return "UNKNOWN_ENTITY";
  if (card.ownerId !== playerId || card.zone !== "hand") return "CARD_NOT_AVAILABLE";

  const definition = getCard(card.cardId);
  if (definition === undefined) return "UNKNOWN_ENTITY";

  const { forge } = definition;
  const unique = new Set(slotIndexes);
  if (unique.size !== slotIndexes.length || slotIndexes.length !== forge.faces) {
    return "WRONG_FACE_COUNT";
  }

  const die = draft.dice[dieId];
  if (die === undefined) return "UNKNOWN_ENTITY";

  if (forge.target === "own-die") {
    if (die.ownerId !== playerId) return "INVALID_TARGET";
  } else if (die.ownerId === playerId) {
    return "INVALID_TARGET";
  }
  if (slotIndexes.some((index) => die.slots[index] === undefined)) return "INVALID_FACE";
  if (
    slotIndexes.some((index) => {
      const slot = die.slots[index];
      return slot !== undefined && slotCannotBeReplacedByForge(slot);
    })
  ) {
    return "INVALID_FACE";
  }

  const forgeCostError = payForgeCost(draft, playerId, definition);
  if (forgeCostError !== null) return forgeCostError;

  const eligible = eligibleFacesForForge(draft, playerId, definition);
  if (!eligible.includes(faceCardId)) return "FACE_NOT_AVAILABLE";

  const installed = installFacesOnDie(
    draft,
    playerId,
    dieId,
    slotIndexes,
    faceCardId,
    cardInstanceId,
  );
  if (installed !== null) return installed;

  // The card is consumed by being installed, so it goes to the graveyard rather
  // than staying available to be played for its effect as well.
  moveCard(draft, cardInstanceId, "graveyard");

  const forgeEffects = forge.effects ?? [];
  if (forgeEffects.length > 0) {
    for (const effect of [...forgeEffects].reverse()) {
      pushEffect(draft, playerId, effect, null, null, null, null, null, 0, cardInstanceId);
    }
    drainResolution(draft);
  }
  return null;
}
