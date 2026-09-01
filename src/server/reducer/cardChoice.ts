import type { EffectDefinition, TargetSelector } from "../model/effects.js";
import type { CardInstanceId, PlayerId } from "../model/ids.js";
import type { PendingEffect } from "../model/state.js";
import { opponentOf } from "../rules/creatures.js";
import { emit, type Draft } from "./draft.js";
import { destroyEquipment, destroyOverload, destroyRitual } from "./zones.js";

/**
 * Field-wide opposing card picks (`choose-opponent-ritual` / equipment /
 * overload). Same shape as Unwrite: always prompt when ≥1 eligible exists
 * (including exactly one); empty field is a legal whiff.
 */

export function opposingRitualIds(draft: Draft, controllerId: PlayerId): readonly CardInstanceId[] {
  const enemy = draft.players[opponentOf(draft, controllerId)];
  if (enemy === undefined) return [];
  return enemy.ritual.filter((id) => draft.cards[id]?.zone === "ritual");
}

export function opposingEquipmentIds(
  draft: Draft,
  controllerId: PlayerId,
): readonly CardInstanceId[] {
  const enemy = draft.players[opponentOf(draft, controllerId)];
  if (enemy === undefined) return [];
  return enemy.equipment.filter((id) => draft.cards[id]?.zone === "equipment");
}

export function opposingOverloadIds(
  draft: Draft,
  controllerId: PlayerId,
): readonly CardInstanceId[] {
  const enemy = draft.players[opponentOf(draft, controllerId)];
  if (enemy === undefined) return [];
  return enemy.overload.filter((id) => draft.cards[id]?.zone === "overload");
}

export function resolveDeclaredCardTarget(
  pending: PendingEffect,
  selector: TargetSelector,
): CardInstanceId | null {
  switch (selector.kind) {
    case "declared-ritual":
    case "declared-equipment":
    case "declared-overload":
      return pending.declaredTargetCardInstanceId;
    default:
      return null;
  }
}

function withDeclaredKind(
  effect: EffectDefinition,
  kind: "declared-ritual" | "declared-equipment" | "declared-overload",
): EffectDefinition {
  if (!("target" in effect) || typeof effect.target !== "object") return effect;
  return { ...effect, target: { kind } } as EffectDefinition;
}

/**
 * Opens a field-wide opposing card pending when `effect.target` is
 * `choose-opponent-*`. Returns `null` when this is not that kind of target.
 * `true` = paused on a choice; `false` = legal whiff (no eligible cards).
 */
export function tryOpenOpposingCardChoice(
  draft: Draft,
  pending: PendingEffect,
  effect: EffectDefinition,
): boolean | null {
  if (!("target" in effect) || typeof effect.target !== "object") return null;
  const kind = effect.target.kind;
  if (kind === "choose-opponent-ritual") {
    return openChoice(draft, pending, effect, {
      ids: opposingRitualIds(draft, pending.controllerId),
      pendingType: "ritual",
      declared: "declared-ritual",
    });
  }
  if (kind === "choose-opponent-equipment") {
    return openChoice(draft, pending, effect, {
      ids: opposingEquipmentIds(draft, pending.controllerId),
      pendingType: "equipment",
      declared: "declared-equipment",
    });
  }
  if (kind === "choose-opponent-overload") {
    return openChoice(draft, pending, effect, {
      ids: opposingOverloadIds(draft, pending.controllerId),
      pendingType: "overload",
      declared: "declared-overload",
    });
  }
  return null;
}

function openChoice(
  draft: Draft,
  pending: PendingEffect,
  effect: EffectDefinition,
  spec: {
    readonly ids: readonly CardInstanceId[];
    readonly pendingType: "ritual" | "equipment" | "overload";
    readonly declared: "declared-ritual" | "declared-equipment" | "declared-overload";
  },
): boolean {
  if (spec.ids.length === 0) {
    emit(draft, { type: "effect-resolved", effectId: pending.id, effectType: effect.type });
    return false;
  }
  const deferred = { ...pending, effect: withDeclaredKind(effect, spec.declared) };
  if (spec.pendingType === "ritual") {
    draft.pendingDecision = {
      type: "choose-ritual",
      controllerId: pending.controllerId,
      filter: "opponent",
      deferred,
    };
    emit(draft, {
      type: "choose-ritual-started",
      playerId: pending.controllerId,
      filter: "opponent",
    });
    return true;
  }
  if (spec.pendingType === "equipment") {
    draft.pendingDecision = {
      type: "choose-equipment",
      controllerId: pending.controllerId,
      creatureId: null,
      filter: "opponent",
      deferred,
      sourceCardInstanceId: pending.sourceCardInstanceId,
      sourceFaceCardId: null,
    };
    emit(draft, {
      type: "choose-equipment-started",
      playerId: pending.controllerId,
      filter: "opponent",
    });
    return true;
  }
  draft.pendingDecision = {
    type: "choose-overload",
    controllerId: pending.controllerId,
    filter: "opponent",
    deferred,
  };
  emit(draft, {
    type: "choose-overload-started",
    playerId: pending.controllerId,
    filter: "opponent",
  });
  return true;
}

/** Applies destroy-* once the card instance is declared (or creature-scoped gear). */
export function applyDestroyDeclaredCard(
  draft: Draft,
  pending: PendingEffect,
  effect: EffectDefinition & {
    readonly type: "destroy-ritual" | "destroy-equipment" | "destroy-overload";
  },
): boolean {
  const cardId = resolveDeclaredCardTarget(pending, effect.target);
  if (cardId === null) return false;
  if (effect.type === "destroy-ritual") destroyRitual(draft, cardId);
  else if (effect.type === "destroy-equipment") destroyEquipment(draft, cardId);
  else destroyOverload(draft, cardId);
  return false;
}
