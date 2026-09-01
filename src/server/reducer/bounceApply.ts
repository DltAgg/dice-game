import type { EffectDefinition } from "../model/effects.js";
import type { CardInstanceId } from "../model/ids.js";
import type { PendingEffect } from "../model/state.js";
import type { BounceHost, BounceHostChoice } from "../model/targeting.js";
import {
  collectLegalBounceCards,
  uniqueBounceHosts,
} from "../rules/bounce.js";
import { emit, patchCreature, type Draft } from "./draft.js";
import { moveCard } from "./zones.js";

function hostsOf(effect: EffectDefinition & { type: "bounce" }): readonly BounceHost[] {
  if (effect.target.kind === "choose-opponent-bounce-card") {
    return uniqueBounceHosts(effect.target.hosts);
  }
  return uniqueBounceHosts(effect.hosts);
}

export function withBounceDeclaredTarget(
  effect: EffectDefinition & { type: "bounce" },
  choice: BounceHostChoice,
): EffectDefinition {
  if (choice.host === "ritual") {
    return { ...effect, target: { kind: "declared-ritual" } };
  }
  if (choice.host === "equipment") {
    return { ...effect, target: { kind: "declared-equipment" } };
  }
  return { ...effect, target: { kind: "declared-overload" } };
}

/**
 * Opens a mixed opposing-card pending when `effect` is bounce with
 * `choose-opponent-bounce-card`. Returns `null` when this is not that kind.
 * `true` = paused; `false` = legal whiff.
 */
export function tryOpenBounceChoice(
  draft: Draft,
  pending: PendingEffect,
  effect: EffectDefinition,
): boolean | null {
  if (effect.type !== "bounce") return null;
  if (effect.target.kind !== "choose-opponent-bounce-card") return null;

  const hosts = hostsOf(effect);
  const legal = collectLegalBounceCards(draft, pending.controllerId, hosts);
  if (legal.length === 0) {
    emit(draft, { type: "effect-resolved", effectId: pending.id, effectType: effect.type });
    return false;
  }

  draft.pendingDecision = {
    type: "choose-bounce-card",
    controllerId: pending.controllerId,
    hosts,
    deferred: pending,
  };
  emit(draft, {
    type: "choose-bounce-card-started",
    playerId: pending.controllerId,
    hosts,
  });
  return true;
}

export function applyBounce(
  draft: Draft,
  pending: PendingEffect,
  effect: EffectDefinition,
): boolean {
  if (effect.type !== "bounce") return false;
  const target = effect.target;
  if (
    target.kind !== "declared-ritual" &&
    target.kind !== "declared-equipment" &&
    target.kind !== "declared-overload"
  ) {
    return false;
  }
  const cardId = pending.declaredTargetCardInstanceId;
  if (cardId === null) return false;
  bounceCardToOwnerHand(draft, cardId);
  return false;
}

/**
 * Detach a field ritual / equipment / overload and return it to its owner's
 * hand. Not destroy (no GY, no `*-destroyed`) and not discard.
 */
export function bounceCardToOwnerHand(draft: Draft, cardInstanceId: CardInstanceId): void {
  const card = draft.cards[cardInstanceId];
  if (card === undefined) return;
  const fromZone = card.zone;
  if (fromZone !== "ritual" && fromZone !== "equipment" && fromZone !== "overload") return;

  if (fromZone === "equipment") {
    const creatureId = card.attachedToCreatureId;
    if (creatureId !== null) {
      const creature = draft.creatures[creatureId];
      if (creature !== undefined) {
        patchCreature(draft, creatureId, {
          equipmentIds: creature.equipmentIds.filter((id) => id !== cardInstanceId),
        });
      }
    }
  }

  moveCard(draft, cardInstanceId, "hand");
  const moved = draft.cards[cardInstanceId];
  if (moved !== undefined && moved.silenceExpiresOnTurn !== undefined) {
    draft.cards[cardInstanceId] = Object.fromEntries(
      Object.entries(moved).filter(([key]) => key !== "silenceExpiresOnTurn"),
    ) as typeof moved;
  }

  emit(draft, {
    type: "card-bounced",
    cardInstanceId,
    fromZone,
    ownerId: card.ownerId,
  });
}
