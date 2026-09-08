import type { GameState, PlayerId } from "@server";

/**
 * Who must emit the next intent. Pending decisions bind their controller even
 * when that seat is not `activePlayerId`. Reaction windows bind priority.
 */
export function actingPlayerId(state: GameState): PlayerId | null {
  if (state.status !== "in-progress") return null;
  const pending = state.pendingDecision;
  if (pending !== null) {
    if (pending.type === "reaction-priority") return pending.priorityPlayerId;
    return pending.controllerId;
  }
  return state.activePlayerId;
}
