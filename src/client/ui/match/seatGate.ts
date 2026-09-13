import type { GameState, PlayerId } from "@server";

/**
 * Seat that may Pass / respond while a reaction window is open.
 * Reads `pendingDecision` — does not reimplement chain rules.
 */
export function reactionPriorityOf(state: GameState): PlayerId | null {
  const pending = state.pendingDecision;
  return pending?.type === "reaction-priority" ? pending.priorityPlayerId : null;
}

/**
 * Who the UI should offer the pending prompt to.
 *
 * `reaction-priority` stores that seat as `priorityPlayerId` (it has no
 * `controllerId`). Treat a missing controller as "no chooser" only when there
 * is no pending decision — never as "everyone may act" during a chain window.
 */
export function pendingChooserId(state: GameState): PlayerId | null {
  const pending = state.pendingDecision;
  if (pending === null) return null;
  if (pending.type === "reaction-priority") return pending.priorityPlayerId;
  if ("controllerId" in pending) return pending.controllerId;
  return null;
}

/** Turn player, reaction-priority holder, or pending choice controller. */
export function actingPlayerIdOf(state: GameState): PlayerId {
  return pendingChooserId(state) ?? state.activePlayerId;
}

/**
 * Who may click act/pass.
 *
 * `localPlayerId === null`: hotseat (`!isOnline` → both seats) or online
 * spectator (`isOnline` → none). Bound seat (online or local vs-AI): only that
 * seat, and only while they are the acting player.
 */
export function localSeatCanAct(
  isOnline: boolean,
  localPlayerId: PlayerId | null,
  state: GameState,
): boolean {
  if (localPlayerId === null) return !isOnline;
  return localPlayerId === actingPlayerIdOf(state);
}

/**
 * Who should complete `pendingDecision`.
 * No pending → nothing to choose (returns true for a bound seat, matching
 * prior online behavior). Reaction window → priority seat only.
 */
export function localSeatIsPendingChooser(
  isOnline: boolean,
  localPlayerId: PlayerId | null,
  state: GameState,
): boolean {
  if (localPlayerId === null) return !isOnline;
  const chooser = pendingChooserId(state);
  if (chooser === null) return true;
  return localPlayerId === chooser;
}

/** Stamp intents with the bound seat; hotseat (`localPlayerId` null) keeps the action's playerId. */
export function seatedAction<T extends { readonly playerId: PlayerId }>(
  localPlayerId: PlayerId | null,
  action: T,
): T {
  if (localPlayerId === null) return action;
  return { ...action, playerId: localPlayerId };
}
