import { getCard } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard, SHIELD_FACE_ID } from "../content/faces.js";
import type {
  CreatureChoiceFilter,
  DieChoiceFilter,
  EffectCondition,
  EffectDefinition,
  TargetSelector,
} from "../model/effects.js";
import {
  asEffectInstanceId,
  asSymbolInstanceId,
  type CardInstanceId,
  type CreatureId,
  type DieId,
  type FaceCardId,
  type PlayerId,
  type SymbolInstanceId,
} from "../model/ids.js";
import type { FaceKind } from "../model/dice.js";
import type { PendingEffect } from "../model/state.js";
import type { SymbolStatus, SymbolType } from "../model/symbols.js";
import { isSyntheticOnlyAttribute } from "../model/attributes.js";
import {
  forgeExceedsAttributeLimit,
  replayableGraveyardTactics,
  searchableInGraveyard,
} from "../rules/cards.js";
import { livingCreaturesOf, opponentOf } from "../rules/creatures.js";
import {
  countInstalledCopies,
  hasLegalForgeFacesChoice,
  hasLegalReplaceSyntheticFaceChoice,
  overwrittenSlot,
  returnFaceToPoolIfOrphaned,
  slotCannotBeReplacedByForge,
  takeFaceFromPool,
  withForgeLockResetOnInstall,
} from "../rules/faces.js";
import { legalCreaturesForFilter, legalDiceForFilter, legalDieSlotsForFilter, choiceFilterForSelector } from "../rules/targets.js";
import {
  discardTokensInAttributeOrder,
  tokenChoiceNeeded,
  totalTokens,
} from "../rules/tokens.js";
import { isRitualNegatableLinkKind, linkMatchesNegateCard } from "./chain.js";
import { emit, nextInstanceId, patchCreature, patchDie, patchPlayer, type Draft } from "./draft.js";
import { fireOnDealDamage, fireOnTakeDamageEffects, fireOnToxinDamage, applyOnTakeDamageReduce } from "./triggers.js";
import {
  destroyEquipment,
  destroyRitual,
  drawCards,
  millCards,
  refreshRitualOrientations,
  releaseEquipmentOn,
  searchableDeckCards,
  setCreaturePosition,
  swapCreaturePositions,
  clearOverloadsOnFace,
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
    // A prior effect may already have opened a player choice (e.g. auto-bank
    // queued On absorb while On roll is waiting). Do not overwrite it.
    if (draft.pendingDecision !== null) return;

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
  declaredTargetCardInstanceId: CardInstanceId | null = null,
  sourceDieId: DieId | null = null,
  sourceSlotIndex: number | null = null,
  ignoreShield = 0,
  sourceCardInstanceId: CardInstanceId | null = null,
): void {
  draft.resolutionStack.push({
    id: asEffectInstanceId(nextInstanceId(draft, "effect")),
    controllerId,
    effect,
    sourceCreatureId,
    declaredTargetCreatureId,
    declaredTargetCardInstanceId,
    sourceDieId,
    sourceSlotIndex,
    sourceCardInstanceId,
    ignoreShield,
  });
}

/**
 * Inspect subject for a card/face-selection pending. Card origin wins:
 * `sourceFaceCardId` is set only when there is no source card (face on-roll /
 * on-absorb). Overload on a rolled face therefore inspects the overload.
 */
function effectChoiceSource(
  draft: Draft,
  pending: PendingEffect,
): {
  readonly sourceCardInstanceId: CardInstanceId | null;
  readonly sourceFaceCardId: FaceCardId | null;
} {
  if (pending.sourceCardInstanceId !== null) {
    return { sourceCardInstanceId: pending.sourceCardInstanceId, sourceFaceCardId: null };
  }
  if (pending.sourceDieId === null || pending.sourceSlotIndex === null) {
    return { sourceCardInstanceId: null, sourceFaceCardId: null };
  }
  const faceCardId =
    draft.dice[pending.sourceDieId]?.slots[pending.sourceSlotIndex]?.faceCardId ?? null;
  return { sourceCardInstanceId: null, sourceFaceCardId: faceCardId };
}

/**
 * Continues a pending effect after a creature choice. Used by
 * RESOLVE_CHOOSE_CREATURE so the deferred effect does not re-open the prompt.
 */
export function applyDeferredEffect(draft: Draft, pending: PendingEffect): void {
  applyEffect(draft, pending);
}

/** Intentional silent pick: most damage, ties by earliest creature id. */
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

function mostDamagedEnemy(draft: Draft, controllerId: PlayerId): CreatureId | null {
  const enemyId = Object.keys(draft.players).find((id) => id !== controllerId);
  if (enemyId === undefined) return null;
  const enemy = draft.players[enemyId];
  if (enemy === undefined) return null;

  let bestId: CreatureId | null = null;
  let bestDamage = -1;
  for (const creatureId of [...enemy.creatureIds].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    const creature = draft.creatures[creatureId];
    if (creature === undefined || creature.defeated) continue;
    if (creature.damage > bestDamage) {
      bestDamage = creature.damage;
      bestId = creatureId;
    }
  }
  return bestId;
}

/** Intentional silent pick: most Shield, ties by earliest creature id. */
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
    case "most-damaged-enemy":
      return mostDamagedEnemy(draft, pending.controllerId);
    case "most-shielded-enemy":
      return mostShieldedEnemy(draft, pending.controllerId);
    case "choose-ally":
    case "choose-enemy":
    case "choose-ally-other":
    case "choose-allied-frontline":
    case "choose-allied-frontline-other":
    case "choose-ally-with-toxin":
    case "choose-enemy-with-toxin":
    case "choose-ally-damage-over-half":
    case "choose-ally-with-tokens":
    case "choose-adjacent-ally":
    case "choose-opponent-ritual":
    case "declared-ritual":
      // Creature/ritual choose-* open pending decisions; ritual uses resolveRitualTarget.
      return null;
    case "allied-frontline":
    case "enemy-frontline":
      return null;
    case "chain-attack-target": {
      for (let i = draft.chainStack.length - 1; i >= 0; i -= 1) {
        const link = draft.chainStack[i];
        if (link?.kind === "attack" && link.attackTargetId !== null) {
          return link.attackTargetId;
        }
      }
      return null;
    }
  }
}

function resolveRitualTarget(
  pending: PendingEffect,
  selector: TargetSelector,
): CardInstanceId | null {
  switch (selector.kind) {
    case "declared-ritual":
      return pending.declaredTargetCardInstanceId;
    case "choose-opponent-ritual":
      return null;
    default:
      return null;
  }
}

function opposingRitualIds(draft: Draft, controllerId: PlayerId): readonly CardInstanceId[] {
  const enemyId = opponentOf(draft, controllerId);
  const enemy = draft.players[enemyId];
  if (enemy === undefined) return [];
  return enemy.ritual.filter((id) => draft.cards[id]?.zone === "ritual");
}

function resolveTargets(
  draft: Draft,
  pending: PendingEffect,
  selector: TargetSelector,
): readonly CreatureId[] {
  const single = resolveTarget(draft, pending, selector);
  if (selector.kind === "allied-frontline") {
    return livingCreaturesOf(draft, pending.controllerId)
      .filter((creature) => creature.position === "frontline")
      .map((creature) => creature.id);
  }
  if (selector.kind === "enemy-frontline") {
    return livingCreaturesOf(draft, opponentOf(draft, pending.controllerId))
      .filter((creature) => creature.position === "frontline")
      .map((creature) => creature.id);
  }
  return single === null ? [] : [single];
}

