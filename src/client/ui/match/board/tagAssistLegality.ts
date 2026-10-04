import {
  assistKey,
  getCreatureDefinition,
  isLivingReserve,
  showingTechnique,
  tagWindow,
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

/**
 * Hotseat may press either row. A bound seat may press only its own row.
 * This is not `localSeatCanAct`: Tag stays available when that gate is
 * tracking a different actor.
 */
export function seatMayPressTag(
  isOnline: boolean,
  localPlayerId: PlayerId | null,
  rowPlayerId: PlayerId,
): boolean {
  if (localPlayerId === null) return !isOnline;
  return localPlayerId === rowPlayerId;
}

export function canDeclareTag(
  state: GameState,
  playerId: PlayerId,
  reserveCreatureId: CreatureId,
): boolean {
  if (tagWindow(state, playerId) === null) return false;
  const player = state.players[playerId];
  if (player === undefined) return false;
  const active = state.creatures[player.activeCreatureId];
  if (active === undefined || active.defeated) return false;
  return isLivingReserve(state, player, reserveCreatureId);
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
