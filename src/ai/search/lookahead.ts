import type { GameAction, GameState, PlayerId, RNG } from "@server";
import { evaluate } from "../eval.js";
import { capBranch, orderByPrior, priorScore } from "./order.js";
import { applyQuiet } from "./quiet.js";

const LOOKAHEAD_CAP = 12;

function quietValue(
  state: GameState,
  action: GameAction,
  rootId: PlayerId,
  rng: RNG,
): number {
  const next = applyQuiet(state, action, rng);
  if (next === null) return Number.NEGATIVE_INFINITY;
  return evaluate(next, rootId) + priorScore(state, action) * 0.001;
}

function consider(
  state: GameState,
  actions: readonly GameAction[],
): readonly GameAction[] {
  return capBranch(orderByPrior(state, actions), LOOKAHEAD_CAP);
}

/**
 * One-ply lookahead: play each legal intent, score the resulting quiet
 * position (chains drained) so damage and kills are visible.
 */
export function lookaheadChoose(
  state: GameState,
  actions: readonly GameAction[],
  rootId: PlayerId,
  rng: RNG,
): GameAction | null {
  if (actions.length === 0) return null;
  const pool = consider(state, actions);
  let best = Number.NEGATIVE_INFINITY;
  const tied: GameAction[] = [];
  for (const action of pool) {
    const value = quietValue(state, action, rootId, rng);
    if (value > best) {
      best = value;
      tied.length = 0;
      tied.push(action);
    } else if (value === best) {
      tied.push(action);
    }
  }
  return rng.pick(tied) ?? tied[0] ?? pool[0] ?? null;
}

/** Best-first order by 1-ply quiet eval, for alpha-beta / MCTS expansion. */
export function orderByLookahead(
  state: GameState,
  actions: readonly GameAction[],
  rootId: PlayerId,
  rng: RNG,
): readonly GameAction[] {
  return [...consider(state, actions)]
    .map((action) => ({ action, value: quietValue(state, action, rootId, rng) }))
    .sort((a, b) => b.value - a.value)
    .map((entry) => entry.action);
}
