import type { GameError } from "../../model/errors.js";
import type { PlayerId } from "../../model/ids.js";
import { resumeAfterEffectPause } from "../commands/priority.js";
import { emit, type Draft } from "../draft.js";
import { pushEffect } from "../resolution.js";

/**
 * Completes a pending `choose-effect-mode`: push the chosen mode's effects
 * onto the resolution stack so they resolve in order.
 */
export function resolveChooseEffectMode(
  draft: Draft,
  playerId: PlayerId,
  modeIndex: number,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-effect-mode") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";
  if (modeIndex < 0 || modeIndex >= pending.modes.length) return "INVALID_CHOICE";

  const chosenMode = pending.modes[modeIndex];
  if (chosenMode === undefined) return "INVALID_CHOICE";

  const label = pending.modeLabels[modeIndex] ?? `Mode ${String(modeIndex + 1)}`;

  draft.pendingDecision = null;
  emit(draft, {
    type: "effect-mode-chosen",
    playerId,
    modeIndex,
    modeLabel: label,
  });

  for (const child of [...chosenMode].reverse()) {
    pushEffect(draft, playerId, child, null, null, null, null, null, 0, null);
  }

  return resumeAfterEffectPause(draft);
}
