import type { GameError } from "../model/errors.js";
import type { PlayerId } from "../model/ids.js";
import type { PendingEffect } from "../model/state.js";
import type { BounceHostChoice } from "../model/targeting.js";
import { collectLegalBounceCards, isLegalBounceChoice } from "../rules/bounce.js";
import { resumeAfterEffectPause } from "./commands/priority.js";
import { emit, type Draft } from "./draft.js";
import { applyDeferredEffect } from "./resolution.js";
import { withBounceDeclaredTarget } from "./bounceApply.js";

export function resolveChooseBounceCard(
  draft: Draft,
  playerId: PlayerId,
  choice: BounceHostChoice,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-bounce-card") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

  const effect = pending.deferred.effect;
  if (effect.type !== "bounce") return "INVALID_CHOICE";

  const legal = collectLegalBounceCards(draft, playerId, pending.hosts);
  if (!isLegalBounceChoice(legal, choice)) return "INVALID_CHOICE";

  draft.pendingDecision = null;
  emit(draft, { type: "choose-bounce-card-resolved", playerId, choice });

  const deferred: PendingEffect = {
    ...pending.deferred,
    effect: withBounceDeclaredTarget(effect, choice),
    declaredTargetCardInstanceId: choice.cardInstanceId,
  };
  applyDeferredEffect(draft, deferred);
  return resumeAfterEffectPause(draft);
}
