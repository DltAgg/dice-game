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
import { sequenceMeterAffordable, sequenceRoleFits } from "./offensive.js";

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
 * The primary die is excluded, so one rolled face cannot fill both inputs
 * of the same Technique. Spec `030`.
 */
export function secondaryDiceFor(
  state: Pick<GameState, "players" | "dice" | "config">,
  playerId: PlayerId,
  primaryDieId: DieId,
): readonly DieId[] {
  const player = state.players[playerId];
  if (player === undefined) return [];
  const out: DieId[] = [];
  for (const dieId of player.dieIds) {
    if (dieId === primaryDieId) continue;
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
  if (!isActiveFighter(player, creatureId)) return false;
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
  }
  return true;
}

export function legalFaceActions(
  state: GameState,
  playerId: PlayerId,
): readonly CreatureId[] {
  const player = state.players[playerId];
  if (player === undefined) return [];
  const activeId = player.activeCreatureId;
  return canUseFace(state, playerId, activeId) ? [activeId] : [];
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
  const primaryDie = dieForCreature(state, creatureId);
  if (primaryDie === undefined || primaryDie.rolledSlotIndex === null) return [];
  if (dieIsFaceActionSpent(state, playerId, primaryDie.id)) return [];
  const primaryFace = showingFaceCard(state, primaryDie.id);
  if (primaryFace === undefined) return [];

  const definition = getCreatureDefinition(creature.definitionId);
  const techniques = definition?.techniques ?? [];
  if (techniques.length === 0) return [];

  const secondaries = secondaryDiceFor(state, playerId, primaryDie.id);
  const out: MatchingTechnique[] = [];
  for (const technique of techniques) {
    if (primaryFace.id !== technique.primaryFaceId) continue;
    if (technique.sequenceRole !== undefined) {
      if (state.aggressorPlayerId !== playerId) continue;
      if (!sequenceRoleFits(state.offensiveState, technique.sequenceRole)) continue;
      if (!sequenceMeterAffordable(state, playerId, technique.meterCost)) continue;
    }
    const relaxed = new Set(creature.enabledTechniqueIds ?? []);
    for (const secondaryDieId of secondaries) {
      const secondaryFace = showingFaceCard(state, secondaryDieId);
      if (secondaryFace === undefined) continue;
      const secondaryOk = secondaryMatches(secondaryFace, technique.secondary);
      if (!secondaryOk && !relaxed.has(technique.id)) continue;
      out.push({ techniqueId: technique.id, secondaryDieId });
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