function choiceFilterFor(selector: TargetSelector): CreatureChoiceFilter | null {
  const mapped = choiceFilterForSelector(selector.kind);
  if (mapped === null || mapped === "multi") return null;
  return mapped;
}

function withDeclaredTarget(effect: EffectDefinition): EffectDefinition {
  if (effect.type === "swap-positions") {
    return { ...effect, with: { kind: "declared-target" }, optional: false };
  }
  if (effect.type === "reposition-creature") {
    return { ...effect, target: { kind: "declared-target" }, optional: false };
  }
  if (!("target" in effect) || typeof effect.target !== "object") return effect;
  return { ...effect, target: { kind: "declared-target" } } as EffectDefinition;
}

function withDeclaredRitual(effect: EffectDefinition): EffectDefinition {
  if (!("target" in effect) || typeof effect.target !== "object") return effect;
  return { ...effect, target: { kind: "declared-ritual" } } as EffectDefinition;
}

function selectorOf(effect: EffectDefinition): TargetSelector | null {
  if (effect.type === "swap-positions") return effect.with;
  if ("target" in effect && typeof effect.target === "object") return effect.target;
  return null;
}

function openCreatureChoice(
  draft: Draft,
  pending: PendingEffect,
  filter: CreatureChoiceFilter,
  optional: boolean,
  deferredEffect: EffectDefinition,
): boolean {
  const legal = legalCreaturesForFilter(
    draft,
    pending.controllerId,
    filter,
    pending.sourceCreatureId,
  );
  if (legal.length === 0) return false;
  draft.pendingDecision = {
    type: "choose-creature",
    controllerId: pending.controllerId,
    filter,
    optional,
    deferred: { ...pending, effect: deferredEffect },
  };
  emit(draft, {
    type: "choose-creature-started",
    playerId: pending.controllerId,
    filter,
  });
  return true;
}

function poolSymbols(draft: Draft, playerId: PlayerId) {
  return Object.values(draft.symbols).filter(
    (symbol) =>
      symbol.ownerId === playerId && (symbol.status === "rolled" || symbol.status === "available"),
  );
}

function faceKindOfSymbol(draft: Draft, sourceDieId: DieId | null): FaceKind | null {
  if (sourceDieId === null) return null;
  const die = draft.dice[sourceDieId];
  const slot = die?.rolledSlotIndex;
  if (die === undefined || slot === null || slot === undefined) return null;
  const faceCardId = die.slots[slot]?.faceCardId;
  if (faceCardId === undefined) return null;
  return getFaceCard(faceCardId)?.kind ?? null;
}

function evaluateCondition(draft: Draft, pending: PendingEffect, when: EffectCondition): boolean {
  switch (when.type) {
    case "source-position": {
      const creature =
        pending.sourceCreatureId === null ? undefined : draft.creatures[pending.sourceCreatureId];
      return creature?.position === when.position;
    }
    case "source-is-frontline": {
      const creature =
        pending.sourceCreatureId === null ? undefined : draft.creatures[pending.sourceCreatureId];
      return creature?.position === "frontline";
    }
    case "any-enemy-has-toxin":
      return livingCreaturesOf(draft, opponentOf(draft, pending.controllerId)).some(
        (creature) => creature.toxinMarkers > 0,
      );
    case "any-ally-attacked-this-turn":
      return livingCreaturesOf(draft, pending.controllerId).some(
        (creature) => creature.attacksUsedThisCombat > 0,
      );
    case "has-other-symbol": {
      const pool = poolSymbols(draft, pending.controllerId);
      return pool.some((symbol) => {
        if (pending.sourceDieId !== null && symbol.sourceDieId === pending.sourceDieId) {
          return false;
        }
        if (when.symbol !== undefined && symbol.symbol !== when.symbol) return false;
        if (when.faceKind !== undefined) {
          const kind = faceKindOfSymbol(draft, symbol.sourceDieId);
          if (kind === when.faceKind) return true;
          if (
            kind === null &&
            when.faceKind === "synthetic" &&
            isSyntheticOnlyAttribute(symbol.symbol)
          ) {
            return true;
          }
          return false;
        }
        return true;
      });
    }
    case "has-adjacent-ally": {
      const ids = draft.players[pending.controllerId]?.creatureIds ?? [];
      for (let i = 0; i < ids.length; i += 1) {
        const a = ids[i];
        const b = ids[i + 1];
        if (a === undefined || b === undefined) continue;
        const ca = draft.creatures[a];
        const cb = draft.creatures[b];
        if (ca !== undefined && !ca.defeated && cb !== undefined && !cb.defeated) return true;
      }
      return false;
    }
    case "controller-has-frontline":
      return livingCreaturesOf(draft, pending.controllerId).some(
        (creature) => creature.position === "frontline",
      );
  }
}

function applyToTargets(
  draft: Draft,
  pending: PendingEffect,
  selector: TargetSelector,
  apply: (creatureId: CreatureId) => void,
): void {
  for (const targetId of resolveTargets(draft, pending, selector)) {
    apply(targetId);
  }
}

