import { getCreatureDefinition } from "../content/creatures.js";
import type { CreatureDefinition, CreatureState } from "../model/creatures.js";
import type { CreatureId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";

export const creatureDefinitionOf = (creature: CreatureState): CreatureDefinition | undefined =>
  getCreatureDefinition(creature.definitionId);

export const maxLife = (creature: CreatureState): number =>
  creatureDefinitionOf(creature)?.life ?? 0;

export const currentLife = (creature: CreatureState): number =>
  Math.max(0, maxLife(creature) - creature.damage);

/**
 * Defeat is a rule, not a UI condition (SPDD §32). Components ask this rather
 * than comparing numbers themselves.
 */
export const isCreatureDefeated = (creature: CreatureState): boolean =>
  creature.damage >= maxLife(creature);

export const creaturesOf = (state: GameState, playerId: PlayerId): readonly CreatureState[] => {
  const player = state.players[playerId];
  if (player === undefined) return [];
  return player.creatureIds.flatMap((id) => {
    const creature = state.creatures[id];
    return creature === undefined ? [] : [creature];
  });
};

export const livingCreaturesOf = (state: GameState, playerId: PlayerId): readonly CreatureState[] =>
  creaturesOf(state, playerId).filter((creature) => !creature.defeated);

export const findCreature = (state: GameState, id: CreatureId): CreatureState | undefined =>
  state.creatures[id];

export const opponentOf = (
  state: { readonly playerOrder: readonly [PlayerId, PlayerId] },
  playerId: PlayerId,
): PlayerId => {
  const [first, second] = state.playerOrder;
  return playerId === first ? second : first;
};
