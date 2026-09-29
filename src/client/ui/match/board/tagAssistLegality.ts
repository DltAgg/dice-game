import {
  assistKey,
  getCreatureDefinition,
  isLivingReserve,
  showingTechnique,
  type CreatureId,
  type GameState,
  type PlayerId,
} from "@server";

export function isTagSkirmishMatch(state: Pick<GameState, "config">): boolean {
  return state.config.dicePerPlayer >= 3;
}

function tagAssistPhaseOk(state: GameState): boolean {
  return (
    state.status === "in-progress" &&
    state.phase === "actions" &&
    state.pendingDecision === null
  );
}

export function canDeclareTag(
  state: GameState,
  playerId: PlayerId,
  reserveCreatureId: CreatureId,
): boolean {
  if (!tagAssistPhaseOk(state)) return false;
  if (state.activePlayerId !== playerId) return false;
  const player = state.players[playerId];
  if (player === undefined) return false;
  if (!isLivingReserve(state, player, reserveCreatureId)) return false;
  const showingTag = showingTechnique(state, player.activeCreatureId) === "tag";
  if (showingTag) return true;
  return player.meter >= state.config.tagCancelMeterCost;
}

export function canDeclareAssist(
  state: GameState,
  playerId: PlayerId,
  reserveCreatureId: CreatureId,
): boolean {
  if (!tagAssistPhaseOk(state)) return false;
  if (state.activePlayerId !== playerId) return false;
  const player = state.players[playerId];
  if (player === undefined) return false;
  if (!isLivingReserve(state, player, reserveCreatureId)) return false;

  const creature = state.creatures[reserveCreatureId];
  if (creature === undefined) return false;
  const definition = getCreatureDefinition(creature.definitionId);
  const effects = definition?.assistEffects ?? [];
  if (effects.length === 0) return false;
  if (player.spentOncePerTurnKeys.includes(assistKey(reserveCreatureId))) return false;

  const showingAssist = showingTechnique(state, reserveCreatureId) === "assist";
  if (showingAssist) return true;
  return player.meter >= state.config.assistMeterCost;
}
