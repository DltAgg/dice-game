import { advance, type GameAction, type GameState } from "@server";

/** True when the reducer would accept this intent right now. */
export function isLegalIntent(state: GameState, action: GameAction): boolean {
  return advance(state, action).ok;
}

export function legalIntents(
  state: GameState,
  candidates: readonly GameAction[],
): readonly GameAction[] {
  return candidates.filter((action) => isLegalIntent(state, action));
}
