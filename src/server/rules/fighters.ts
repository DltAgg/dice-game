import { getCreatureDefinition } from "../content/creatures.js";
import { getFaceCard } from "../content/faces.js";
import type { CardDefinition } from "../model/cards.js";
import type { AttackDefinition, CreatureState } from "../model/creatures.js";
import type { DieState } from "../model/dice.js";
import type { CreatureId, PlayerId } from "../model/ids.js";
import type { GameState, PlayerState } from "../model/state.js";
import type { Technique } from "../model/techniques.js";
import { opponentOf } from "./creatures.js";

export function dieForCreature(
  state: Pick<GameState, "players" | "dice" | "creatures">,
  creatureId: CreatureId,
): DieState | undefined {
  const creature = state.creatures[creatureId];
  if (creature === undefined) return undefined;
  const player = state.players[creature.ownerId];
  if (player === undefined) return undefined;
  const index = player.creatureIds.indexOf(creatureId);
  if (index < 0) return undefined;
  const dieId = player.dieIds[index];
  return dieId === undefined ? undefined : state.dice[dieId];
}

export function showingTechnique(
  state: Pick<GameState, "players" | "dice" | "creatures">,
  creatureId: CreatureId,
): Technique | null {
  const die = dieForCreature(state, creatureId);
  if (die === undefined || die.rolledSlotIndex === null) return null;
  const slot = die.slots[die.rolledSlotIndex];
  if (slot === undefined) return null;
  return getFaceCard(slot.faceCardId)?.technique ?? null;
}

export function isActiveFighter(
  player: PlayerState,
  creatureId: CreatureId,
): boolean {
  return player.activeCreatureId === creatureId;
}

export function isLivingReserve(
  state: Pick<GameState, "creatures">,
  player: PlayerState,
  creatureId: CreatureId,
): boolean {
  if (player.activeCreatureId === creatureId) return false;
  if (!player.creatureIds.includes(creatureId)) return false;
  const creature = state.creatures[creatureId];
  return creature !== undefined && !creature.defeated;
}

export function techniquesFuelAttack(
  state: Pick<GameState, "players" | "dice" | "creatures">,
  attackerId: CreatureId,
  attack: AttackDefinition,
): boolean {
  const required = attack.requiredTechniques;
  if (required === undefined || required.length === 0) return true;
  const showing = showingTechnique(state, attackerId);
  if (showing === null) return false;
  return required.every((technique) => technique === showing);
}

export function assistKey(creatureId: CreatureId): string {
  return `assist:${creatureId}`;
}

export function cardRestrictionError(
  state: Pick<GameState, "players" | "creatures">,
  playerId: PlayerId,
  definition: CardDefinition,
): "INVALID_TARGET" | null {
  const player = state.players[playerId];
  if (player === undefined) return "INVALID_TARGET";
  const living = player.creatureIds
    .map((id) => state.creatures[id])
    .filter((creature): creature is CreatureState => creature !== undefined && !creature.defeated);

  if (definition.fighterRestriction !== undefined) {
    if (!living.some((creature) => creature.definitionId === definition.fighterRestriction)) {
      return "INVALID_TARGET";
    }
  }
  if (definition.archetypeRestriction !== undefined) {
    const needed = definition.archetypeRestriction;
    const ok = living.some((creature) => {
      const def = getCreatureDefinition(creature.definitionId);
      return def?.archetype === needed;
    });
    if (!ok) return "INVALID_TARGET";
  }
  return null;
}

export function opponentActiveId(
  state: Pick<GameState, "players" | "playerOrder">,
  playerId: PlayerId,
): CreatureId | null {
  const opponentId = opponentOf(state, playerId);
  return state.players[opponentId]?.activeCreatureId ?? null;
}
