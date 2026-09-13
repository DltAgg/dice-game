import type { GameAction, GameState, RNG } from "@server";
import { actingPlayerId } from "../actor.js";
import { legalActions } from "../candidates/index.js";
import { applySim } from "./apply.js";
import { orderByPrior } from "./order.js";

const QUIET_PLIES = 8;

/**
 * Apply an intent, then drain reaction windows (both seats Pass) and other
 * forced pendings so eval sees damage / kills instead of an open chain.
 */
export function applyQuiet(
  state: GameState,
  action: GameAction,
  rng: RNG,
): GameState | null {
  let current = applySim(state, action, rng);
  if (current === null) return null;

  for (let step = 0; step < QUIET_PLIES; step += 1) {
    if (current.status !== "in-progress") return current;
    const pending = current.pendingDecision;
    if (pending === null) return current;
    const actor = actingPlayerId(current);
    if (actor === null) return current;

    let follow: GameAction | undefined;
    if (pending.type === "reaction-priority") {
      follow = { type: "PASS_PRIORITY", playerId: actor };
    } else {
      follow = orderByPrior(current, legalActions(current, actor))[0];
    }
    if (follow === undefined) return current;

    const next = applySim(current, follow, rng);
    if (next === null) return current;
    current = next;
  }
  return current;
}
