import { getFaceCard } from "../../content/faces.js";
import { FACE_SLOTS_PER_DIE } from "../../model/dice.js";
import type { GameError } from "../../model/errors.js";
import {
  type DieId,
  type FaceCardId,
  type PlayerId,
  type SymbolInstanceId,
} from "../../model/ids.js";
import type { SymbolType } from "../../model/symbols.js";
import type { RNG } from "../../rng/rng.js";
import { diceOf, isDieStunned, keepsPreviousResult } from "../../rules/dice.js";
import { emit, patchDie, type Draft } from "../draft.js";
import { drainResolution } from "../resolution.js";
import { bankRolledSymbols } from "../rollBank.js";
import {
  appendFaceAppeared,
  applyForgeYieldGenerate,
  applyOverchargeGenerate,
  createRolledDieSymbol,
  fireShownFaceRollHooks,
} from "./shownFace.js";
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

    const symbolId = createRolledDieSymbol(draft, playerId, die.id, slotIndex, face.symbol);
    rolled.push({
      dieId: die.id,
      slotIndex,
      faceCardId: slot.faceCardId,
      symbol: face.symbol,
      suppressInherent,
      symbolId,
    });
    appendFaceAppeared(draft, die.id, slotIndex, slot.faceCardId, face.kind);

    // Own-die forge yield: extra Generate of the showing face's attribute
    // (DECIDED 2026-08-29). Same auto-bank path as effect Generate.
    const showingSlot = draft.dice[die.id]?.slots[slotIndex] ?? slot;
    applyForgeYieldGenerate(draft, playerId, showingSlot, face.symbol);
    applyOverchargeGenerate(draft, playerId, showingSlot);
  }

  // Fire onRoll in die order (later dice push on top so LIFO resolves left-to-right).
  for (const entry of [...rolled].reverse()) {
    fireShownFaceRollHooks(
      draft,
      playerId,
      entry.dieId,
      entry.slotIndex,
      entry.faceCardId,
      entry.symbol,
      entry.suppressInherent,
    );
  }

  drainResolution(draft);

  const bankableIds = rolled
    .filter((entry) => !entry.suppressInherent)
    .map((entry) => entry.symbolId);
  const deferAbsorb =
    draft.pendingDecision !== null || draft.resolutionStack.length > 0;
  bankRolledSymbols(draft, playerId, bankableIds, deferAbsorb);

  if (!deferAbsorb) {
    drainResolution(draft);
  }

  return enterPhase(draft, "actions");
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
