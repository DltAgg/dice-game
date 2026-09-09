import { getFaceCard } from "../../content/faces.js";
import { FACE_SLOTS_PER_DIE, type DieState } from "../../model/dice.js";
import type { GameError } from "../../model/errors.js";
import { type DieId, type PlayerId } from "../../model/ids.js";
import type { RNG } from "../../rng/rng.js";
import { opponentOf } from "../../rules/creatures.js";
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
import { offerConvertRollChoice } from "./convertRollChoice.js";
import {
  bankableShownFaceIdsByOwner,
  createShowingFacePips,
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
 * Both players' dice are rolled (pips created, showing slots known) before
 * On roll fires so dice-geometry conditions can see both of **that owner's**
 * faces (spec `025`). The active player issues the single `ROLL_DICE`.
 */
export function rollDice(draft: Draft, playerId: PlayerId, rng: RNG): GameError | null {
  if (draft.phase !== "roll") return "INVALID_PHASE";

  const rolled: ShownFaceRollEntry[] = [];

  draft.facesAppearedThisRoll = [];

  const seats: readonly PlayerId[] = [playerId, opponentOf(draft, playerId)];
  for (const seat of seats) {
    for (const die of diceOf(draft, seat)) {
      const entry = rollOneDie(draft, die, rng);
      if (entry !== undefined) rolled.push(entry);
    }
  }

  // Fire onRoll in die order (later dice push on top so LIFO resolves
  // active die0, active die1, opponent die0, opponent die1). Both of each
  // owner's showing faces are already known (geometry). Convert faces open
  // Choose one instead of auto-forfeiting. Controller is the die owner.
  for (const entry of [...rolled].reverse()) {
    const shown = getFaceCard(entry.faceCardId);
    if (entry.converting && shown !== undefined) {
      offerConvertRollChoice(draft, entry.ownerId, entry.dieId, entry.slotIndex, shown);
      continue;
    }
    fireShownFaceRollHooks(
      draft,
      entry.ownerId,
      entry.dieId,
      entry.slotIndex,
      entry.faceCardId,
      entry.symbol,
      entry.suppressInherent,
    );
  }

  drainResolution(draft);

  const deferAbsorb =
    draft.pendingDecision !== null || draft.resolutionStack.length > 0;
  for (const [ownerId, ids] of bankableShownFaceIdsByOwner(rolled)) {
    bankRolledSymbols(draft, ownerId, ids, deferAbsorb);
  }

  if (!deferAbsorb) {
    drainResolution(draft);
  }

  return enterPhase(draft, "actions");
}

/**
 * Randomize or keep one die. Pips, yield, and Overcharge use the die owner.
 * Retain is never randomized while `keepsPreviousResult`; spend retain only
 * when the owner is the active player.
 */
function rollOneDie(draft: Draft, die: DieState, rng: RNG): ShownFaceRollEntry | undefined {
  const ownerId = die.ownerId;

  if (isDieStunned(die)) {
    emit(draft, { type: "die-skipped", dieId: die.id, reason: "stunned" });
    return undefined;
  }

  let slotIndex: number;
  let keptByRetain = false;
  if (keepsPreviousResult(die) && die.rolledSlotIndex !== null) {
    slotIndex = die.rolledSlotIndex;
    keptByRetain = true;
    emit(draft, { type: "die-skipped", dieId: die.id, reason: "retained" });
    if (die.ownerId === draft.activePlayerId) {
      patchDie(draft, die.id, { retained: false });
      emit(draft, { type: "die-released", dieId: die.id, playerId: ownerId });
    }
  } else {
    slotIndex = rng.integer(0, FACE_SLOTS_PER_DIE - 1);
    patchDie(draft, die.id, { rolledSlotIndex: slotIndex });
  }

  const liveDie = draft.dice[die.id] ?? die;
  const slot = liveDie.slots[slotIndex];
  if (slot === undefined) return undefined;
  const face = getFaceCard(slot.faceCardId);
  if (face === undefined) return undefined;

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

  const symbolIds = createShowingFacePips(draft, ownerId, die.id, slotIndex, face);
  const silenced = isSlotSilenced(draft, die.id, slotIndex);
  const converting = isConvertingShownFace(face, silenced, suppressInherent);
  const entry: ShownFaceRollEntry = {
    dieId: die.id,
    ownerId,
    slotIndex,
    faceCardId: slot.faceCardId,
    symbol: face.symbol,
    suppressInherent,
    symbolIds,
    converting,
  };
  appendFaceAppeared(draft, die.id, slotIndex, slot.faceCardId, face.kind);

  const showingSlot = draft.dice[die.id]?.slots[slotIndex] ?? slot;
  if (!skipRollYieldAndOvercharge(face, silenced)) {
    applyForgeYieldGenerate(draft, ownerId, showingSlot, face.symbol);
    applyOverchargeGenerate(draft, ownerId, showingSlot.faceCardId);
  }

  return entry;
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
