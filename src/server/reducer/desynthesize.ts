import type { EffectDefinition } from "../model/effects.js";
import type { DieId } from "../model/ids.js";
import type { PendingEffect } from "../model/state.js";
import { legalDieSlotsForFilter } from "../rules/targets.js";
import { emit, type Draft } from "./draft.js";

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

/** There is no Shield face to peel to, so the slot stays as it is. */
export function desynthesizeSlot(
  _draft: Draft,
  _dieId: DieId,
  _slotIndex: number,
): void {
  return;
}
