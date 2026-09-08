import type { GameAction, GameState } from "@server";

/** Move-ordering prior only. Search/eval decide the real pick. */
export function priorScore(state: GameState, action: GameAction): number {
  if (state.pendingDecision?.type === "reaction-priority") {
    if (action.type === "PASS_PRIORITY") return 40;
    if (action.type === "PLAY_CARD" || action.type === "ACTIVATE_RITUAL") return 80;
  }
  if (
    action.type === "RESOLVE_OPTIONAL_REROLL" ||
    action.type === "RESOLVE_OPTIONAL_OVERCHARGE" ||
    action.type === "RESOLVE_OPTIONAL_BONUS_ATTACK"
  ) {
    return action.accept === true ? 60 : 50;
  }
  switch (action.type) {
    case "ROLL_DICE":
      return 1000;
    case "ATTACK":
      return 800;
    case "ABSORB_SYMBOL":
      return 700;
    case "ACTIVATE_RITUAL":
      return 500;
    case "PLAY_CARD":
      return 400;
    case "FORGE_CARD":
      return 300;
    case "OVERCHARGE_CARD":
      return 250;
    case "ACTIVATE_FACE":
      return 200;
    case "PASS_PRIORITY":
      return 150;
    case "END_TURN":
      return 10;
    default:
      return 900;
  }
}

export function orderByPrior(
  state: GameState,
  actions: readonly GameAction[],
): readonly GameAction[] {
  return [...actions].sort((a, b) => priorScore(state, b) - priorScore(state, a));
}

export function capBranch(
  actions: readonly GameAction[],
  limit: number,
): readonly GameAction[] {
  if (actions.length <= limit) return actions;
  const kept: GameAction[] = actions.slice(0, limit);
  const mustKeep = actions.filter(
    (action) => action.type === "END_TURN" || action.type === "PASS_PRIORITY",
  );
  for (const action of mustKeep) {
    if (!kept.some((entry) => sameIntent(entry, action))) kept.push(action);
  }
  return kept;
}

export function sameIntent(a: GameAction, b: GameAction): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
