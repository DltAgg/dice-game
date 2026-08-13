import { getCreatureDefinition } from "../content/creatures.js";
import type { EffectDefinition, TargetSelector } from "../model/effects.js";
import {
  asEffectInstanceId,
  asSymbolInstanceId,
  type CreatureId,
  type PlayerId,
  type SymbolInstanceId,
} from "../model/ids.js";
import type { PendingEffect } from "../model/state.js";
import type { SymbolStatus, SymbolType } from "../model/symbols.js";
import { opponentOf } from "../rules/creatures.js";
import { emit, nextInstanceId, patchCreature, type Draft } from "./draft.js";
import {
  destroyEquipment,
  drawCards,
  releaseEquipmentOn,
  searchableDeckCards,
} from "./zones.js";

/**
 * Effect resolution (SPDD §17). Effects are drained from an explicit stack
 * rather than applied by recursive calls, so an effect that spawns another
 * effect joins the same structure instead of growing the call stack. The step
 * bound turns a runaway loop into a logged, deterministic abort.
 *
 * A deck search pauses the drain until RESOLVE_SEARCH clears `pendingDecision`.
 */
export function drainResolution(draft: Draft): void {
  let steps = 0;

  while (draft.resolutionStack.length > 0) {
    if (steps >= draft.config.maxResolutionSteps) {
      draft.resolutionStack = [];
      emit(draft, { type: "resolution-aborted", error: "RESOLUTION_LIMIT_EXCEEDED" });
      return;
    }
    steps += 1;

    const pending = draft.resolutionStack.pop();
    if (pending === undefined) return;
    const pause = applyEffect(draft, pending);
    if (pause) return;
  }
}

export function pushEffect(
  draft: Draft,
  controllerId: PlayerId,
  effect: EffectDefinition,
  sourceCreatureId: CreatureId | null,
  declaredTargetCreatureId: CreatureId | null,
): void {
  draft.resolutionStack.push({
    id: asEffectInstanceId(nextInstanceId(draft, "effect")),
    controllerId,
    effect,
    sourceCreatureId,
    declaredTargetCreatureId,
  });
}

/**
 * Continues a pending effect after a creature choice. Used by
 * RESOLVE_CHOOSE_CREATURE so the deferred effect does not re-open the prompt.
 */
export function applyDeferredEffect(draft: Draft, pending: PendingEffect): void {
  applyEffect(draft, pending);
}

