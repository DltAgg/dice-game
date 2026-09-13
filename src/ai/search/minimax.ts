import type { GameAction, GameState, PlayerId, RNG } from "@server";
import { actingPlayerId } from "../actor.js";
import { legalActions } from "../candidates/index.js";
import { EVAL_LOSS, EVAL_WIN, evaluate } from "../eval.js";
import { applySim } from "./apply.js";
import type { SearchConfig } from "./config.js";
import { orderByLookahead } from "./lookahead.js";
import { capBranch } from "./order.js";

function childrenOf(state: GameState, rng: RNG, limit: number): readonly GameAction[] {
  const actor = actingPlayerId(state);
  if (actor === null) return [];
  const legal = legalActions(state, actor);
  return capBranch(orderByLookahead(state, legal, actor, rng), limit);
}

function minimaxValue(
  state: GameState,
  rootId: PlayerId,
  depth: number,
  alpha: number,
  beta: number,
  rng: RNG,
  limit: number,
): number {
  if (state.status !== "in-progress") return evaluate(state, rootId);
  const mustAct = state.pendingDecision !== null;
  if (depth <= 0 && !mustAct) return evaluate(state, rootId);

  const actor = actingPlayerId(state);
  if (actor === null) return evaluate(state, rootId);
  const moves = childrenOf(state, rng, limit);
  if (moves.length === 0) return evaluate(state, rootId);

  const maximize = actor === rootId;
  if (maximize) {
    let best = EVAL_LOSS * 2;
    let lo = alpha;
    for (const action of moves) {
      const next = applySim(state, action, rng);
      if (next === null) continue;
      const value = minimaxValue(next, rootId, depth - 1, lo, beta, rng, limit);
      if (value > best) best = value;
      if (value > lo) lo = value;
      if (beta <= lo) break;
    }
    return best;
  }

  let best = EVAL_WIN * 2;
  let hi = beta;
  for (const action of moves) {
    const next = applySim(state, action, rng);
    if (next === null) continue;
    const value = minimaxValue(next, rootId, depth - 1, alpha, hi, rng, limit);
    if (value < best) best = value;
    if (value < hi) hi = value;
    if (hi <= alpha) break;
  }
  return best;
}

/** Alpha-beta from `rootId`'s point of view. */
export function minimaxChoose(
  state: GameState,
  actions: readonly GameAction[],
  rootId: PlayerId,
  rng: RNG,
  config: SearchConfig,
): GameAction | null {
  if (actions.length === 0) return null;
  const ordered = orderByLookahead(state, actions, rootId, rng);
  const rootMoves = capBranch(ordered, config.branchLimit);
  const depth = Math.max(0, config.minimaxDepth - 1);
  let bestValue = Number.NEGATIVE_INFINITY;
  const tied: GameAction[] = [];
  let alpha = EVAL_LOSS * 2;
  for (const action of rootMoves) {
    const next = applySim(state, action, rng);
    if (next === null) continue;
    const value = minimaxValue(
      next,
      rootId,
      depth,
      alpha,
      EVAL_WIN * 2,
      rng,
      config.branchLimit,
    );
    if (value > bestValue) {
      bestValue = value;
      tied.length = 0;
      tied.push(action);
    } else if (value === bestValue) {
      tied.push(action);
    }
    if (value > alpha) alpha = value;
  }
  return rng.pick(tied) ?? tied[0] ?? ordered[0] ?? null;
}
