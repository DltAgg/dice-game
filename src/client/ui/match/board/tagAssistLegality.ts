import {
  assistDeclarationError,
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
  return assistDeclarationError(state, playerId, reserveCreatureId) === null;
}

/**
 * Tag stays on the turn-player `canAct` gate. Assist also opens for the
 * defender who holds reaction priority, when `canAct` is still false.
 */
export function assistControlEnabled(
  state: GameState,
  playerId: PlayerId,
  reserveCreatureId: CreatureId,
  canAct: boolean,
): boolean {
  if (!canDeclareAssist(state, playerId, reserveCreatureId)) return false;
  if (canAct) return true;
  const pending = state.pendingDecision;
  return pending?.type === "reaction-priority" && pending.priorityPlayerId === playerId;
}
