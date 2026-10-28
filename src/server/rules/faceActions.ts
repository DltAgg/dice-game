import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard } from "../content/faces.js";
import type { FaceCardDefinition } from "../model/dice.js";
import {
  secondaryRequiresFaceId,
  secondaryRequiresFaceType,
  secondaryRequiresHitClass,
  secondaryRequiresSequenceRole,
  type FighterTechniqueDefinition,
  type FighterTechniqueSecondary,
} from "../model/fighterTechniques.js";
import type { CreatureId, DieId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { dieForCreature, isActiveFighter, opponentActiveId } from "./fighters.js";
import { finisherBlockedByTag, sequenceMeterAffordable, sequenceRoleFits } from "./offensive.js";

export function faceActionKey(dieId: DieId): string {
  return `face-action:${dieId}`;
}

export function dieIsFaceActionSpent(
  state: Pick<GameState, "players" | "config">,
  playerId: PlayerId,
  dieId: DieId,
): boolean {
  if (!state.config.consumeDiceOnFaceActions) return false;
  return state.players[playerId]?.spentOncePerTurnKeys.includes(faceActionKey(dieId)) ?? false;
}

/**
 * Another rolled die owned by the same player. Never an opponent die.
 * `activeDieId` is the Active Fighter's die and is excluded, so one showing
 * face cannot fill both inputs of the same Technique. Spec `030`.
 */
export function secondaryDiceFor(
  state: Pick<GameState, "players" | "dice" | "config">,
  playerId: PlayerId,
  activeDieId: DieId,
): readonly DieId[] {
  const player = state.players[playerId];
  if (player === undefined) return [];
  const out: DieId[] = [];
  for (const dieId of player.dieIds) {
    if (dieId === activeDieId) continue;
    const die = state.dice[dieId];
    if (die === undefined || die.ownerId !== playerId) continue;
    if (die.rolledSlotIndex === null) continue;
    if (dieIsFaceActionSpent(state, playerId, dieId)) continue;
    out.push(dieId);
  }
  return out;
}

export function showingFaceCard(
  state: Pick<GameState, "dice">,
  dieId: DieId,
): FaceCardDefinition | undefined {
  const die = state.dice[dieId];
  if (die === undefined || die.rolledSlotIndex === null) return undefined;
  const slot = die.slots[die.rolledSlotIndex];
  if (slot === undefined) return undefined;
  return getFaceCard(slot.faceCardId);
}

export interface TechniqueInputAssignment {
  readonly primaryDieId: DieId;
  readonly secondaryDieId: DieId;
  readonly primaryFace: FaceCardDefinition;
  readonly secondaryFace: FaceCardDefinition;
}

/**
 * Assign the Technique's two inputs across the Active Fighter's die and one
 * other die. Either die may show `primaryFaceId`. When both assignments fit,
 * the Active Fighter's die stays the primary so the other face still supplies
 * the secondary bonus.
 */
export function assignTechniqueInputs(
  state: Pick<GameState, "dice">,
  technique: Pick<FighterTechniqueDefinition, "primaryFaceId" | "secondary">,
  activeDieId: DieId,
  otherDieId: DieId,
): TechniqueInputAssignment | null {
  if (activeDieId === otherDieId) return null;
  const activeFace = showingFaceCard(state, activeDieId);
  const otherFace = showingFaceCard(state, otherDieId);
  if (activeFace === undefined || otherFace === undefined) return null;
  if (
    activeFace.id === technique.primaryFaceId &&
    secondaryMatches(otherFace, technique.secondary)
  ) {
    return {
      primaryDieId: activeDieId,
      secondaryDieId: otherDieId,
      primaryFace: activeFace,
      secondaryFace: otherFace,
    };
  }
  if (
    otherFace.id === technique.primaryFaceId &&
    secondaryMatches(activeFace, technique.secondary)
  ) {
    return {
      primaryDieId: otherDieId,
      secondaryDieId: activeDieId,
      primaryFace: otherFace,
      secondaryFace: activeFace,
    };
  }
  return null;
}

export function secondaryMatches(
  face: FaceCardDefinition,
  secondary: FighterTechniqueSecondary,
): boolean {
  if (secondaryRequiresFaceId(secondary)) return face.id === secondary.faceId;
  if (secondaryRequiresFaceType(secondary)) return face.faceType === secondary.faceType;
  if (secondaryRequiresSequenceRole(secondary)) return face.sequenceRole === secondary.sequenceRole;
  if (!secondaryRequiresHitClass(secondary)) return false;
  const strengthOk = !("hitStrength" in secondary) || face.hitStrength === secondary.hitStrength;
  const strikeOk = !("hitType" in secondary) || face.hitType === secondary.hitType;
  return strengthOk && strikeOk;
}

export function canUseFace(
  state: GameState,
  playerId: PlayerId,
  creatureId: CreatureId,
): boolean {
  if (state.phase !== "actions") return false;
  if (state.status === "finished") return false;
  const player = state.players[playerId];
  if (player === undefined) return false;
  if (!player.creatureIds.includes(creatureId)) return false;
  const creature = state.creatures[creatureId];
  if (creature === undefined || creature.defeated) return false;
  const die = dieForCreature(state, creatureId);
  if (die === undefined || die.rolledSlotIndex === null) return false;
  if (dieIsFaceActionSpent(state, playerId, die.id)) return false;
  const face = showingFaceCard(state, die.id);
  if ((face?.primaryEffects?.length ?? 0) === 0) return false;
  if (face?.sequenceRole !== undefined) {
    if (state.aggressorPlayerId !== playerId) return false;
    if (!sequenceRoleFits(state.offensiveState, face.sequenceRole)) return false;
    if (finisherBlockedByTag(state, playerId, face.sequenceRole)) return false;
    if (!sequenceMeterAffordable(state, playerId, face.meterCost)) return false;
  }
  return true;
}

export function legalFaceActions(
  state: GameState,
  playerId: PlayerId,
): readonly CreatureId[] {
  const player = state.players[playerId];
  if (player === undefined) return [];
  return player.creatureIds.filter((creatureId) => canUseFace(state, playerId, creatureId));
}

export interface MatchingTechnique {
  readonly techniqueId: string;
  readonly secondaryDieId: DieId;
}

export function matchingTechniques(
  state: GameState,
  playerId: PlayerId,
  creatureId: CreatureId,
): readonly MatchingTechnique[] {
  if (state.phase !== "actions") return [];
  const player = state.players[playerId];
  if (player === undefined) return [];
  if (!isActiveFighter(player, creatureId)) return [];
  const creature = state.creatures[creatureId];
  if (creature === undefined || creature.defeated) return [];
  const activeDie = dieForCreature(state, creatureId);
  if (activeDie === undefined || activeDie.rolledSlotIndex === null) return [];
  if (dieIsFaceActionSpent(state, playerId, activeDie.id)) return [];
  if (showingFaceCard(state, activeDie.id) === undefined) return [];

  const definition = getCreatureDefinition(creature.definitionId);
  const techniques = [
    ...(definition?.techniques ?? []),
    ...(creature.addedTechniques ?? []),
  ];
  if (techniques.length === 0) return [];

  const others = secondaryDiceFor(state, playerId, activeDie.id);
  const out: MatchingTechnique[] = [];
  for (const technique of techniques) {
    if (technique.sequenceRole !== undefined) {
      if (state.aggressorPlayerId !== playerId) continue;
      if (!sequenceRoleFits(state.offensiveState, technique.sequenceRole)) continue;
      if (finisherBlockedByTag(state, playerId, technique.sequenceRole)) continue;
      if (!sequenceMeterAffordable(state, playerId, technique.meterCost)) continue;
    }
    for (const otherDieId of others) {
      if (assignTechniqueInputs(state, technique, activeDie.id, otherDieId) === null) continue;
      out.push({ techniqueId: technique.id, secondaryDieId: otherDieId });
    }
  }
  return out;
}

export function findTechnique(
  definitionTechniques: readonly FighterTechniqueDefinition[] | undefined,
  techniqueId: string,
): FighterTechniqueDefinition | undefined {
  return definitionTechniques?.find((technique) => technique.id === techniqueId);
}

export function defaultFaceActionTarget(
  state: Pick<GameState, "players" | "playerOrder">,
  playerId: PlayerId,
): CreatureId | null {
  return opponentActiveId(state, playerId);
}
