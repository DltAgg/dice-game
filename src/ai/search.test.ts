import { advance, createRng, initialRngState } from "@server";
import { describe, expect, it } from "vitest";
import { actingPlayerId } from "./actor.js";
import { legalActions } from "./candidates/index.js";
import { EVAL_LOSS, EVAL_WIN, evaluate } from "./eval.js";
import { chooseAction } from "./policy.js";
import { PLAYTEST_P1, PLAYTEST_P2, createPlaytestMatch } from "./setup.js";
import { runPlaytestMatch } from "./driver.js";

describe("position eval", () => {
  it("is zero-sum between the two seats", () => {
    const state = createPlaytestMatch(1, "tempo", "control");
    expect(evaluate(state, PLAYTEST_P1) + evaluate(state, PLAYTEST_P2)).toBe(0);
  });

  it("scores in-progress positions without a terminal winner", { timeout: 120_000 }, () => {
    const report = runPlaytestMatch({
      seed: 7,
      p1LoadoutId: "tempo",
      p2LoadoutId: "control",
      strength: "fast",
      maxTurns: 40,
    });
    if (report.status === "finished") {
      expect(report.winner).not.toBeNull();
      return;
    }
    expect(report.status).toBe("in-progress");
    expect(report.winner).toBeNull();
    expect(evaluate(report.state, PLAYTEST_P1)).not.toBe(EVAL_WIN);
    expect(evaluate(report.state, PLAYTEST_P1)).not.toBe(EVAL_LOSS);
  });
});

describe("search policy", () => {
  it("1-ply lookahead prefers attacking over ending the turn when both are legal", () => {
    const rng = createRng(initialRngState(99));
    let state = createPlaytestMatch(99, "tempo", "control");
    for (let step = 0; step < 40; step += 1) {
      if (state.status !== "in-progress") break;
      const actor = actingPlayerId(state);
      if (actor === null) break;
      const legal = legalActions(state, actor);
      const hasAttack = legal.some((action) => action.type === "ATTACK");
      const hasEnd = legal.some((action) => action.type === "END_TURN");
      if (hasAttack && hasEnd && state.pendingDecision === null) {
        const attack = legal.filter((action) => action.type === "ATTACK");
        const end = legal.filter((action) => action.type === "END_TURN");
        const chosen = chooseAction(state, [...attack, ...end], rng, { strength: "fast" });
        expect(chosen?.type).toBe("ATTACK");
        return;
      }
      const chosen = chooseAction(state, legal, rng, { strength: "fast" });
      if (chosen === null) break;
      const result = advance(state, chosen);
      if (!result.ok) break;
      state = result.state;
    }
    expect.fail("never saw a position with both ATTACK and END_TURN");
  });

  it("does not mutate the input state", () => {
    const rng = createRng(initialRngState(3));
    const state = createPlaytestMatch(3, "tempo", "control");
    const before = JSON.stringify(state);
    const legal = legalActions(state, PLAYTEST_P1);
    chooseAction(state, legal, rng, { strength: "fast" });
    expect(JSON.stringify(state)).toBe(before);
  });

  it("minimax/MCTS pick a legal intent on an opening roll", () => {
    const rng = createRng(initialRngState(5));
    const state = createPlaytestMatch(5, "tempo", "control");
    const legal = legalActions(state, PLAYTEST_P1);
    const chosen = chooseAction(state, legal, rng, { strength: "standard" });
    expect(chosen?.type).toBe("ROLL_DICE");
  });
});
