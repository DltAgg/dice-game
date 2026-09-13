import type { GameError } from "../model/errors.js";
import type { DieId, PlayerId } from "../model/ids.js";
import type { PendingEffect } from "../model/state.js";
import { legalDieSlotsForFilter } from "../rules/targets.js";
import { resumeAfterEffectPause } from "./commands/priority.js";
import type { Draft } from "./draft.js";
import { applyDeferredEffect } from "./resolution.js";

export function resolveDesynthesizeDieSlot(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId | null,
  slotIndex: number | null,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-die-slot") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";
  if (pending.deferred.effect.type !== "desynthesize") return "INVALID_CHOICE";
  if (dieId === null || slotIndex === null) return "INVALID_CHOICE";

  const legal = legalDieSlotsForFilter(draft, playerId, pending.filter, {
    ...(pending.contextDieId !== undefined ? { contextDieId: pending.contextDieId } : {}),
    ...(pending.excludedSlotIndex !== undefined
      ? { excludedSlotIndex: pending.excludedSlotIndex }
      : {}),
  });
  if (!legal.some((entry) => entry.dieId === dieId && entry.slotIndex === slotIndex)) {
    return "INVALID_CHOICE";
  }

  const effect = pending.deferred.effect;
  draft.pendingDecision = null;
  const deferred: PendingEffect = {
    ...pending.deferred,
    effect: { ...effect, target: { kind: "declared-die-slot", dieId, slotIndex } },
  };
  applyDeferredEffect(draft, deferred);
  return resumeAfterEffectPause(draft);
}
