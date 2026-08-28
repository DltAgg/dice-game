import { getCard } from "../../content/cards.js";
import { getFaceCard } from "../../content/faces.js";
import { FACE_SLOTS_PER_DIE } from "../../model/dice.js";
import type { GameError } from "../../model/errors.js";
import {
  asSymbolInstanceId,
  type DieId,
  type FaceCardId,
  type PlayerId,
  type SymbolInstanceId,
} from "../../model/ids.js";
import type { SymbolType } from "../../model/symbols.js";
import type { RNG } from "../../rng/rng.js";
import { diceOf, isDieStunned, keepsPreviousResult } from "../../rules/dice.js";
import { bankAttributeIntoPile } from "../attributeBank.js";
import { emit, nextInstanceId, patchDie, type Draft } from "../draft.js";
import { drainResolution, pushEffect } from "../resolution.js";
import { fireEquipmentOnRollSymbol } from "../triggers.js";
import { enterPhase } from "./turn.js";

/* ---------------------------------------------------------------- roll --- */

/**
 * Bible §16 rolls the dice and generates symbols as consecutive steps. Symbol
 * generation carries no decision, so it happens here and shows up as its own
 * events rather than as a phase the player has to click through.
 */
export function rollDice(draft: Draft, playerId: PlayerId, rng: RNG): GameError | null {
  if (draft.phase !== "roll") return "INVALID_PHASE";

  const rolled: Array<{
    readonly dieId: DieId;
    readonly slotIndex: number;
    readonly faceCardId: FaceCardId;
    readonly symbol: SymbolType;
    readonly suppressInherent: boolean;
    readonly symbolId: SymbolInstanceId;
  }> = [];

  draft.facesAppearedThisRoll = [];

  for (const die of diceOf(draft, playerId)) {
    if (isDieStunned(die)) {
      emit(draft, { type: "die-skipped", dieId: die.id, reason: "stunned" });
      continue;
    }

    let slotIndex: number;
    let keptByRetain = false;
    if (keepsPreviousResult(die) && die.rolledSlotIndex !== null) {
      slotIndex = die.rolledSlotIndex;
      keptByRetain = true;
      emit(draft, { type: "die-skipped", dieId: die.id, reason: "retained" });
      // Single-turn retain: the keep is spent by this roll.
      patchDie(draft, die.id, { retained: false });
      emit(draft, { type: "die-released", dieId: die.id, playerId });
    } else {
      slotIndex = rng.integer(0, FACE_SLOTS_PER_DIE - 1);
      patchDie(draft, die.id, { rolledSlotIndex: slotIndex });
    }

    const liveDie = draft.dice[die.id] ?? die;
    const slot = liveDie.slots[slotIndex];
    if (slot === undefined) continue;
    const face = getFaceCard(slot.faceCardId);
    if (face === undefined) continue;

    // Consume suppressInherentNextRoll on every slot of this die this roll.
    let suppressInherent = false;
    let slotsChanged = false;
    const clearedSlots = liveDie.slots.map((candidate) => {
      if (candidate.suppressInherentNextRoll !== true) return candidate;
      slotsChanged = true;
      if (candidate.index === slotIndex) suppressInherent = true;
      return { ...candidate, suppressInherentNextRoll: false };
    });
    if (slotsChanged) {
      patchDie(draft, die.id, { slots: clearedSlots });
    }

    if (!keptByRetain) {
      emit(draft, { type: "die-rolled", dieId: die.id, slotIndex, symbol: face.symbol });
    }

    const symbolId = asSymbolInstanceId(nextInstanceId(draft, "symbol"));
    const locked = (draft.dice[die.id]?.slots[slotIndex] ?? slot).resourceLockedThisTurn === true;
    draft.symbols[symbolId] = {
      id: symbolId,
      ownerId: playerId,
      symbol: face.symbol,
      status: "rolled",
      sourceDieId: die.id,
      absorbedByCreatureId: null,
      ...(locked ? { usable: false } : {}),
    };
    emit(draft, {
      type: "symbol-generated",
      symbolId,
      symbol: face.symbol,
      ownerId: playerId,
      source: "roll",
    });
    rolled.push({
      dieId: die.id,
      slotIndex,
      faceCardId: slot.faceCardId,
      symbol: face.symbol,
      suppressInherent,
      symbolId,
    });
    draft.facesAppearedThisRoll = [
      ...draft.facesAppearedThisRoll,
      {
        dieId: die.id,
        slotIndex,
        faceCardId: slot.faceCardId,
        kind: face.kind,
      },
    ];
  }

  // Fire onRoll after every inherent pip exists so "another symbol in the pool"
  // conditions (Gear, Resonance) see the full roll before attributes bank.
  for (const entry of rolled) {
    if (!entry.suppressInherent) {
      fireFaceOnRoll(draft, playerId, entry.dieId, entry.slotIndex);
    }
    fireOverloadsForShownFace(draft, playerId, entry.faceCardId, entry.dieId, entry.slotIndex);
    fireEquipmentOnRollSymbol(draft, playerId, entry.symbol);
  }

  drainResolution(draft);

  // Spec `016`: rolled attributes auto-bank into the pile (no assign click).
  // Shield and unusable/locked pips stay in the turn pool. Effect-generated
  // `available` symbols are not rolled here — they remain for [Requires].
  for (const entry of rolled) {
    bankRolledAttributeIfEligible(draft, playerId, entry.symbolId);
  }
  // If on-roll already opened a choice, leave On absorb effects on the stack
  // until that choice resolves — draining here would overwrite pendingDecision.
  if (draft.pendingDecision === null) {
    drainResolution(draft);
  }

  return enterPhase(draft, "actions");
}

