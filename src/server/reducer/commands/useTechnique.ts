import { getCreatureDefinition } from "../../content/creatures.js";
import type { EffectDefinition } from "../../model/effects.js";
import type { GameError } from "../../model/errors.js";
import type { CreatureId, DieId, PlayerId } from "../../model/ids.js";
import { dieForCreature, isActiveFighter } from "../../rules/fighters.js";
import {
  defaultFaceActionTarget,
  dieIsFaceActionSpent,
  faceActionKey,
  findTechnique,
  secondaryDiceFor,
  secondaryMatches,
  showingFaceCard,
} from "../../rules/faceActions.js";
import { emit, type Draft } from "../draft.js";
import { drainResolution, pushEffect } from "../resolution.js";
import { markPlayerSpent } from "../triggerSpent.js";

function techniqueDamageBonus(secondaryEffects: readonly EffectDefinition[]): number {
  let bonus = 0;
  for (const effect of secondaryEffects) {
    if (effect.type === "next-attack-bonus") bonus += effect.amount;
  }
  return bonus;
}

function applyLocalDamageBonus(
  effects: readonly EffectDefinition[],
  bonus: number,
): readonly EffectDefinition[] {
  if (bonus === 0) return effects;
  return effects.map((effect) =>
    effect.type === "damage" ? { ...effect, amount: effect.amount + bonus } : effect,
  );
}

function residualSecondaryEffects(
  secondaryEffects: readonly EffectDefinition[],
): readonly EffectDefinition[] {
  return secondaryEffects.filter((effect) => effect.type !== "next-attack-bonus");
}

export function useTechnique(
  draft: Draft,
  playerId: PlayerId,
  creatureId: CreatureId,
  techniqueId: string,
  secondaryDieId: DieId,
): GameError | null {
  if (draft.phase !== "actions") return "INVALID_PHASE";
  const player = draft.players[playerId];
  if (player === undefined) return "UNKNOWN_ENTITY";
  if (!isActiveFighter(player, creatureId)) return "INVALID_TARGET";
  const creature = draft.creatures[creatureId];
  if (creature === undefined) return "UNKNOWN_ENTITY";
  if (creature.defeated) return "CREATURE_DEFEATED";

  const primaryDie = dieForCreature(draft, creatureId);
  if (primaryDie === undefined) return "UNKNOWN_ENTITY";
  if (primaryDie.rolledSlotIndex === null) return "INVALID_TARGET";
  if (dieIsFaceActionSpent(draft, playerId, primaryDie.id)) return "ALREADY_USED";

  if (secondaryDieId === primaryDie.id) return "INVALID_TARGET";
  if (!secondaryDiceFor(draft, playerId, primaryDie.id).includes(secondaryDieId)) {
    return "INVALID_TARGET";
  }
  if (dieIsFaceActionSpent(draft, playerId, secondaryDieId)) return "ALREADY_USED";

  const primaryFace = showingFaceCard(draft, primaryDie.id);
  if (primaryFace === undefined) return "INVALID_TARGET";

  const definition = getCreatureDefinition(creature.definitionId);
  const technique = findTechnique(definition?.techniques, techniqueId);
  if (technique === undefined) return "CARD_NOT_AVAILABLE";
  if (primaryFace.id !== technique.primaryFaceId) return "ATTACK_NOT_FUELLED";

  const secondaryFace = showingFaceCard(draft, secondaryDieId);
  if (secondaryFace === undefined) return "INVALID_TARGET";
  if (!secondaryMatches(secondaryFace, technique.secondary)) return "ATTACK_NOT_FUELLED";

  const baseEffects = technique.effects;
  if (baseEffects.length === 0 && (secondaryFace.secondaryEffects?.length ?? 0) === 0) {
    return "CARD_HAS_NO_EFFECT";
  }

  if (draft.config.consumeDiceOnFaceActions) {
    markPlayerSpent(draft, playerId, faceActionKey(primaryDie.id));
    markPlayerSpent(draft, playerId, faceActionKey(secondaryDieId));
  }

  const secondaryEffects = secondaryFace.secondaryEffects ?? [];
  const damageBonus = techniqueDamageBonus(secondaryEffects);
  const resolvedBase = applyLocalDamageBonus(baseEffects, damageBonus);
  const residual = residualSecondaryEffects(secondaryEffects);

  const targetId = defaultFaceActionTarget(draft, playerId);
  emit(draft, {
    type: "technique-used",
    playerId,
    creatureId,
    techniqueId,
    primaryDieId: primaryDie.id,
    secondaryDieId,
    primaryFaceCardId: primaryFace.id,
    secondaryFaceCardId: secondaryFace.id,
  });

  for (const effect of [...residual].reverse()) {
    pushEffect(draft, playerId, effect, creatureId, targetId);
  }
  for (const effect of [...resolvedBase].reverse()) {
    pushEffect(draft, playerId, effect, creatureId, targetId);
  }
  drainResolution(draft);
  return null;
}
