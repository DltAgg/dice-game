import {
  actingPlayerId,
  chooseAction,
  legalActions,
  type AiStrength,
} from "@ai";
import {
  createRng,
  initialRngState,
  type GameAction,
  type GameState,
  type PlayerId,
  type RngState,
} from "@server";

/** Same XOR as the headless driver so policy entropy stays off `GameState.rng`. */
export const AI_POLICY_SEED_XOR = 0x9e37_79b9;

/** Same idea as the headless driver's per-turn action cap. */
export const AI_FILL_STEP_CAP = 80;

export type AiFillStep = (
  prev: GameState,
  action: GameAction,
) => { readonly ok: true; readonly state: GameState } | { readonly ok: false; readonly state: GameState };

export function policyRngStateFromMatchSeed(seed: number): RngState {
  return initialRngState(seed ^ AI_POLICY_SEED_XOR);
}

export function shouldFillAiSeat(args: {
  readonly mode: "local" | "host" | "client";
  readonly aiPlayerId: PlayerId | null;
  readonly localPlayerId: PlayerId | null;
}): boolean {
  return args.mode === "local" && args.aiPlayerId !== null && args.localPlayerId !== null;
}

/**
 * While the bound AI seat must act, emit `chooseAction` intents through `step`
 * (usually `dispatchHotseat`). Stops when the human must act, the match ends,
 * the policy returns nothing, a step is refused, or the safety cap is hit.
 */
export function fillAiSeat(args: {
  readonly state: GameState;
  readonly aiPlayerId: PlayerId;
  readonly rngState: RngState;
  readonly strength: AiStrength;
  readonly step: AiFillStep;
  readonly maxSteps?: number;
}): { readonly state: GameState; readonly rngState: RngState; readonly steps: number } {
  const maxSteps = args.maxSteps ?? AI_FILL_STEP_CAP;
  const rng = createRng(args.rngState);
  let current = args.state;
  let steps = 0;
  while (steps < maxSteps) {
    if (current.status !== "in-progress") break;
    const actor = actingPlayerId(current);
    if (actor !== args.aiPlayerId) break;
    const legal = legalActions(current, actor);
    const chosen = chooseAction(current, legal, rng, { strength: args.strength });
    if (chosen === null) break;
    const result = args.step(current, chosen);
    if (!result.ok) break;
    current = result.state;
    steps += 1;
  }
  return { state: current, rngState: rng.snapshot(), steps };
}