function fireFaceOnRoll(
  draft: Draft,
  controllerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
): void {
  const die = draft.dice[dieId];
  const slot = die?.slots[slotIndex];
  if (slot === undefined) return;
  const face = getFaceCard(slot.faceCardId);
  if (face === undefined || face.onRoll.length === 0) return;

  for (const effect of [...face.onRoll].reverse()) {
    pushEffect(draft, controllerId, effect, null, null, null, dieId, slotIndex);
  }
}

/**
 * Any overload sitting on this face card fires once for each die that shows
 * that face after the roll. Die faces only reference the card; overloads live
 * on the card.
 */
function fireOverloadsForShownFace(
  draft: Draft,
  controllerId: PlayerId,
  faceCardId: FaceCardId,
  dieId: DieId,
  slotIndex: number,
): void {
  const player = draft.players[controllerId];
  if (player === undefined) return;

  for (const cardInstanceId of player.overload) {
    const card = draft.cards[cardInstanceId];
    if (card?.attachedToFaceCardId !== faceCardId) continue;
    const region = getCard(card.cardId)?.overload;
    if (region === undefined) continue;
    for (const effect of [...region.onRoll].reverse()) {
      pushEffect(
        draft,
        controllerId,
        effect,
        null,
        null,
        null,
        dieId,
        slotIndex,
        0,
        cardInstanceId,
      );
    }
  }
}

/**
 * Bible §21: the player chooses whether a die keeps its showing face for one
 * subsequent roll. Retention clears automatically after that keep is spent;
 * releasing early is what lets the die roll freely before then.
 */
export function retainDie(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId,
  retain: boolean,
): GameError | null {
  const die = draft.dice[dieId];
  if (die === undefined) return "UNKNOWN_ENTITY";
  if (die.ownerId !== playerId) return "INVALID_TARGET";

  if (retain) {
    if (isDieStunned(die)) return "DIE_STUNNED";
    if (die.rolledSlotIndex === null) return "INVALID_TARGET";
    if (die.retained) return null;
    patchDie(draft, dieId, { retained: true });
    emit(draft, { type: "die-retained", dieId, playerId });
    return null;
  }

  if (!die.retained) return null;
  patchDie(draft, dieId, { retained: false });
  emit(draft, { type: "die-released", dieId, playerId });
  return null;
}

/** After ROLL_DICE onRoll resolves: bank remaining rolled attributes. */
function bankRolledAttributeIfEligible(
  draft: Draft,
  playerId: PlayerId,
  symbolId: SymbolInstanceId,
): void {
  bankAttributeIntoPile(draft, playerId, symbolId);
}
