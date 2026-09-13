import type { GameAction, GameState, RNG } from "@server";
import { lookaheadChoose } from "./search/lookahead.js";
import { searchConfig, type AiStrength } from "./search/config.js";
import { mctsChoose } from "./search/mcts.js";
import { minimaxChoose } from "./search/minimax.js";

export type { AiStrength };

export interface ChooseOptions {
  readonly strength?: AiStrength;
}

/**
 * Hybrid policy for a human-playable seat:
 * - `fast`: 1-ply eval lookahead
 * - small / pending / reaction trees: alpha-beta minimax
 * - wide action windows: UCB1 MCTS with greedy rollouts
 */
export function chooseAction(
  state: GameState,
  actions: readonly GameAction[],
  rng: RNG,
  options: ChooseOptions = {},
): GameAction | null {
  if (actions.length === 0) return null;
  const first = actions[0];
  if (first === undefined) return null;
  if (actions.length === 1) return first;

  const rootId = first.playerId;
  const config = searchConfig(options.strength ?? "standard");

  if (config.lookaheadOnly) {
    return lookaheadChoose(state, actions, rootId, rng);
  }

  const pending = state.pendingDecision !== null;
  if (pending || actions.length <= config.minimaxIfAtMost) {
    return minimaxChoose(state, actions, rootId, rng, config);
  }
  return mctsChoose(state, actions, rootId, rng, config);
}