/** Returns true when resolution must wait on a player choice. */
function applyEffect(draft: Draft, pending: PendingEffect): boolean {
  // Overcharge absorb: duplicate the next face-sourced effect once.
  if (
    pending.sourceDieId !== null &&
    draft.resolveNextFaceEffectTwice[pending.controllerId] === true
  ) {
    const next = { ...draft.resolveNextFaceEffectTwice };
    delete next[pending.controllerId];
    draft.resolveNextFaceEffectTwice = next;
    pushEffect(
      draft,
      pending.controllerId,
      pending.effect,
      pending.sourceCreatureId,
      pending.declaredTargetCreatureId,
      pending.declaredTargetCardInstanceId,
      pending.sourceDieId,
      pending.sourceSlotIndex,
      pending.ignoreShield,
      pending.sourceCardInstanceId,
    );
  }

  const { effect } = pending;

  if ("target" in effect && typeof effect.target === "object") {
    if (effect.target.kind === "choose-opponent-ritual") {
      const eligible = opposingRitualIds(draft, pending.controllerId);
      if (eligible.length === 0) {
        emit(draft, { type: "effect-resolved", effectId: pending.id, effectType: effect.type });
        return false;
      }
      draft.pendingDecision = {
        type: "choose-ritual",
        controllerId: pending.controllerId,
        filter: "opponent",
        deferred: { ...pending, effect: withDeclaredRitual(effect) },
      };
      emit(draft, {
        type: "choose-ritual-started",
        playerId: pending.controllerId,
        filter: "opponent",
      });
      return true;
    }
  }

  if (effect.type === "reposition-creature" && effect.optional === true) {
    const selector = effect.target;
    const filter: CreatureChoiceFilter | null =
      selector.kind === "source-creature" ? "self" : choiceFilterFor(selector);
    if (filter !== null) {
      return openCreatureChoice(draft, pending, filter, true, withDeclaredTarget(effect));
    }
  }

  const selector = selectorOf(effect);
  if (selector !== null) {
    const filter = choiceFilterFor(selector);
    if (filter !== null) {
      const optional =
        (effect.type === "reposition-creature" || effect.type === "swap-positions") &&
        effect.optional === true;
      return openCreatureChoice(draft, pending, filter, optional, withDeclaredTarget(effect));
    }
  }

  emit(draft, { type: "effect-resolved", effectId: pending.id, effectType: effect.type });

  switch (effect.type) {
    case "damage": {
      applyToTargets(draft, pending, effect.target, (targetId) => {
        const dealt = dealDamage(draft, targetId, effect.amount, {
          ignoreShield: pending.ignoreShield,
        });
        if (dealt > 0 && pending.sourceCreatureId !== null) {
          fireOnDealDamage(draft, pending.sourceCreatureId, targetId);
        }
      });
      return false;
    }
    case "heal": {
      applyToTargets(draft, pending, effect.target, (targetId) => {
        healCreature(draft, targetId, effect.amount);
      });
      return false;
    }
    case "grant-shield": {
      applyToTargets(draft, pending, effect.target, (targetId) => {
        grantShield(draft, targetId, effect.amount);
      });
      return false;
    }
    case "generate-symbol": {
      for (let i = 0; i < effect.amount; i += 1) {
        createSymbol(draft, pending.controllerId, effect.symbol, "available", "effect");
      }
      return false;
    }
    case "draw-cards": {
      const playerId =
        effect.player === "opponent" ? opponentOf(draft, pending.controllerId) : pending.controllerId;
      drawCards(draft, playerId, effect.amount);
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
        ...(effect.optional === true ? { optional: true } : {}),
        ...(effect.then !== undefined ? { thenEffects: effect.then } : {}),
        sourceCreatureId: pending.sourceCreatureId,
        declaredTargetCreatureId: pending.declaredTargetCreatureId,
        sourceDieId: pending.sourceDieId,
        sourceSlotIndex: pending.sourceSlotIndex,
        ...effectChoiceSource(draft, pending),
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
        ...effectChoiceSource(draft, pending),
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
      const graveyard = searchableInGraveyard(
        draft,
        pending.controllerId,
        effect.maxEnergyCost,
      );
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
        ...(effect.maxEnergyCost !== undefined ? { maxEnergyCost: effect.maxEnergyCost } : {}),
        ...effectChoiceSource(draft, pending),
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
      const equipmentIds = creature?.equipmentIds ?? [];
      if (equipmentIds.length === 0) return false;
      // One piece: no real choice. Two or more: controller names which instance.
      if (equipmentIds.length === 1) {
        const [only] = equipmentIds;
        if (only !== undefined) destroyEquipment(draft, only);
        return false;
      }
      draft.pendingDecision = {
        type: "choose-equipment",
        controllerId: pending.controllerId,
        creatureId: targetId,
        ...effectChoiceSource(draft, pending),
      };
      emit(draft, {
        type: "choose-equipment-started",
        playerId: pending.controllerId,
        creatureId: targetId,
      });
      return true;
    }
    case "apply-toxin": {
      applyToTargets(draft, pending, effect.target, (targetId) => {
        applyToxin(draft, targetId, effect.amount);
      });
      return false;
    }
    case "remove-shield": {
      applyToTargets(draft, pending, effect.target, (targetId) => {
        removeShield(draft, targetId, effect.amount);
      });
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
    case "grant-next-attack-bonus": {
      const targetId = resolveTarget(draft, pending, effect.target);
      if (targetId === null) return false;
      const creature = draft.creatures[targetId];
      if (creature === undefined || creature.defeated) return false;
      patchCreature(draft, targetId, {
        nextAttackBonus: creature.nextAttackBonus + effect.amount,
      });
      return false;
    }
    case "arm-attack-toxin": {
      const current = draft.attackToxinThisTurn[pending.controllerId] ?? 0;
      draft.attackToxinThisTurn = {
        ...draft.attackToxinThisTurn,
        [pending.controllerId]: current + effect.amount,
      };
      return false;
    }
    case "negate-card": {
      const top = draft.chainStack[draft.chainStack.length - 1];
      if (top !== undefined && linkMatchesNegateCard(draft, top, effect.cardTypes)) {
        top.negated = true;
        emit(draft, { type: "chain-link-negated", linkId: top.id });
      }
      return false;
    }
    case "negate-ritual": {
      const top = draft.chainStack[draft.chainStack.length - 1];
      if (
        top !== undefined &&
        isRitualNegatableLinkKind(top.kind) &&
        !top.negated
      ) {
        top.negated = true;
        emit(draft, { type: "chain-link-negated", linkId: top.id });
      }
      return false;
    }
    case "discard-attribute-tokens": {
      let paused = false;
      applyToTargets(draft, pending, effect.target, (targetId) => {
        if (paused) return;
        const creature = draft.creatures[targetId];
        if (creature === undefined || creature.defeated || effect.amount <= 0) return;
        const pileOwnerId = creature.ownerId;
        const pile = draft.players[pileOwnerId]?.attributePool ?? {};
        if (totalTokens(pile) <= 0) return;
        if (tokenChoiceNeeded(pile, effect.amount)) {
          draft.pendingDecision = {
            type: "choose-attribute-tokens",
            controllerId: pending.controllerId,
            creatureId: targetId,
            amount: effect.amount,
            ...effectChoiceSource(draft, pending),
          };
          emit(draft, {
            type: "choose-attribute-tokens-started",
            playerId: pending.controllerId,
            creatureId: targetId,
            amount: effect.amount,
          });
          paused = true;
          return;
        }
        const { next, discarded } = discardTokensInAttributeOrder(pile, effect.amount);
        if (totalTokens(discarded) <= 0) return;
        patchPlayer(draft, pileOwnerId, { attributePool: next });
        refreshRitualOrientations(draft, pileOwnerId);
        emit(draft, {
          type: "attribute-tokens-discarded",
          playerId: pileOwnerId,
          creatureId: targetId,
          discarded,
        });
      });
      return paused;
    }
    case "destroy-ritual": {
      // Always a choose-ritual pending when ≥1 opposing ritual exists (including one).
      const ritualId = resolveRitualTarget(pending, effect.target);
      if (ritualId === null) return false;
      destroyRitual(draft, ritualId);
      return false;
    }
    case "grant-damage-prevent": {
      applyToTargets(draft, pending, effect.target, (targetId) => {
        const creature = draft.creatures[targetId];
        if (creature === undefined || creature.defeated) return;
        patchCreature(draft, targetId, {
          damagePreventBuffer: creature.damagePreventBuffer + effect.amount,
        });
      });
      return false;
    }
    case "prevent-attack-reflect": {
      applyPreventAttackReflect(draft, pending.controllerId);
      return false;
    }
    case "arm-prevent-draw": {
      draft.preventDrawArmed = {
        ...draft.preventDrawArmed,
        [pending.controllerId]: effect.amount,
      };
      return false;
    }
    case "forge-faces": {
      if (
        !hasLegalForgeFacesChoice(
          draft,
          pending.controllerId,
          effect.faces,
          effect.kind,
          effect.attribute,
          effect.target,
        )
      ) {
        return false;
      }
      draft.pendingDecision = {
        type: "forge-faces",
        controllerId: pending.controllerId,
        faces: effect.faces,
        kind: effect.kind,
        attribute: effect.attribute,
        target: effect.target,
        ...effectChoiceSource(draft, pending),
      };
      emit(draft, {
        type: "forge-faces-started",
        playerId: pending.controllerId,
        faces: effect.faces,
        kind: effect.kind,
        attribute: effect.attribute,
        target: effect.target,
      });
      return true;
    }
    case "replace-synthetic-face": {
      if (
        !hasLegalReplaceSyntheticFaceChoice(
          draft,
          pending.controllerId,
          effect.kind,
          effect.attribute,
        )
      ) {
        return false;
      }
      draft.pendingDecision = {
        type: "replace-synthetic-face",
        controllerId: pending.controllerId,
        kind: effect.kind,
        attribute: effect.attribute,
        ...effectChoiceSource(draft, pending),
      };
      emit(draft, {
        type: "replace-synthetic-face-started",
        playerId: pending.controllerId,
        kind: effect.kind,
        attribute: effect.attribute,
      });
      return true;
    }
    case "reposition-creature": {
      const targetId = resolveTarget(draft, pending, effect.target);
      if (targetId === null) return false;
      // Ally-only: never reposition an opposing creature (push banned).
      const target = draft.creatures[targetId];
      if (target === undefined || target.ownerId !== pending.controllerId) return false;
      return applyReposition(draft, pending, targetId, effect.optional === true);
    }
    case "swap-positions": {
      const otherId = resolveTarget(draft, pending, effect.with);
      if (otherId === null || pending.sourceCreatureId === null) return false;
      swapCreaturePositions(draft, pending.sourceCreatureId, otherId);
      return false;
    }
    case "conditional": {
      if (evaluateCondition(draft, pending, effect.when)) {
        for (const child of [...effect.then].reverse()) {
          pushEffect(
            draft,
            pending.controllerId,
            child,
            pending.sourceCreatureId,
            pending.declaredTargetCreatureId,
            pending.declaredTargetCardInstanceId,
            pending.sourceDieId,
            pending.sourceSlotIndex,
            pending.ignoreShield,
            pending.sourceCardInstanceId,
          );
        }
      }
      return false;
    }
    case "lose-energy": {
      reduceOpponentEnergy(draft, pending.controllerId, effect.amount, "lose");
      return false;
    }
    case "transfer-energy": {
      reduceOpponentEnergy(draft, pending.controllerId, effect.amount, "transfer");
      return false;
    }
    case "retain-die": {
      if (pending.sourceDieId !== null) {
        applyRetainDieFromEffect(draft, pending.controllerId, pending.sourceDieId);
        return false;
      }
      return openDieChoice(draft, pending, "owned-retainable", false);
    }
    case "convert-symbols": {
      const eligible = poolSymbols(draft, pending.controllerId)
        .filter((symbol) => (effect.sourceOnly === true ? symbol.sourceDieId === pending.sourceDieId : true))
        .map((symbol) => symbol.id);
      const amount = Math.min(effect.amount, eligible.length);
      if (amount === 0) return false;
      draft.pendingDecision = {
        type: "convert-symbols",
        controllerId: pending.controllerId,
        amount,
        eligibleSymbolIds: eligible,
      };
      return true;
    }
    case "arm-ignore-shield": {
      const current = draft.ignoreShieldThisTurn[pending.controllerId] ?? 0;
      draft.ignoreShieldThisTurn = {
        ...draft.ignoreShieldThisTurn,
        [pending.controllerId]: current + effect.amount,
      };
      return false;
    }
    case "arm-requirement-wildcard": {
      const current = draft.requirementWildcardsThisTurn[pending.controllerId] ?? [];
      draft.requirementWildcardsThisTurn = {
        ...draft.requirementWildcardsThisTurn,
        [pending.controllerId]: [
          ...current,
          effect.fromSymbol === undefined ? {} : { fromSymbol: effect.fromSymbol },
        ],
      };
      return false;
    }
    case "arm-forge-discount": {
      const current = draft.forgeDiscountThisTurn[pending.controllerId] ?? 0;
      draft.forgeDiscountThisTurn = {
        ...draft.forgeDiscountThisTurn,
        [pending.controllerId]: current + effect.amount,
      };
      return false;
    }
    case "arm-redirect-damage": {
      applyToTargets(draft, pending, effect.target, (targetId) => {
        const creature = draft.creatures[targetId];
        if (creature === undefined || creature.defeated) return;
        patchCreature(draft, targetId, {
          redirectDamageThisTurn: creature.redirectDamageThisTurn + effect.amount,
        });
      });
      return false;
    }
    case "arm-next-incoming-bonus": {
      applyToTargets(draft, pending, effect.target, (targetId) => {
        const creature = draft.creatures[targetId];
        if (creature === undefined || creature.defeated) return;
        patchCreature(draft, targetId, {
          nextIncomingDamageBonus: creature.nextIncomingDamageBonus + effect.amount,
        });
      });
      return false;
    }
    case "arm-blade-rain": {
      draft.bladeRainArmed = { ...draft.bladeRainArmed, [pending.controllerId]: true };
      return false;
    }
    case "replay-graveyard-tactic": {
      const eligible = replayableGraveyardTactics(draft, pending.controllerId);
      if (eligible.length === 0) return false;
      draft.pendingDecision = {
        type: "replay-graveyard-tactic",
        controllerId: pending.controllerId,
        ...effectChoiceSource(draft, pending),
      };
      return true;
    }
    case "copy-pool-symbol": {
      const types = new Set(poolSymbols(draft, pending.controllerId).map((s) => s.symbol));
      if (types.size === 0) return false;
      draft.pendingDecision = {
        type: "copy-pool-symbol",
        controllerId: pending.controllerId,
        ...effectChoiceSource(draft, pending),
      };
      return true;
    }
    case "look-top-deck": {
      const deck = draft.players[pending.controllerId]?.deck ?? [];
      const ids = deck.slice(0, effect.amount);
      if (ids.length === 0) return false;
      draft.pendingDecision = {
        type: "look-top-deck",
        controllerId: pending.controllerId,
        cardInstanceIds: ids,
        ...effectChoiceSource(draft, pending),
      };
      return true;
    }
    case "peek-deck-optional-bottom": {
      const top = draft.players[pending.controllerId]?.deck[0];
      if (top === undefined) return false;
      draft.pendingDecision = {
        type: "peek-deck",
        controllerId: pending.controllerId,
        cardInstanceId: top,
        ...effectChoiceSource(draft, pending),
      };
      return true;
    }
    case "dark-pact": {
      const deck = draft.players[pending.controllerId]?.deck ?? [];
      const rituals = deck.flatMap((id) => {
        const card = draft.cards[id];
        if (card === undefined) return [];
        const definition = getCard(card.cardId);
        return definition?.type === "ritual" ? [definition.attribute] : [];
      });
      const attributes = new Set(rituals);
      if (rituals.length < 2 || attributes.size < 2) return false;
      draft.pendingDecision = {
        type: "dark-pact",
        controllerId: pending.controllerId,
        ...effectChoiceSource(draft, pending),
      };
      return true;
    }
    case "mind-control": {
      const opponentId = opponentOf(draft, pending.controllerId);
      const overloaded = new Set<string>();
      for (const die of Object.values(draft.dice)) {
        if (die.ownerId !== opponentId) continue;
        for (const slot of die.slots) {
          const has = Object.values(draft.cards).some(
            (card) => card.zone === "overload" && card.attachedToFaceCardId === slot.faceCardId,
          );
          if (has) overloaded.add(slot.faceCardId);
        }
      }
      if (overloaded.size === 0) return false;
      draft.pendingDecision = {
        type: "mind-control",
        controllerId: pending.controllerId,
        ...effectChoiceSource(draft, pending),
      };
      return true;
    }
    case "extermination": {
      if (pending.sourceDieId !== null) {
        const consumed = consumeSyntheticCorruptionOnDie(draft, pending.sourceDieId);
        if (consumed <= 0) return false;
        draft.pendingDecision = {
          type: "split-damage",
          controllerId: pending.controllerId,
          amount: consumed * 2,
          maxTargets: 2,
          attackerId: null,
          range: true,
          sourceCreatureId: pending.sourceCreatureId,
          ignoreShield: 0,
          thenEffects: [],
        };
        return true;
      }
      return openDieChoice(draft, pending, "any-synthetic-corruption", false);
    }
    case "reapply-die-modifiers": {
      if (pending.sourceDieId !== null) {
        fireDieModifiers(draft, pending.controllerId, pending.sourceDieId);
        return false;
      }
      return openDieChoice(draft, pending, "owned-rolled", false);
    }
    case "copy-other-die-face": {
      applyCopyOtherDieFace(draft, pending);
      return false;
    }
    case "optional-reroll-die": {
      if (pending.sourceDieId === null) {
        return openDieChoice(draft, pending, "owned-rolled", false);
      }
      const die = draft.dice[pending.sourceDieId];
      if (die === undefined || die.rolledSlotIndex === null) return false;
      const player = draft.players[pending.controllerId];
      if (player === undefined) return false;
      if (effect.oncePerTurn === true) {
        const key = `optional-reroll`;
        if (player.spentOncePerTurnKeys.includes(key)) return false;
        patchPlayer(draft, pending.controllerId, {
          spentOncePerTurnKeys: [...player.spentOncePerTurnKeys, key],
        });
      }
      const faceCardId = die.slots[die.rolledSlotIndex]?.faceCardId;
      if (faceCardId === undefined) return false;
      draft.pendingDecision = {
        type: "optional-reroll",
        controllerId: pending.controllerId,
        dieId: die.id,
        faceCardId,
        ...(effect.sameFaceAllyDamage !== undefined
          ? { sameFaceAllyDamage: effect.sameFaceAllyDamage }
          : {}),
      };
      return true;
    }
    case "add-pestilence-counter": {
      applyPestilenceCounter(draft, pending);
      return false;
    }
    case "arm-toxin-receive-cap": {
      applyToTargets(draft, pending, effect.target, (targetId) => {
        patchCreature(draft, targetId, { toxinReceiveCapRemaining: effect.amount });
      });
      return false;
    }
    case "remove-toxin-deal-damage": {
      const targetId = resolveTarget(draft, pending, effect.target);
      if (targetId === null) return false;
      const creature = draft.creatures[targetId];
      if (creature === undefined || creature.defeated) return false;
      const maxAmount = creature.toxinMarkers;
      if (maxAmount <= 0) return false;
      draft.pendingDecision = {
        type: "remove-toxin-amount",
        controllerId: pending.controllerId,
        creatureId: targetId,
        maxAmount,
      };
      return true;
    }
    case "add-corruption-marker": {
      return openDieSlotChoice(draft, pending, "opposing-synthetic", false);
    }
    case "lock-corrupted-face-resource": {
      return openDieSlotChoice(draft, pending, "opposing-corrupted", false);
    }
    case "spread-corruption-marker": {
      return openDieSlotChoice(draft, pending, "opposing-corrupted-with-other-slot", false);
    }
    case "suppress-opposing-natural-inherent": {
      return openDieSlotChoice(draft, pending, "opposing-natural", false);
    }
    case "strip-corrupted-face-unusable-symbol": {
      return openDieSlotChoice(draft, pending, "opposing-corrupted", false);
    }
    case "arm-wildcard-from-synthetic-pool": {
      const eligible = poolSymbols(draft, pending.controllerId)
        .filter((symbol) => {
          if (symbol.usable === false) return false;
          const kind = faceKindOfSymbol(draft, symbol.sourceDieId);
          if (kind === "synthetic") return true;
          return isSyntheticOnlyAttribute(symbol.symbol);
        })
        .map((symbol) => symbol.id);
      if (eligible.length === 0) return false;
      draft.pendingDecision = {
        type: "choose-pool-symbol",
        controllerId: pending.controllerId,
        eligibleSymbolIds: eligible,
        deferred: pending,
      };
      return true;
    }
    case "copy-appeared-synthetic-onroll": {
      return openDieSlotChoice(draft, pending, "appeared-synthetic-this-roll", false);
    }
    case "optional-overcharge-energy": {
      if (pending.sourceDieId === null || pending.sourceSlotIndex === null) return false;
      draft.pendingDecision = {
        type: "optional-overcharge",
        controllerId: pending.controllerId,
        amount: effect.amount,
        dieId: pending.sourceDieId,
        slotIndex: pending.sourceSlotIndex,
      };
      return true;
    }
    case "arm-resolve-next-face-effect-twice": {
      draft.resolveNextFaceEffectTwice = {
        ...draft.resolveNextFaceEffectTwice,
        [pending.controllerId]: true,
      };
      return false;
    }
    case "optional-bonus-basic-attack": {
      const creatureId = pending.sourceCreatureId;
      if (creatureId === null) return false;
      const creature = draft.creatures[creatureId];
      if (creature === undefined || creature.defeated) return false;
      if (creature.attacksUsedThisCombat > 0) return false;
      draft.pendingDecision = {
        type: "optional-bonus-attack",
        controllerId: pending.controllerId,
        creatureId,
      };
      return true;
    }
    case "mill-cards": {
      const playerId =
        effect.player === "opponent"
          ? opponentOf(draft, pending.controllerId)
          : pending.controllerId;
      millCards(draft, playerId, effect.amount);
      return false;
    }
    case "transfer-attribute-tokens":
      return applyTokenShare(draft, pending, effect, false);
    case "copy-attribute-tokens":
      return applyTokenShare(draft, pending, effect, true);
  }
}

type TokenShareEffect = Extract<
  EffectDefinition,
  { type: "transfer-attribute-tokens" } | { type: "copy-attribute-tokens" }
>;

/**
 * Wild pack feeding: move or copy absorbed tokens between allied creatures.
 * Sequential choose-creature (from, then to), then mixed-pile token pick.
 */
function applyTokenShare(
  draft: Draft,
  pending: PendingEffect,
  effect: TokenShareEffect,
  copy: boolean,
): boolean {
  // Pack-feed creature↔creature attribute moves are parked for Phase 6
  // (spec `016`). Catalogue effects still print; engine no-ops until retargeted.
  void draft;
  void pending;
  void effect;
  void copy;
  return false;
}

export function applyTokenMove(
  draft: Draft,
  fromId: CreatureId,
  toId: CreatureId,
  tokens: import("../model/symbols.js").SymbolRequirement,
  copy: boolean,
): void {
  // Parked: creature attribute tokens removed. Prefer pile ops in Phase 6.
  void draft;
  void fromId;
  void toId;
  void tokens;
  void copy;
}

function openDieSlotChoice(
  draft: Draft,
  pending: PendingEffect,
  filter: import("../model/effects.js").DieSlotChoiceFilter,
  optional: boolean,
  context?: { readonly contextDieId?: DieId; readonly excludedSlotIndex?: number },
): boolean {
  const legal = legalDieSlotsForFilter(draft, pending.controllerId, filter, context);
  if (legal.length === 0) return false;
  draft.pendingDecision = {
    type: "choose-die-slot",
    controllerId: pending.controllerId,
    filter,
    optional,
    ...(context?.contextDieId !== undefined ? { contextDieId: context.contextDieId } : {}),
    ...(context?.excludedSlotIndex !== undefined
      ? { excludedSlotIndex: context.excludedSlotIndex }
      : {}),
    deferred: pending,
  };
  return true;
}

/**
 * Applies a completed `choose-die-slot` against the deferred effect.
 * Returns true when another pending was opened (Infection spread step 2).
 */
export function applyDieSlotChoice(
  draft: Draft,
  pending: PendingEffect,
  dieId: DieId,
  slotIndex: number,
): boolean {
  const effect = pending.effect;
  switch (effect.type) {
    case "add-corruption-marker":
      addCorruptionMarker(draft, dieId, slotIndex, effect.amount);
      return false;
    case "lock-corrupted-face-resource":
      lockFaceResource(draft, dieId, slotIndex);
      return false;
    case "spread-corruption-marker":
      return openDieSlotChoice(
        draft,
        { ...pending, effect: { type: "add-corruption-marker", amount: 1 } },
        "same-die-other-slot",
        false,
        { contextDieId: dieId, excludedSlotIndex: slotIndex },
      );
    case "suppress-opposing-natural-inherent":
      setSuppressInherentNextRoll(draft, dieId, slotIndex);
      return false;
    case "strip-corrupted-face-unusable-symbol": {
      const die = draft.dice[dieId];
      const ownerId = die?.ownerId ?? pending.controllerId;
      stripFaceToShield(draft, dieId, slotIndex, ownerId);
      createSymbol(draft, pending.controllerId, "corruption", "available", "effect", {
        usable: false,
      });
      return false;
    }
    case "copy-appeared-synthetic-onroll": {
      const faceCardId = draft.dice[dieId]?.slots[slotIndex]?.faceCardId;
      if (faceCardId === undefined) return false;
      const face = getFaceCard(faceCardId);
      if (face === undefined) return false;
      for (const child of [...face.onRoll].reverse()) {
        pushEffect(draft, pending.controllerId, child, null, null, null, dieId, slotIndex);
      }
      return false;
    }
    default:
      return false;
  }
}

export function applyPoolSymbolWildcard(
  draft: Draft,
  controllerId: PlayerId,
  symbolId: SymbolInstanceId,
): void {
  const symbol = draft.symbols[symbolId];
  if (symbol === undefined) return;
  const current = draft.requirementWildcardsThisTurn[controllerId] ?? [];
  draft.requirementWildcardsThisTurn = {
    ...draft.requirementWildcardsThisTurn,
    [controllerId]: [...current, { fromSymbol: symbol.symbol }],
  };
}

export function applyRemoveToxinForDamage(
  draft: Draft,
  controllerId: PlayerId,
  creatureId: CreatureId,
  amount: number,
): void {
  const creature = draft.creatures[creatureId];
  if (creature === undefined || creature.defeated || amount <= 0) return;
  const removed = Math.min(amount, creature.toxinMarkers);
  if (removed <= 0) return;
  patchCreature(draft, creatureId, { toxinMarkers: creature.toxinMarkers - removed });
  dealDamage(draft, creatureId, removed);
  void controllerId;
}

export function applyOptionalOverchargeAccept(
  draft: Draft,
  controllerId: PlayerId,
  amount: number,
  dieId: DieId,
  slotIndex: number,
): void {
  gainEnergy(draft, controllerId, amount);
  setSuppressInherentNextRoll(draft, dieId, slotIndex);
}

function applyReposition(
  draft: Draft,
  pending: PendingEffect,
  creatureId: CreatureId,
  _optional: boolean,
): boolean {
  void _optional;
  const creature = draft.creatures[creatureId];
  if (creature === undefined || creature.defeated) return false;
  const to = creature.position === "frontline" ? "back" : "frontline";
  if (to === "back") {
    setCreaturePosition(draft, creatureId, "back");
    return false;
  }
  const front = livingCreaturesOf(draft, creature.ownerId).filter(
    (candidate) => candidate.position === "frontline",
  );
  if (front.length < draft.config.frontlineSlots) {
    setCreaturePosition(draft, creatureId, "frontline");
    return false;
  }
  if (front.length === 0) return false;
  draft.pendingDecision = {
    type: "choose-creature",
    controllerId: pending.controllerId,
    filter: "allied-frontline",
    optional: false,
    deferred: {
      ...pending,
      sourceCreatureId: creatureId,
      effect: { type: "swap-positions", with: { kind: "declared-target" } },
    },
  };
  emit(draft, {
    type: "choose-creature-started",
    playerId: pending.controllerId,
    filter: "allied-frontline",
  });
  return true;
}

function openDieChoice(
  draft: Draft,
  pending: PendingEffect,
  filter: DieChoiceFilter,
  optional: boolean,
): boolean {
  if (legalDiceForFilter(draft, pending.controllerId, filter).length === 0) return false;
  draft.pendingDecision = {
    type: "choose-die",
    controllerId: pending.controllerId,
    filter,
    optional,
    deferred: pending,
  };
  return true;
}

function reduceOpponentEnergy(
  draft: Draft,
  controllerId: PlayerId,
  amount: number,
  _mode: "lose" | "transfer",
): void {
  void _mode;
  if (amount <= 0) return;
  const opponentId = opponentOf(draft, controllerId);
  if (draft.energy.holderId !== opponentId) return;
  const lost = Math.min(amount, draft.energy.value);
  if (lost <= 0) return;
  const value = draft.energy.value - lost;
  draft.energy = { holderId: opponentId, value };
  emit(draft, { type: "energy-lost", playerId: opponentId, amount: lost, remaining: value });
}

export function applyRetainDieFromEffect(draft: Draft, playerId: PlayerId, dieId: DieId): void {
  const die = draft.dice[dieId];
  if (die === undefined || die.ownerId !== playerId) return;
  if (die.rolledSlotIndex === null || die.stunMarkers > 0) return;
  if (die.retained) return;
  patchDie(draft, dieId, { retained: true });
  emit(draft, { type: "die-retained", dieId, playerId });
}

export function fireDieModifiers(
  draft: Draft,
  controllerId: PlayerId,
  dieId: DieId,
): void {
  const die = draft.dice[dieId];
  const slotIndex = die?.rolledSlotIndex;
  if (die === undefined || slotIndex === null || slotIndex === undefined) return;
  const slot = die.slots[slotIndex];
  if (slot === undefined) return;
  const face = getFaceCard(slot.faceCardId);
  if (face !== undefined) {
    for (const effect of [...face.onRoll].reverse()) {
      pushEffect(draft, controllerId, effect, null, null, null, dieId, slotIndex);
    }
  }
  const player = draft.players[controllerId];
  if (player === undefined) return;
  for (const cardInstanceId of player.overload) {
    const card = draft.cards[cardInstanceId];
    if (card?.attachedToFaceCardId !== slot.faceCardId) continue;
    const region = getCard(card.cardId)?.overload;
    if (region === undefined) continue;
    for (const effect of [...region.onRoll].reverse()) {
      pushEffect(
        draft,
        controllerId,
        effect,
        null,
        null,
        null,
        dieId,
        slotIndex,
        0,
        cardInstanceId,
      );
    }
  }
}

function applyCopyOtherDieFace(draft: Draft, pending: PendingEffect): void {
  const ownDice = draft.players[pending.controllerId]?.dieIds ?? [];
  const otherId = ownDice.find((id) => id !== pending.sourceDieId);
  if (otherId === undefined) return;
  fireDieModifiers(draft, pending.controllerId, otherId);
}

function applyPestilenceCounter(draft: Draft, pending: PendingEffect): void {
  if (pending.sourceDieId === null || pending.sourceSlotIndex === null) return;
  const die = draft.dice[pending.sourceDieId];
  if (die === undefined) return;
  const slot = die.slots[pending.sourceSlotIndex];
  if (slot === undefined) return;
  const spreading = getFaceCard(slot.faceCardId);
  const threshold = spreading?.pestilenceSpreadAt;
  const spreadingId = slot.faceCardId;
  const ownerId = slot.faceCardOwnerId;
  const next = (slot.pestilenceCounters ?? 0) + 1;
  const slots = die.slots.map((candidate) =>
    candidate.index === slot.index ? { ...candidate, pestilenceCounters: next } : candidate,
  );
  patchDie(draft, die.id, { slots });
  if (threshold === undefined || next < threshold) return;

  const reset = (draft.dice[die.id]?.slots ?? []).map((candidate) =>
    candidate.index === slot.index ? { ...candidate, pestilenceCounters: 0 } : candidate,
  );
  patchDie(draft, die.id, { slots: reset });

  const adjacent = [slot.index - 1, slot.index + 1].filter(
    (index) => die.slots[index] !== undefined,
  );
  const alreadyInstalled = countInstalledCopies(draft, spreadingId, ownerId) > 0;
  const inPool = (draft.players[ownerId]?.facePool ?? []).includes(spreadingId);
  if (!alreadyInstalled && !inPool) return;

  for (const index of adjacent) {
    const current = draft.dice[die.id];
    if (current === undefined) return;
    const target = current.slots[index];
    if (target === undefined || slotCannotBeReplacedByForge(target)) continue;
    if (
      spreading !== undefined &&
      forgeExceedsAttributeLimit(current, [index], spreading.symbol, 1, draft.config)
    ) {
      continue;
    }
    if (!alreadyInstalled && !takeFaceFromPool(draft, ownerId, spreadingId)) {
      return;
    }
    const displaced = current.slots[index];
    const nextSlots = withForgeLockResetOnInstall(
      current.slots.map((candidate) =>
        candidate.index === index ? overwrittenSlot(candidate, spreadingId, ownerId) : candidate,
      ),
      spreadingId,
    );
    patchDie(draft, die.id, { slots: nextSlots });
    if (displaced !== undefined) {
      returnFaceToPoolIfOrphaned(draft, displaced.faceCardId, displaced.faceCardOwnerId);
      if (countInstalledCopies(draft, displaced.faceCardId, displaced.faceCardOwnerId) === 0) {
        clearOverloadsOnFace(draft, displaced.faceCardId, displaced.faceCardOwnerId);
      }
    }
    emit(draft, {
      type: "face-forged",
      playerId: ownerId,
      cardInstanceId: null,
      dieId: die.id,
      slotIndex: index,
      faceCardId: spreadingId,
    });
    return;
  }
}

export function consumeSyntheticCorruptionOnDie(
  draft: Draft,
  dieId: DieId,
): number {
  const die = draft.dice[dieId];
  if (die === undefined) return 0;
  let consumed = 0;
  const displaced: Array<{ faceCardId: typeof die.slots[0]["faceCardId"]; ownerId: PlayerId }> = [];
  const slots = die.slots.map((slot) => {
    const face = getFaceCard(slot.faceCardId);
    if (face?.kind !== "synthetic" || face.symbol !== "corruption") return slot;
    consumed += 1;
    displaced.push({ faceCardId: slot.faceCardId, ownerId: slot.faceCardOwnerId });
    return {
      ...slot,
      faceCardId: SHIELD_FACE_ID,
      faceCardOwnerId: die.ownerId,
      pestilenceCounters: 0,
      forgeLockRemaining: 0,
    };
  });
  if (consumed === 0) return 0;
  patchDie(draft, dieId, { slots });
  for (const old of displaced) {
    returnFaceToPoolIfOrphaned(draft, old.faceCardId, old.ownerId);
    if (countInstalledCopies(draft, old.faceCardId, old.ownerId) === 0) {
      clearOverloadsOnFace(draft, old.faceCardId, old.ownerId);
    }
  }
  return consumed;
}

function applyPreventAttackReflect(draft: Draft, controllerId: PlayerId): void {
  let attackIndex = -1;
  for (let i = draft.chainStack.length - 1; i >= 0; i -= 1) {
    if (draft.chainStack[i]?.kind === "attack") {
      attackIndex = i;
      break;
    }
  }
  if (attackIndex < 0) return;
  const attack = draft.chainStack[attackIndex];
  if (attack === undefined || attack.attackEffect === null) return;
  if (attack.attackTargetId === null || attack.attackerId === null) return;

  const target = draft.creatures[attack.attackTargetId];
  if (target === undefined || target.ownerId !== controllerId) return;

  const amount =
    attack.attackEffect.type === "damage" ? attack.attackEffect.amount : 0;
  if (amount <= 0) return;

  draft.chainStack[attackIndex] = {
    ...attack,
    attackEffect:
      attack.attackEffect.type === "damage"
        ? { ...attack.attackEffect, amount: 0 }
        : attack.attackEffect,
  };

  emit(draft, {
    type: "damage-prevented",
    creatureId: attack.attackTargetId,
    amount,
    shieldsRemaining: target.shields,
    source: "effect",
  });
  firePreventDraw(draft, controllerId);

  dealDamage(draft, attack.attackerId, amount);
}

/** Glimmer: if this player has an armed prevent-draw, draw and clear it. */
function firePreventDraw(draft: Draft, playerId: PlayerId): void {
  const amount = draft.preventDrawArmed[playerId];
  if (amount === undefined || amount <= 0) return;
  const next = { ...draft.preventDrawArmed };
  delete next[playerId];
  draft.preventDrawArmed = next;
  drawCards(draft, playerId, amount);
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
  options?: { readonly usable?: boolean },
): SymbolInstanceId {
  const id = asSymbolInstanceId(nextInstanceId(draft, "symbol"));
  draft.symbols[id] = {
    id,
    ownerId,
    symbol,
    status,
    sourceDieId: null,
    absorbedByCreatureId: null,
    ...(options?.usable === false ? { usable: false } : {}),
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

  let granted = amount;
  const cap = creature.toxinReceiveCapRemaining;
  if (cap !== undefined && cap !== null) {
    if (cap <= 0) return;
    granted = Math.min(amount, cap);
  }
  if (granted <= 0) return;

  const total = creature.toxinMarkers + granted;
  const nextCap =
    cap === undefined || cap === null ? cap : Math.max(0, cap - granted);
  patchCreature(draft, creatureId, {
    toxinMarkers: total,
    ...(cap !== undefined && cap !== null ? { toxinReceiveCapRemaining: nextCap } : {}),
  });
  emit(draft, { type: "toxin-applied", creatureId, amount: granted, total });
}

export function addCorruptionMarker(
  draft: Draft,
  dieId: DieId,
  slotIndex: number,
  amount: number,
): void {
  const die = draft.dice[dieId];
  if (die === undefined || amount <= 0) return;
  const slots = die.slots.map((slot) => {
    if (slot.index !== slotIndex) return slot;
    return {
      ...slot,
      corruptionMarkers: (slot.corruptionMarkers ?? 0) + amount,
    };
  });
  patchDie(draft, dieId, { slots });
}

export function lockFaceResource(draft: Draft, dieId: DieId, slotIndex: number): void {
  const die = draft.dice[dieId];
  if (die === undefined) return;
  const slots = die.slots.map((slot) =>
    slot.index === slotIndex ? { ...slot, resourceLockedThisTurn: true } : slot,
  );
  patchDie(draft, dieId, { slots });
  if (die.rolledSlotIndex === slotIndex) {
    for (const symbol of Object.values(draft.symbols)) {
      if (symbol.sourceDieId !== dieId) continue;
      if (symbol.status !== "rolled" && symbol.status !== "available") continue;
      draft.symbols[symbol.id] = { ...symbol, usable: false };
    }
  }
}

export function setSuppressInherentNextRoll(
  draft: Draft,
  dieId: DieId,
  slotIndex: number,
): void {
  const die = draft.dice[dieId];
  if (die === undefined) return;
  const slots = die.slots.map((slot) =>
    slot.index === slotIndex ? { ...slot, suppressInherentNextRoll: true } : slot,
  );
  patchDie(draft, dieId, { slots });
}

/** Strip a face to natural Shield; return displaced face to its owner's pool. */
export function stripFaceToShield(
  draft: Draft,
  dieId: DieId,
  slotIndex: number,
  shieldOwnerId: PlayerId,
): void {
  const die = draft.dice[dieId];
  if (die === undefined) return;
  const slot = die.slots[slotIndex];
  if (slot === undefined) return;
  const displaced = { faceCardId: slot.faceCardId, ownerId: slot.faceCardOwnerId };
  const slots = die.slots.map((candidate) =>
    candidate.index === slotIndex
      ? {
          ...candidate,
          faceCardId: SHIELD_FACE_ID,
          faceCardOwnerId: shieldOwnerId,
          pestilenceCounters: 0,
          forgeLockRemaining: 0,
          corruptionMarkers: 0,
          suppressInherentNextRoll: false,
          resourceLockedThisTurn: false,
        }
      : candidate,
  );
  patchDie(draft, dieId, { slots });
  returnFaceToPoolIfOrphaned(draft, displaced.faceCardId, displaced.ownerId);
  if (countInstalledCopies(draft, displaced.faceCardId, displaced.ownerId) === 0) {
    clearOverloadsOnFace(draft, displaced.faceCardId, displaced.ownerId);
  }
}

export function clearResourceLocks(draft: Draft): void {
  for (const die of Object.values(draft.dice)) {
    let changed = false;
    const slots = die.slots.map((slot) => {
      if (slot.resourceLockedThisTurn !== true) return slot;
      changed = true;
      return { ...slot, resourceLockedThisTurn: false };
    });
    if (changed) patchDie(draft, die.id, { slots });
  }
}

/**
 * Decrement remaining forge-lock on dice owned by `ownerId` (that player's
 * turn just ended). Floor 0. Opponent-owned dice are not ticked.
 */
export function tickForgeLocksForOwner(draft: Draft, ownerId: PlayerId): void {
  for (const die of Object.values(draft.dice)) {
    if (die.ownerId !== ownerId) continue;
    let changed = false;
    const slots = die.slots.map((slot) => {
      const remaining = slot.forgeLockRemaining ?? 0;
      if (remaining <= 0) return slot;
      changed = true;
      return { ...slot, forgeLockRemaining: remaining - 1 };
    });
    if (changed) patchDie(draft, die.id, { slots });
  }
}

export function clearToxinReceiveCapsForOwner(draft: Draft, ownerId: PlayerId): void {
  for (const creature of Object.values(draft.creatures)) {
    if (creature.ownerId !== ownerId) continue;
    if (creature.toxinReceiveCapRemaining === undefined || creature.toxinReceiveCapRemaining === null) {
      continue;
    }
    patchCreature(draft, creature.id, { toxinReceiveCapRemaining: null });
  }
}

/** At the start of a creature's owner's turn: 1 damage per Toxin counter. */
export function tickToxins(draft: Draft, ownerId: PlayerId): void {
  const player = draft.players[ownerId];
  if (player === undefined) return;

  for (const creatureId of player.creatureIds) {
    const creature = draft.creatures[creatureId];
    if (creature === undefined || creature.defeated || creature.toxinMarkers <= 0) continue;
    emit(draft, { type: "toxin-tick", creatureId, amount: creature.toxinMarkers });
    const dealt = dealDamage(draft, creatureId, creature.toxinMarkers);
    if (dealt > 0) fireOnToxinDamage(draft, creatureId);
  }
  drainResolution(draft);
}

/**
 * Applies damage with prevent → Shield → HP. Returns HP damage actually dealt
 * (0 if fully prevented or the creature was already gone).
 *
 * `ignoreShield` skips that many Shield (they do not block and are not spent).
 */
export function dealDamage(
  draft: Draft,
  creatureId: CreatureId,
  amount: number,
  options?: { readonly ignoreShield?: number },
): number {
  const creature = draft.creatures[creatureId];
  if (creature === undefined || creature.defeated) return 0;

  const definition = getCreatureDefinition(creature.definitionId);
  if (definition === undefined) return 0;

  let incoming = amount;

  const redirected = takeRedirect(draft, creatureId, incoming);
  if (redirected.amount > 0 && redirected.to !== null) {
    dealDamage(draft, redirected.to, redirected.amount);
    incoming -= redirected.amount;
  }
  if (incoming <= 0) return 0;

  const afterRedirect = draft.creatures[creatureId];
  if (afterRedirect === undefined || afterRedirect.defeated) return 0;
  if (afterRedirect.nextIncomingDamageBonus > 0) {
    incoming += afterRedirect.nextIncomingDamageBonus;
    patchCreature(draft, creatureId, { nextIncomingDamageBonus: 0 });
  }

  let remaining = applyOnTakeDamageReduce(draft, creatureId, incoming);

  // Spec 009: prevention buffer → Shield → HP.
  const fromBuffer = Math.min(
    draft.creatures[creatureId]?.damagePreventBuffer ?? 0,
    remaining,
  );
  if (fromBuffer > 0) {
    const buffered = draft.creatures[creatureId]!;
    patchCreature(draft, creatureId, {
      damagePreventBuffer: buffered.damagePreventBuffer - fromBuffer,
    });
    remaining -= fromBuffer;
    emit(draft, {
      type: "damage-prevented",
      creatureId,
      amount: fromBuffer,
      shieldsRemaining: buffered.shields,
      source: "buffer",
    });
    firePreventDraw(draft, buffered.ownerId);
  }

  if (remaining <= 0) return 0;

  const refreshed = draft.creatures[creatureId];
  if (refreshed === undefined || refreshed.defeated) return 0;

  const ignore = options?.ignoreShield ?? 0;
  const effectiveShields = Math.max(0, refreshed.shields - ignore);
  const fromShield = Math.min(effectiveShields, remaining);
  if (fromShield > 0) {
    patchCreature(draft, creatureId, { shields: refreshed.shields - fromShield });
    remaining -= fromShield;
    emit(draft, {
      type: "damage-prevented",
      creatureId,
      amount: fromShield,
      shieldsRemaining: refreshed.shields - fromShield,
      source: "shield",
    });
  }

  if (remaining <= 0) return 0;

  const afterShield = draft.creatures[creatureId];
  if (afterShield === undefined || afterShield.defeated) return 0;

  const damage = afterShield.damage + remaining;
  const defeated = damage >= definition.life;
  patchCreature(draft, creatureId, { damage, defeated });
  emit(draft, { type: "damage-dealt", creatureId, amount: remaining });
  fireOnTakeDamageEffects(draft, creatureId);

  if (!defeated) return remaining;

  emit(draft, { type: "creature-defeated", creatureId });
  releaseDiceHeldBy(draft, creatureId);
  releaseEquipmentOn(draft, creatureId);
  checkVictory(draft);
  return remaining;
}

function takeRedirect(
  draft: Draft,
  creatureId: CreatureId,
  amount: number,
): { readonly amount: number; readonly to: CreatureId | null } {
  const target = draft.creatures[creatureId];
  if (target === undefined || amount <= 0) return { amount: 0, to: null };
  const owner = draft.players[target.ownerId];
  if (owner === undefined) return { amount: 0, to: null };
  for (const allyId of owner.creatureIds) {
    if (allyId === creatureId) continue;
    const ally = draft.creatures[allyId];
    if (ally === undefined || ally.defeated || ally.redirectDamageThisTurn <= 0) continue;
    const shifted = Math.min(amount, ally.redirectDamageThisTurn);
    patchCreature(draft, allyId, {
      redirectDamageThisTurn: ally.redirectDamageThisTurn - shifted,
    });
    return { amount: shifted, to: allyId };
  }
  return { amount: 0, to: null };
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
