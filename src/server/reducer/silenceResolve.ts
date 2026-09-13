import type { GameError } from "../model/errors.js";
import type { PlayerId } from "../model/ids.js";
import type { PendingEffect } from "../model/state.js";
import type { SilenceHostChoice } from "../model/targeting.js";
import { collectLegalSilenceHosts, isLegalSilenceChoice } from "../rules/silence.js";
import { resumeAfterEffectPause } from "./commands/priority.js";
import { emit, type Draft } from "./draft.js";
import { applyDeferredEffect } from "./resolution.js";
import { withSilenceDeclaredTarget } from "./silenceApply.js";

export function resolveChooseSilenceHost(
  draft: Draft,
  playerId: PlayerId,
  choice: SilenceHostChoice,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "choose-silence-host") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

  const effect = pending.deferred.effect;
  if (effect.type !== "silence") return "INVALID_CHOICE";

  const legal = collectLegalSilenceHosts(draft, playerId, pending.hosts);
  if (!isLegalSilenceChoice(legal, choice)) return "INVALID_CHOICE";

  draft.pendingDecision = null;
  emit(draft, { type: "choose-silence-host-resolved", playerId, choice });

  const deferred: PendingEffect = {
    ...pending.deferred,
    effect: withSilenceDeclaredTarget(effect, choice),
    declaredTargetCreatureId:
      choice.host === "creature" ? choice.creatureId : pending.deferred.declaredTargetCreatureId,
    declaredTargetCardInstanceId:
      choice.host === "ritual"
        ? choice.cardInstanceId
        : pending.deferred.declaredTargetCardInstanceId,
  };
  applyDeferredEffect(draft, deferred);
  return resumeAfterEffectPause(draft);
}
