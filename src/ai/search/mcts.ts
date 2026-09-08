import type { GameAction, GameState, PlayerId, RNG } from "@server";
import { actingPlayerId } from "../actor.js";
import { legalActions } from "../candidates/index.js";
import { evaluate, normalizeEval } from "../eval.js";
import { applySim } from "./apply.js";
import type { SearchConfig } from "./config.js";
import { orderByLookahead } from "./lookahead.js";
import { capBranch, orderByPrior } from "./order.js";

const UCB_C = 1.4;

interface MctsNode {
  readonly state: GameState;
  readonly action: GameAction | null;
  readonly parent: MctsNode | null;
  readonly children: MctsNode[];
  untried: GameAction[];
  visits: number;
  total: number;
}

function ucb(parentVisits: number, child: MctsNode): number {
  if (child.visits === 0) return Number.POSITIVE_INFINITY;
  const mean = child.total / child.visits;
  return mean + UCB_C * Math.sqrt(Math.log(parentVisits) / child.visits);
}

function select(node: MctsNode): MctsNode {
  let current = node;
  while (current.untried.length === 0 && current.children.length > 0) {
    let best = current.children[0];
    if (best === undefined) break;
    let bestUcb = Number.NEGATIVE_INFINITY;
    for (const child of current.children) {
      const score = ucb(current.visits, child);
      if (score > bestUcb) {
        bestUcb = score;
        best = child;
      }
    }
    current = best;
  }
  return current;
}

function expand(node: MctsNode, rng: RNG, limit: number): MctsNode {
  const action = node.untried.shift();
  if (action === undefined) return node;
  const next = applySim(node.state, action, rng);
  if (next === null) return node;
  const actor = actingPlayerId(next);
  const untried =
    actor === null
      ? []
      : [...capBranch(orderByPrior(next, legalActions(next, actor)), limit)];
  const child: MctsNode = {
    state: next,
    action,
    parent: node,
    children: [],
    untried,
    visits: 0,
    total: 0,
  };
  node.children.push(child);
  return child;
}

function rollout(
  state: GameState,
  rootId: PlayerId,
  rng: RNG,
  plies: number,
): number {
  let current = state;
  for (let step = 0; step < plies; step += 1) {
    if (current.status !== "in-progress") break;
    const actor = actingPlayerId(current);
    if (actor === null) break;
    const legal = legalActions(current, actor);
    if (legal.length === 0) break;
    const ordered = orderByPrior(current, legal);
    const pick = ordered[0];
    if (pick === undefined) break;
    const next = applySim(current, pick, rng);
    if (next === null) break;
    current = next;
  }
  return normalizeEval(evaluate(current, rootId));
}

function backup(node: MctsNode, reward: number): void {
  let current: MctsNode | null = node;
  while (current !== null) {
    current.visits += 1;
    current.total += reward;
    current = current.parent;
  }
}

/** UCB1 MCTS. Backs up eval from `rootId`. Child with most visits wins. */
export function mctsChoose(
  state: GameState,
  actions: readonly GameAction[],
  rootId: PlayerId,
  rng: RNG,
  config: SearchConfig,
): GameAction | null {
  if (actions.length === 0) return null;
  const rootMoves = capBranch(
    orderByLookahead(state, actions, rootId, rng),
    config.branchLimit,
  );
  const root: MctsNode = {
    state,
    action: null,
    parent: null,
    children: [],
    untried: [...rootMoves],
    visits: 0,
    total: 0,
  };

  const iterations = Math.max(rootMoves.length, config.mctsIterations);
  for (let i = 0; i < iterations; i += 1) {
    const leaf = select(root);
    const grown = leaf.untried.length > 0 ? expand(leaf, rng, config.branchLimit) : leaf;
    const reward = rollout(grown.state, rootId, rng, config.rolloutPlies);
    backup(grown, reward);
  }

  let bestVisits = -1;
  const tied: MctsNode[] = [];
  for (const child of root.children) {
    if (child.visits > bestVisits) {
      bestVisits = child.visits;
      tied.length = 0;
      tied.push(child);
    } else if (child.visits === bestVisits) {
      tied.push(child);
    }
  }
  const pick = rng.pick(tied) ?? tied[0];
  return pick?.action ?? rootMoves[0] ?? null;
}
