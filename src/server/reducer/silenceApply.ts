import type { EffectDefinition } from "../model/effects.js";
import type { CardInstanceId, CreatureId, DieId } from "../model/ids.js";
import type { PendingEffect } from "../model/state.js";
import type { SilenceHost, SilenceHostChoice } from "../model/targeting.js";
import {
  collectLegalSilenceHosts,
  silenceExpiresOnTurn,
  uniqueSilenceHosts,
} from "../rules/silence.js";
import { emit, patchCreature, patchDie, type Draft } from "./draft.js";

function hostsOf(effect: EffectDefinition & { type: "silence" }): readonly SilenceHost[] {
  if (effect.target.kind === "choose-opponent-silence-host") {
    return uniqueSilenceHosts(effect.target.hosts);
  }
  return uniqueSilenceHosts(effect.hosts);
}

export function withSilenceDeclaredTarget(
  effect: EffectDefinition & { type: "silence" },
  choice: SilenceHostChoice,
): EffectDefinition {
  if (choice.host === "creature") {
    return { ...effect, target: { kind: "declared-target" } };
  }
  if (choice.host === "ritual") {
    return { ...effect, target: { kind: "declared-ritual" } };
  }
  return {
    ...effect,
    target: { kind: "declared-die-slot", dieId: choice.dieId, slotIndex: choice.slotIndex },
  };
}

/**
 * Opens a mixed opposing-host pending when `effect` is silence with
 * `choose-opponent-silence-host`. Returns `null` when this is not that kind.
 * `true` = paused; `false` = legal whiff.
 */
export function tryOpenSilenceChoice(
  draft: Draft,
  pending: PendingEffect,
  effect: EffectDefinition,
): boolean | null {
  if (effect.type !== "silence") return null;
  if (effect.target.kind !== "choose-opponent-silence-host") return null;

  const hosts = hostsOf(effect);
  const legal = collectLegalSilenceHosts(draft, pending.controllerId, hosts);
  if (legal.length === 0) {
    emit(draft, { type: "effect-resolved", effectId: pending.id, effectType: effect.type });
    return false;
  }

  draft.pendingDecision = {
    type: "choose-silence-host",
    controllerId: pending.controllerId,
    hosts,
    deferred: pending,
  };
  emit(draft, {
    type: "choose-silence-host-started",
    playerId: pending.controllerId,
    hosts,
  });
  return true;
}

export function applySilence(
  draft: Draft,
  pending: PendingEffect,
  effect: EffectDefinition,
): boolean {
  if (effect.type !== "silence") return false;
  const expires = silenceExpiresOnTurn(draft);
  const target = effect.target;

  if (target.kind === "declared-target") {
    const creatureId = pending.declaredTargetCreatureId;
    if (creatureId === null) return false;
    applyCreatureSilence(draft, creatureId, expires);
    return false;
  }
  if (target.kind === "declared-ritual") {
    const cardId = pending.declaredTargetCardInstanceId;
    if (cardId === null) return false;
    applyRitualSilence(draft, cardId, expires);
    return false;
  }
  if (target.kind === "declared-die-slot") {
    applySlotSilence(draft, target.dieId, target.slotIndex, expires);
    return false;
  }
  return false;
}

function applyCreatureSilence(draft: Draft, creatureId: CreatureId, expiresOnTurn: number): void {
  const creature = draft.creatures[creatureId];
  if (creature === undefined) return;
  patchCreature(draft, creatureId, { silenceExpiresOnTurn: expiresOnTurn });
  emit(draft, {
    type: "host-silenced",
    host: "creature",
    creatureId,
    expiresOnTurn,
  });
}

function applyRitualSilence(
  draft: Draft,
  cardInstanceId: CardInstanceId,
  expiresOnTurn: number,
): void {
  const card = draft.cards[cardInstanceId];
  if (card === undefined || card.zone !== "ritual") return;
  draft.cards[cardInstanceId] = { ...card, silenceExpiresOnTurn: expiresOnTurn };
  emit(draft, {
    type: "host-silenced",
    host: "ritual",
    cardInstanceId,
    expiresOnTurn,
  });
}

function applySlotSilence(
  draft: Draft,
  dieId: DieId,
  slotIndex: number,
  expiresOnTurn: number,
): void {
  const die = draft.dice[dieId];
  const slot = die?.slots[slotIndex];
  if (die === undefined || slot === undefined) return;
  const slots = die.slots.map((candidate, index) =>
    index === slotIndex ? { ...candidate, silenceExpiresOnTurn: expiresOnTurn } : candidate,
  );
  patchDie(draft, dieId, { slots });
  emit(draft, {
    type: "host-silenced",
    host: "face",
    dieId,
    slotIndex,
    expiresOnTurn,
  });
}
