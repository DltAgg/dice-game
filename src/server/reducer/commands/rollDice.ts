import { getFaceCard } from "../../content/faces.js";
import { FACE_SLOTS_PER_DIE } from "../../model/dice.js";
import type { GameError } from "../../model/errors.js";
import { type DieId, type PlayerId } from "../../model/ids.js";
import type { RNG } from "../../rng/rng.js";
import { diceOf, isDieStunned, keepsPreviousResult } from "../../rules/dice.js";
import { isSlotSilenced } from "../../rules/silence.js";
import { emit, patchDie, type Draft } from "../draft.js";
import { drainResolution } from "../resolution.js";
import { bankRolledSymbols } from "../rollBank.js";
import {
  appendFaceAppeared,
  applyForgeYieldGenerate,
  applyOverchargeGenerate,
  fireShownFaceRollHooks,
} from "./shownFace.js";
import {
  bankableShownFaceIds,
  createShowingFacePips,
  forfeitRolledPips,
  isConvertingShownFace,
  skipRollYieldAndOvercharge,
  type ShownFaceRollEntry,
} from "./rollPips.js";
import { enterPhase } from "./turn.js";

/* ---------------------------------------------------------------- roll --- */

/**
 * Bible §16 rolls the dice and generates symbols as consecutive steps. Symbol
 * generation carries no decision, so it happens here and shows up as its own
 * events rather than as a phase the player has to click through.
 *
 * Both dice are rolled (pips created, showing slots known) before onRoll fires
 * so dice-geometry conditions can see both faces (spec `025`).
 */
export function rollDice(draft: Draft, playerId: PlayerId, rng: RNG): GameError | null {
  if (draft.phase !== "roll") return "INVALID_PHASE";

  const rolled: ShownFaceRollEntry[] = [];

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

    const symbolIds = createShowingFacePips(draft, playerId, die.id, slotIndex, face);
    const silenced = isSlotSilenced(draft, die.id, slotIndex);
    const converting = isConvertingShownFace(face, silenced, suppressInherent);
    rolled.push({
      dieId: die.id,
      slotIndex,
      faceCardId: slot.faceCardId,
      symbol: face.symbol,
      suppressInherent,
      symbolIds,
      converting,
    });
    appendFaceAppeared(draft, die.id, slotIndex, slot.faceCardId, face.kind);

    const showingSlot = draft.dice[die.id]?.slots[slotIndex] ?? slot;
    if (!skipRollYieldAndOvercharge(face, silenced)) {
      applyForgeYieldGenerate(draft, playerId, showingSlot, face.symbol);
      applyOverchargeGenerate(draft, die.ownerId, showingSlot.faceCardId);
    }
  }

  // Fire onRoll in die order (later dice push on top so LIFO resolves left-to-right).
  // Both showing faces are already known (geometry).
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

  for (const entry of rolled) {
    if (entry.converting) forfeitRolledPips(draft, entry.symbolIds);
  }
  const bankableIds = bankableShownFaceIds(rolled);
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
