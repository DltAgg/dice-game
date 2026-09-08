import type { GameAction, GameState, PlayerId } from "@server";
import { pendingCandidates } from "./pending.js";
import { reactionWindowCandidates, turnCandidates } from "./actions.js";
import { legalIntents } from "../probe.js";

export function proposeIntents(state: GameState, playerId: PlayerId): readonly GameAction[] {
  const pending = state.pendingDecision;
  if (pending === null) return turnCandidates(state, playerId);
  if (pending.type === "reaction-priority") {
    return reactionWindowCandidates(state, playerId);
  }
  return pendingCandidates(state, playerId);
}

export function legalActions(state: GameState, playerId: PlayerId): readonly GameAction[] {
  return legalIntents(state, proposeIntents(state, playerId));
}
