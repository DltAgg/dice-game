import type { GameError } from "../../model/errors.js";
import type { DieId, FaceCardId, PlayerId } from "../../model/ids.js";
import {
  countInstalledCopies,
  overwrittenSlot,
  returnFaceToPoolIfOrphaned,
  takeFaceFromPool,
  withForgeLockResetOnInstall,
} from "../../rules/faces.js";
import { isLegalReforgeAssignment } from "../../rules/reforge.js";
import { resumeAfterEffectPause } from "../commands/priority.js";
import { emit, patchDie, type Draft } from "../draft.js";
import { clearOverchargeOnFace, clearOverloadsOnFace } from "../zones.js";

/**
 * Completes pending `[Reforge]` / `[Cross forge]`. Overwrites N slots on one
 * owned die with N synthetic destination faces from the pool. No forge-draw.
 */
export function resolveReplaceSyntheticFace(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId,
  slotIndexes: readonly number[],
  faceCardIds: readonly FaceCardId[],
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "replace-synthetic-face") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

  const spec = {
    faces: pending.faces,
    attribute: pending.attribute,
    ...(pending.fromAttribute !== undefined ? { fromAttribute: pending.fromAttribute } : {}),
  };
  if (!isLegalReforgeAssignment(draft, playerId, spec, dieId, slotIndexes, faceCardIds)) {
    return "INVALID_CHOICE";
  }

  const die = draft.dice[dieId];
  if (die === undefined) return "UNKNOWN_ENTITY";

  const displaced: Array<{ readonly faceCardId: FaceCardId; readonly ownerId: PlayerId }> = [];
  for (const slotIndex of slotIndexes) {
    const slot = die.slots[slotIndex];
    if (slot === undefined) return "INVALID_FACE";
    displaced.push({ faceCardId: slot.faceCardId, ownerId: slot.faceCardOwnerId });
  }

  for (const faceCardId of faceCardIds) {
    if (!takeFaceFromPool(draft, playerId, faceCardId)) return "FACE_NOT_AVAILABLE";
  }

  let slots = die.slots;
  for (let i = 0; i < slotIndexes.length; i++) {
    const slotIndex = slotIndexes[i];
    const faceCardId = faceCardIds[i];
    if (slotIndex === undefined || faceCardId === undefined) return "INVALID_CHOICE";
    slots = withForgeLockResetOnInstall(
      slots.map((candidate) =>
        candidate.index === slotIndex
          ? overwrittenSlot(candidate, faceCardId, playerId)
          : candidate,
      ),
      faceCardId,
    );
  }
  patchDie(draft, dieId, { slots });

  for (const gone of displaced) {
    returnFaceToPoolIfOrphaned(draft, gone.faceCardId, gone.ownerId);
    if (countInstalledCopies(draft, gone.faceCardId, gone.ownerId) === 0) {
      clearOverloadsOnFace(draft, gone.faceCardId, gone.ownerId);
      clearOverchargeOnFace(draft, gone.faceCardId, gone.ownerId);
    }
  }

  draft.pendingDecision = null;
  emit(draft, {
    type: "replace-synthetic-face-resolved",
    playerId,
    dieId,
    slotIndexes: [...slotIndexes],
    removedFaceCardIds: displaced.map((entry) => entry.faceCardId),
    installedFaceCardIds: [...faceCardIds],
  });
  return resumeAfterEffectPause(draft);
}
