import { advance, initialRngState, type GameAction, type GameState, type RNG } from "@server";

/**
 * Apply an intent in search. `ROLL_DICE` forks a sampled RNG so search cannot
 * peek at the match's real next roll.
 */
export function applySim(
  state: GameState,
  action: GameAction,
  rng: RNG,
): GameState | null {
  const input =
    action.type === "ROLL_DICE"
      ? { ...state, rng: initialRngState(rng.integer(1, 0x7fff_fffe)) }
      : state;
  const result = advance(input, action);
  return result.ok ? result.state : null;
}
