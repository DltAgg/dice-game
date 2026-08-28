import { getCreatureDefinition } from "../../content/creatures.js";
import type { GameError } from "../../model/errors.js";
import type { PlayerId } from "../../model/ids.js";
import type { ChainLink } from "../../model/state.js";
import { opponentOf } from "../../rules/creatures.js";
import { attackIgnoreShieldAmount } from "../../rules/discounts.js";
import { emit, type Draft } from "../draft.js";
import { drainResolution, pushEffect } from "../resolution.js";
import {
  attachEquipment,
  attachOverload,
  moveCard,
  placeRitual,
  refreshRitualOrientations,
} from "../zones.js";
import { finishRitualActivation } from "./ritual.js";

export function passPriority(draft: Draft, playerId: PlayerId): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "reaction-priority") return "INVALID_PHASE";
  if (pending.priorityPlayerId !== playerId) return "NOT_PRIORITY_PLAYER";

  const consecutivePasses = pending.consecutivePasses + 1;
  if (consecutivePasses >= 2) {
    draft.pendingDecision = null;
    emit(draft, {
      type: "priority-passed",
      playerId,
      nextPriorityPlayerId: null,
    });
    return drainChain(draft);
  }

  const nextPriorityPlayerId = opponentOf(draft, playerId);
  draft.pendingDecision = {
    type: "reaction-priority",
    priorityPlayerId: nextPriorityPlayerId,
    consecutivePasses,
  };
  emit(draft, {
    type: "priority-passed",
    playerId,
    nextPriorityPlayerId,
  });
  return null;
}

export function resumeAfterEffectPause(draft: Draft): GameError | null {
  drainResolution(draft);
  if (draft.pendingDecision !== null) return null;
  return drainChain(draft);
}

/**
 * After both seats pass, resolve the remaining chain LILO without reopening
 * windows between links (ASSUMED in `008`).
 */
function drainChain(draft: Draft): GameError | null {
  while (draft.chainStack.length > 0) {
    if (draft.pendingDecision !== null) return null;

    const link = draft.chainStack.pop();
    if (link === undefined) break;

    conductLink(draft, link);
    if (draft.pendingDecision !== null) return null;
  }

  return null;
}

function conductLink(draft: Draft, link: ChainLink): void {
  const negated = link.negated;
  emit(draft, {
    type: "chain-link-resolved",
    linkId: link.id,
    kind: link.kind,
    negated,
  });

  if (negated) {
    if (link.kind === "ritual-activate") {
      // Activation costs were paid; exhaust / GY even when the body is negated.
      finishRitualActivation(draft, link);
    } else if (
      link.kind === "ritual-place" ||
      link.kind === "equip-attach" ||
      link.kind === "overload-attach"
    ) {
      if (link.cardInstanceId !== null) {
        moveCard(draft, link.cardInstanceId, "graveyard");
      }
    }
    return;
  }

  switch (link.kind) {
    case "tactic-effect": {
      for (const effect of [...link.effects].reverse()) {
        pushEffect(
          draft,
          link.controllerId,
          effect,
          link.sourceCreatureId,
          link.declaredTargetCreatureId,
          null,
          null,
          null,
          0,
          link.cardInstanceId,
        );
      }
      drainResolution(draft);
      return;
    }
    case "ritual-activate": {
      for (const effect of [...link.effects].reverse()) {
        pushEffect(
          draft,
          link.controllerId,
          effect,
          link.sourceCreatureId,
          link.declaredTargetCreatureId,
          null,
          null,
          null,
          0,
          link.cardInstanceId,
        );
      }
      drainResolution(draft);
      // Exhaust / GY after the body has opened any search (amount uses pre-GY size).
      finishRitualActivation(draft, link);
      return;
    }
    case "ritual-place": {
      if (link.cardInstanceId === null) return;
      moveCard(draft, link.cardInstanceId, "ritual");
      placeRitual(draft, link.cardInstanceId);
      refreshRitualOrientations(draft, link.controllerId);
      return;
    }
    case "equip-attach": {
      if (link.cardInstanceId === null || link.equipTargetCreatureId === null) return;
      moveCard(draft, link.cardInstanceId, "equipment");
      attachEquipment(draft, link.cardInstanceId, link.equipTargetCreatureId);
      return;
    }
    case "overload-attach": {
      if (link.cardInstanceId === null || link.overloadFaceCardId === null) return;
      moveCard(draft, link.cardInstanceId, "overload");
      attachOverload(draft, link.cardInstanceId, link.overloadFaceCardId);
      return;
    }
    case "attack": {
      if (link.attackEffect === null || link.attackerId === null || link.attackTargetId === null) {
        return;
      }
      const ignoreShield = attackIgnoreShieldAmount(draft, link.attackerId, link.controllerId);
      const followUps = link.attackFollowUpEffects;
      if (draft.bladeRainArmed[link.controllerId] === true) {
        const nextArmed = { ...draft.bladeRainArmed };
        delete nextArmed[link.controllerId];
        draft.bladeRainArmed = nextArmed;
        const amount = link.attackEffect.type === "damage" ? link.attackEffect.amount : 0;
        const attacker = draft.creatures[link.attackerId];
        const attackDef =
          attacker === undefined
            ? undefined
            : getCreatureDefinition(attacker.definitionId)?.attacks.find(
                (candidate) => candidate.id === link.attackId,
              );
        draft.pendingDecision = {
          type: "split-damage",
          controllerId: link.controllerId,
          amount,
          maxTargets: 6,
          attackerId: link.attackerId,
          range: attackDef?.range ?? false,
          sourceCreatureId: link.attackerId,
          ignoreShield,
          fromAttack: true,
          thenEffects: followUps,
        };
        return;
      }
      for (const follow of [...followUps].reverse()) {
        pushEffect(draft, link.controllerId, follow, link.attackerId, link.attackTargetId);
      }
      pushEffect(
        draft,
        link.controllerId,
        link.attackEffect,
        link.attackerId,
        link.attackTargetId,
        null,
        null,
        null,
        ignoreShield,
        null,
        true,
      );
      drainResolution(draft);
      return;
    }
  }
}