function mostDamagedAlly(draft: Draft, controllerId: PlayerId): CreatureId | null {
  const player = draft.players[controllerId];
  if (player === undefined) return null;

  let bestId: CreatureId | null = null;
  let bestDamage = -1;
  for (const creatureId of [...player.creatureIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    const creature = draft.creatures[creatureId];
    if (creature === undefined || creature.defeated) continue;
    if (creature.damage > bestDamage) {
      bestDamage = creature.damage;
      bestId = creatureId;
    }
  }
  return bestId;
}

function mostShieldedEnemy(draft: Draft, controllerId: PlayerId): CreatureId | null {
  const enemyId = Object.keys(draft.players).find((id) => id !== controllerId);
  if (enemyId === undefined) return null;
  const enemy = draft.players[enemyId];
  if (enemy === undefined) return null;

  let bestId: CreatureId | null = null;
  let bestShields = -1;
  for (const creatureId of [...enemy.creatureIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    const creature = draft.creatures[creatureId];
    if (creature === undefined || creature.defeated) continue;
    if (creature.shields > bestShields) {
      bestShields = creature.shields;
      bestId = creatureId;
    }
  }
  return bestId;
}

function resolveTarget(
  draft: Draft,
  pending: PendingEffect,
  selector: TargetSelector,
): CreatureId | null {
  switch (selector.kind) {
    case "source-creature":
      return pending.sourceCreatureId;
    case "declared-target":
      return pending.declaredTargetCreatureId;
    case "most-damaged-ally":
      return mostDamagedAlly(draft, pending.controllerId);
    case "most-shielded-enemy":
      return mostShieldedEnemy(draft, pending.controllerId);
    case "choose-ally":
    case "choose-enemy":
      // Opened as a pending decision before applyEffect reaches resolveTarget.
      return null;
  }
}

function choiceFilterFor(selector: TargetSelector): "ally" | "enemy" | null {
  if (selector.kind === "choose-ally") return "ally";
  if (selector.kind === "choose-enemy") return "enemy";
  return null;
}

function withDeclaredTarget(effect: EffectDefinition): EffectDefinition {
  if (!("target" in effect)) return effect;
  return { ...effect, target: { kind: "declared-target" } } as EffectDefinition;
}

/** Returns true when resolution must wait on a player choice. */
function applyEffect(draft: Draft, pending: PendingEffect): boolean {
  const { effect } = pending;

  if ("target" in effect) {
    const filter = choiceFilterFor(effect.target);
    if (filter !== null) {
      draft.pendingDecision = {
        type: "choose-creature",
        controllerId: pending.controllerId,
        filter,
        deferred: { ...pending, effect: withDeclaredTarget(effect) },
      };
      emit(draft, {
        type: "choose-creature-started",
        playerId: pending.controllerId,
        filter,
      });
      return true;
    }
  }

  emit(draft, { type: "effect-resolved", effectId: pending.id, effectType: effect.type });

  switch (effect.type) {
    case "damage": {
      const targetId = resolveTarget(draft, pending, effect.target);
      if (targetId !== null) dealDamage(draft, targetId, effect.amount);
      return false;
    }
    case "heal": {
      const targetId = resolveTarget(draft, pending, effect.target);
      if (targetId !== null) healCreature(draft, targetId, effect.amount);
      return false;
    }
    case "grant-shield": {
      const targetId = resolveTarget(draft, pending, effect.target);
      if (targetId !== null) grantShield(draft, targetId, effect.amount);
      return false;
    }
    case "generate-symbol": {
      for (let i = 0; i < effect.amount; i += 1) {
        createSymbol(draft, pending.controllerId, effect.symbol, "available", "effect");
      }
      return false;
    }
    case "draw-cards": {
      drawCards(draft, pending.controllerId, effect.amount);
      return false;
    }
    case "discard-cards": {
      const hand = draft.players[pending.controllerId]?.hand ?? [];
      const amount = Math.min(effect.amount, hand.length);
      if (amount === 0) return false;

      draft.pendingDecision = {
        type: "discard-cards",
        controllerId: pending.controllerId,
        amount,
        turnEnds: false,
      };
      emit(draft, {
        type: "discard-started",
        playerId: pending.controllerId,
        amount,
      });
      return true;
    }
    case "search-deck": {
      const eligible = searchableDeckCards(draft, pending.controllerId, effect.filter);
      const amount = Math.min(effect.amount, eligible.length);
      if (amount === 0) {
        emit(draft, {
          type: "search-resolved",
          playerId: pending.controllerId,
          cardInstanceIds: [],
        });
        return false;
      }

      draft.pendingDecision = {
        type: "search-deck",
        controllerId: pending.controllerId,
        amount,
        filter: effect.filter,
      };
      emit(draft, {
        type: "search-started",
        playerId: pending.controllerId,
        amount,
        filter: effect.filter,
      });
      return true;
    }
    case "search-graveyard": {
      const graveyard = draft.players[pending.controllerId]?.graveyard ?? [];
      const amount = Math.min(effect.amount, graveyard.length);
      if (amount === 0) {
        emit(draft, {
          type: "search-resolved",
          playerId: pending.controllerId,
          cardInstanceIds: [],
        });
        return false;
      }

      draft.pendingDecision = {
        type: "search-graveyard",
        controllerId: pending.controllerId,
        amount,
      };
      emit(draft, {
        type: "search-started",
        playerId: pending.controllerId,
        amount,
        filter: "graveyard",
      });
      return true;
    }
    case "gain-energy": {
      gainEnergy(draft, pending.controllerId, effect.amount);
      return false;
    }
    case "destroy-equipment": {
      const targetId = resolveTarget(draft, pending, effect.target);
      if (targetId === null) return false;
      const creature = draft.creatures[targetId];
      // Deterministic: the earliest-attached piece of gear, by instance id order.
      const [first] = [...(creature?.equipmentIds ?? [])].sort((a, b) =>
        a < b ? -1 : a > b ? 1 : 0,
      );
      if (first !== undefined) destroyEquipment(draft, first);
      return false;
    }
    case "apply-toxin": {
      const targetId = resolveTarget(draft, pending, effect.target);
      if (targetId === null) return false;
      applyToxin(draft, targetId, effect.amount);
      return false;
    }
    case "remove-shield": {
      const targetId = resolveTarget(draft, pending, effect.target);
      if (targetId === null) return false;
      removeShield(draft, targetId, effect.amount);
      return false;
    }
    case "next-attack-bonus": {
      const current = draft.attackBonusThisTurn[pending.controllerId] ?? 0;
      draft.attackBonusThisTurn = {
        ...draft.attackBonusThisTurn,
        [pending.controllerId]: current + effect.amount,
      };
      return false;
    }
    case "negate-tactic": {
      const top = draft.chainStack[draft.chainStack.length - 1];
      if (
        top !== undefined &&
        top.kind !== "attack" &&
        !top.negated
      ) {
        top.negated = true;
        emit(draft, { type: "chain-link-negated", linkId: top.id });
      }
      return false;
    }
  }
}

/**
 * Bible §18: the marker only ever means "Energy available to whoever holds it",
 * so a gain by the player who does not hold it would have nowhere to go. Only
 * the holder can gain, and the track's maximum still caps them.
 */
function gainEnergy(draft: Draft, playerId: PlayerId, amount: number): void {
  if (draft.energy.holderId !== playerId || amount <= 0) return;

  const value = Math.min(draft.energy.value + amount, draft.config.energy.trackMax);
  const gained = value - draft.energy.value;
  if (gained <= 0) return;

  draft.energy = { holderId: playerId, value };
  emit(draft, { type: "energy-gained", playerId, amount: gained, remaining: value });
}

export function createSymbol(
  draft: Draft,
  ownerId: PlayerId,
  symbol: SymbolType,
  status: SymbolStatus,
  source: "roll" | "effect",
): SymbolInstanceId {
  const id = asSymbolInstanceId(nextInstanceId(draft, "symbol"));
  draft.symbols[id] = {
    id,
    ownerId,
    symbol,
    status,
    sourceDieId: null,
    absorbedByCreatureId: null,
  };
  emit(draft, { type: "symbol-generated", symbolId: id, symbol, ownerId, source });
  return id;
}

/** Each shield stops 1 damage and is spent doing so; they persist until used. */
export function grantShield(draft: Draft, creatureId: CreatureId, amount: number): void {
  const creature = draft.creatures[creatureId];
  if (creature === undefined || creature.defeated || amount <= 0) return;

  patchCreature(draft, creatureId, { shields: creature.shields + amount });
  emit(draft, { type: "shield-gained", creatureId, amount });
}

/** Strips Shield counters without dealing damage (Rending Claw). */
export function removeShield(draft: Draft, creatureId: CreatureId, amount: number): void {
  const creature = draft.creatures[creatureId];
  if (creature === undefined || creature.defeated || amount <= 0) return;

  const removed = Math.min(creature.shields, amount);
  if (removed <= 0) return;
  patchCreature(draft, creatureId, { shields: creature.shields - removed });
  emit(draft, {
    type: "shield-removed",
    creatureId,
    amount: removed,
    shieldsRemaining: creature.shields - removed,
  });
}

export function applyToxin(draft: Draft, creatureId: CreatureId, amount: number): void {
  const creature = draft.creatures[creatureId];
  if (creature === undefined || creature.defeated || amount <= 0) return;

  const total = creature.toxinMarkers + amount;
  patchCreature(draft, creatureId, { toxinMarkers: total });
  emit(draft, { type: "toxin-applied", creatureId, amount, total });
}

/** At the start of a creature's owner's turn: 1 damage per Toxin counter. */
export function tickToxins(draft: Draft, ownerId: PlayerId): void {
  const player = draft.players[ownerId];
  if (player === undefined) return;

  for (const creatureId of player.creatureIds) {
    const creature = draft.creatures[creatureId];
    if (creature === undefined || creature.defeated || creature.toxinMarkers <= 0) continue;
    emit(draft, { type: "toxin-tick", creatureId, amount: creature.toxinMarkers });
    dealDamage(draft, creatureId, creature.toxinMarkers);
  }
}

export function dealDamage(draft: Draft, creatureId: CreatureId, amount: number): void {
  const creature = draft.creatures[creatureId];
  if (creature === undefined || creature.defeated) return;

  const definition = getCreatureDefinition(creature.definitionId);
  if (definition === undefined) return;

  const prevented = Math.min(creature.shields, amount);
  if (prevented > 0) {
    patchCreature(draft, creatureId, { shields: creature.shields - prevented });
    emit(draft, {
      type: "damage-prevented",
      creatureId,
      amount: prevented,
      shieldsRemaining: creature.shields - prevented,
    });
  }

  const incoming = amount - prevented;
  if (incoming <= 0) return;

  const damage = creature.damage + incoming;
  const defeated = damage >= definition.life;
  patchCreature(draft, creatureId, { damage, defeated });
  emit(draft, { type: "damage-dealt", creatureId, amount: incoming });

  if (!defeated) return;

  emit(draft, { type: "creature-defeated", creatureId });
  releaseDiceHeldBy(draft, creatureId);
  releaseEquipmentOn(draft, creatureId);
  checkVictory(draft);
}

function healCreature(draft: Draft, creatureId: CreatureId, amount: number): void {
  const creature = draft.creatures[creatureId];
  if (creature === undefined || creature.defeated) return;

  const healed = Math.min(amount, creature.damage);
  if (healed <= 0) return;

  patchCreature(draft, creatureId, { damage: creature.damage - healed });
  emit(draft, { type: "creature-healed", creatureId, amount: healed });
}

/**
 * A die sitting on a creature that just died still belongs to its owner and
 * has to be rollable next turn. The absorbed symbol stays absorbed: bible §7
 * removes it from engine resolution for the turn regardless of what happens
 * to the creature afterwards.
 */
function releaseDiceHeldBy(draft: Draft, creatureId: CreatureId): void {
  for (const die of Object.values(draft.dice)) {
    if (die.attachedToCreatureId === creatureId) {
      draft.dice[die.id] = { ...die, attachedToCreatureId: null };
    }
  }
}

/** Bible §4: eliminating every opposing creature wins the match. */
export function checkVictory(draft: Draft): void {
  if (draft.status === "finished") return;

  for (const playerId of draft.playerOrder) {
    const player = draft.players[playerId];
    if (player === undefined || player.creatureIds.length === 0) continue;

    const allDefeated = player.creatureIds.every(
      (id) => draft.creatures[id]?.defeated === true,
    );
    if (!allDefeated) continue;

    const winnerId = opponentOf(draft, playerId);
    draft.status = "finished";
    draft.winner = winnerId;
    emit(draft, { type: "match-finished", winnerId });
    return;
  }
}
