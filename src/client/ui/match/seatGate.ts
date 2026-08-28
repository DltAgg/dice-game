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

/** Online: only the bound seat that currently may take a turn/reaction action. */
export function localSeatCanAct(
  isOnline: boolean,
  localPlayerId: PlayerId | null,
  state: GameState,
): boolean {
  if (!isOnline) return true;
  if (localPlayerId === null) return false;
  return localPlayerId === actingPlayerIdOf(state);
}

/**
 * Online: only the bound seat that should complete `pendingDecision`.
 * No pending → nothing to choose. Reaction window → priority seat only.
 */
export function localSeatIsPendingChooser(
  isOnline: boolean,
  localPlayerId: PlayerId | null,
  state: GameState,
): boolean {
  if (!isOnline) return true;
  const chooser = pendingChooserId(state);
  if (chooser === null) return true;
  if (localPlayerId === null) return false;
  return localPlayerId === chooser;
}

/** Stamp intents with the bound online seat; hotseat keeps the action's playerId. */
export function seatedAction<T extends { readonly playerId: PlayerId }>(
  isOnline: boolean,
  localPlayerId: PlayerId | null,
  action: T,
): T {
  if (!isOnline || localPlayerId === null) return action;
  return { ...action, playerId: localPlayerId };
}
