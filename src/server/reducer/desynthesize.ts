import { isAttribute } from "../model/attributes.js";
import type { EffectDefinition } from "../model/effects.js";
import type { DieId, FaceCardId, PlayerId } from "../model/ids.js";
import type { PendingEffect } from "../model/state.js";
import type { DieSlot } from "../model/dice.js";
import { getFaceCard, naturalFaceId } from "../content/faces.js";
import {
  countInstalledCopies,
  overwrittenSlot,
  returnFaceToPoolIfOrphaned,
} from "../rules/faces.js";
import { legalDieSlotsForFilter } from "../rules/targets.js";
import { emit, patchDie, type Draft } from "./draft.js";
import { clearOverchargeOnFace, clearOverloadsOnFace } from "./zones.js";

/**
 * Opens `choose-die-slot` (`any-synthetic`) when `effect` is desynthesize
 * with `choose-any-synthetic-slot`. Returns `null` when this is not that kind.
 * `true` = paused; `false` = legal whiff. Never optional.
 */
export function tryOpenDesynthesizeChoice(
  draft: Draft,
  pending: PendingEffect,
  effect: EffectDefinition,
): boolean | null {
  if (effect.type !== "desynthesize") return null;
  if (effect.target.kind !== "choose-any-synthetic-slot") return null;

  const legal = legalDieSlotsForFilter(draft, pending.controllerId, "any-synthetic");
  if (legal.length === 0) {
    emit(draft, { type: "effect-resolved", effectId: pending.id, effectType: effect.type });
    return false;
  }

  draft.pendingDecision = {
    type: "choose-die-slot",
    controllerId: pending.controllerId,
    filter: "any-synthetic",
    optional: false,
    deferred: pending,
  };
  return true;
}

export function applyDesynthesize(
  draft: Draft,
  _pending: PendingEffect,
  effect: EffectDefinition,
): boolean {
  if (effect.type !== "desynthesize") return false;
  const target = effect.target;
  if (target.kind !== "declared-die-slot") return false;
  desynthesizeSlot(draft, target.dieId, target.slotIndex);
  return false;
}

/**
 * Peel a synthetic attribute face back to that attribute's natural identity.
 * Not a forge (no draw). Not blocked by stay / forge-lock. Slot-local markers
 * clear because the face changed.
 */
export function desynthesizeSlot(draft: Draft, dieId: DieId, slotIndex: number): void {
  const die = draft.dice[dieId];
  const slot = die?.slots[slotIndex];
  if (die === undefined || slot === undefined) return;

  const face = getFaceCard(slot.faceCardId);
  if (face === undefined || face.kind !== "synthetic") return;
  if (!isAttribute(face.symbol)) return;

  const naturalId = naturalFaceId(face.symbol);
  const displaced: { readonly faceCardId: FaceCardId; readonly ownerId: PlayerId } = {
    faceCardId: slot.faceCardId,
    ownerId: slot.faceCardOwnerId,
  };

  const slots = die.slots.map((candidate) =>
    candidate.index === slotIndex ? peeledToNatural(candidate, naturalId, die.ownerId) : candidate,
  );
  patchDie(draft, dieId, { slots });

  returnFaceToPoolIfOrphaned(draft, displaced.faceCardId, displaced.ownerId);
  if (countInstalledCopies(draft, displaced.faceCardId, displaced.ownerId) === 0) {
    clearOverloadsOnFace(draft, displaced.faceCardId, displaced.ownerId);
    clearOverchargeOnFace(draft, displaced.faceCardId, displaced.ownerId);
  }

  emit(draft, {
    type: "face-desynthesized",
    dieId,
    slotIndex,
    fromFaceCardId: displaced.faceCardId,
    toFaceCardId: naturalId,
    dieOwnerId: die.ownerId,
    returnedOwnerId: displaced.ownerId,
  });
}

function peeledToNatural(slot: DieSlot, faceCardId: FaceCardId, faceCardOwnerId: PlayerId): DieSlot {
  const base = overwrittenSlot(slot, faceCardId, faceCardOwnerId);
  return {
    index: base.index,
    faceCardId: base.faceCardId,
    faceCardOwnerId: base.faceCardOwnerId,
    pestilenceCounters: 0,
    forgeLockRemaining: 0,
    forgeYield: false,
    corruptionMarkers: 0,
    suppressInherentNextRoll: false,
    resourceLockedThisTurn: false,
  };
}
