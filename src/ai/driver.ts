import { advance, createRng, initialRngState, type GameAction } from "@server";
import { actingPlayerId } from "./actor.js";
import { legalActions } from "./candidates/index.js";
import { chooseAction } from "./policy.js";
import { createPlaytestMatch } from "./setup.js";
import type { PlaytestOptions, PlaytestReport } from "./types.js";

const DEFAULT_MAX_TURNS = 400;
const DEFAULT_MAX_ACTIONS_PER_TURN = 80;

function apply(state: PlaytestReport["state"], action: GameAction): PlaytestReport["state"] {
  const result = advance(state, action);
  if (!result.ok) {
    throw new Error(`playtest AI: chosen intent refused (${result.error}) on ${action.type}`);
  }
  return result.state;
}

export function runPlaytestMatch(options: PlaytestOptions): PlaytestReport {
  const maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;
  const maxActionsPerTurn = options.maxActionsPerTurn ?? DEFAULT_MAX_ACTIONS_PER_TURN;
  const rng = createRng(initialRngState(options.seed ^ 0x9e37_79b9));

  let state = createPlaytestMatch(options.seed, options.p1LoadoutId, options.p2LoadoutId);
  const actions: GameAction[] = [];
  let turnsPlayed = 0;
  let actionsThisTurn = 0;
  let turnAtLoop = state.turn;

  while (state.status === "in-progress") {
    if (state.turn !== turnAtLoop) {
      turnAtLoop = state.turn;
      actionsThisTurn = 0;
      turnsPlayed += 1;
      if (turnsPlayed >= maxTurns) {
        return report(options, state, actions, turnsPlayed, "max-turns", null);
      }
    }

    const actor = actingPlayerId(state);
    if (actor === null) {
      return report(options, state, actions, turnsPlayed, "stall", "no acting player");
    }

    const legal = legalActions(state, actor);
    const chosen = chooseAction(state, legal, rng, {
      strength: options.strength ?? "fast",
    });
    if (chosen === null) {
      return report(
        options,
        state,
        actions,
        turnsPlayed,
        "stall",
        `no legal intent for ${actor} (pending=${state.pendingDecision?.type ?? "none"} phase=${state.phase})`,
      );
    }

    if (actionsThisTurn >= maxActionsPerTurn && chosen.type !== "END_TURN") {
      const end = legal.find((action) => action.type === "END_TURN");
      if (end === undefined) {
        return report(
          options,
          state,
          actions,
          turnsPlayed,
          "stall",
          `turn action cap with no END_TURN for ${actor}`,
        );
      }
      state = apply(state, end);
      actions.push(end);
      actionsThisTurn += 1;
      continue;
    }

    state = apply(state, chosen);
    actions.push(chosen);
    actionsThisTurn += 1;
  }

  return report(options, state, actions, turnsPlayed, "finished", null);
}

function report(
  options: PlaytestOptions,
  state: PlaytestReport["state"],
  actions: readonly GameAction[],
  turnsPlayed: number,
  stopReason: PlaytestReport["stopReason"],
  stallDetail: string | null,
): PlaytestReport {
  return {
    seed: options.seed,
    p1LoadoutId: options.p1LoadoutId,
    p2LoadoutId: options.p2LoadoutId,
    status: state.status,
    winner: state.winner,
    turnsPlayed,
    actionsPlayed: actions.length,
    stopReason,
    stallDetail,
    actions,
    state,
  };
}
