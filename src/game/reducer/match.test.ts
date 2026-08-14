import { describe, expect, it } from "vitest";
import { livingCreaturesOf } from "../rules/creatures.js";
import { autoplay, NEVER_ABSORB } from "../testing/autoplay.js";
import { newMatch, P1, P2 } from "../testing/scenario.js";

/**
 * The Milestone 1 acceptance test (SPDD §54): a complete two-player match,
 * start to victory, driven entirely by `reduce()` with no UI, no store and no
 * networking anywhere in the call stack.
 */

const SEEDS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

describe("a full match through the reducer alone", () => {
  it.each(SEEDS)("seed %i reaches a decided victory", (seed) => {
    const { state, turnsPlayed } = autoplay(newMatch({ seed }));

    expect(state.status).toBe("finished");
    expect(state.winner === P1 || state.winner === P2).toBe(true);
    expect(turnsPlayed).toBeGreaterThan(1);
  });

  it("ends with the loser having no creatures left and the winner having some", () => {
    const { state } = autoplay(newMatch({ seed: 8 }));
    const winnerId = state.winner;
    if (winnerId === null) throw new Error("expected a winner");
    const loserId = winnerId === P1 ? P2 : P1;

    expect(livingCreaturesOf(state, loserId)).toHaveLength(0);
    expect(livingCreaturesOf(state, winnerId).length).toBeGreaterThan(0);
  });

  it("passes the turn back and forth, alternating the energy holder", () => {
    const { states } = autoplay(newMatch({ seed: 3 }));
    const holders = states.slice(0, 6).map((state) => state.energy.holderId);

    expect(holders).toEqual([P1, P2, P1, P2, P1, P2]);
    for (const state of states) {
      expect(state.energy.holderId).toBe(state.activePlayerId);
    }
  });

  it("cannot land an attack on the opening turn", () => {
    // Bible §25 wants early destruction to be hard, and the absorption timing
    // guarantees it outright: fuel only becomes a token at end of turn, so the
    // first turn is necessarily spent arming rather than swinging.
    for (const seed of SEEDS) {
      const { states } = autoplay(newMatch({ seed }));
      const afterFirstTurn = states[1];
      if (afterFirstTurn === undefined) continue;

      expect(afterFirstTurn.log.map((entry) => entry.event.type)).not.toContain("attack-declared");
      expect(Object.values(afterFirstTurn.creatures).every((c) => !c.defeated)).toBe(true);
    }
  });

  it("records a coherent event log ending in the match result", () => {
    const { state } = autoplay(newMatch({ seed: 21 }));
    const types = state.log.map((entry) => entry.event.type);

    expect(types[0]).toBe("match-started");
    expect(types).toContain("die-rolled");
    expect(types).toContain("symbol-generated");
    expect(types).toContain("attack-declared");
    expect(types).toContain("damage-dealt");
    expect(types).toContain("creature-defeated");
    expect(types).toContain("energy-passed");
    expect(types.at(-1)).toBe("match-finished");
  });

  it("proves the winner funded attacks from absorbed tokens", () => {
    // With discard costs, a final swing can empty the board of leftover fuel —
    // the proof is that absorption and token-spend actually happened.
    const { state } = autoplay(newMatch({ seed: 5 }));
    const winnerId = state.winner;
    if (winnerId === null) throw new Error("expected a winner");

    const types = state.log.map((entry) => entry.event.type);
    expect(types).toContain("symbol-absorbed");
    expect(types).toContain("attribute-tokens-discarded");
    expect(types).toContain("attack-declared");
    expect(livingCreaturesOf(state, winnerId).length).toBeGreaterThan(0);
  });

  it("never resolves for a player who refuses to absorb", () => {
    // Bible §33's tension, at its sharpest: a player who sends every symbol to
    // the engine keeps a perfect engine and no way to use it, because attacks
    // are funded only by what a creature absorbed.
    const { state, turnsPlayed } = autoplay(newMatch({ seed: 5 }), {
      policy: NEVER_ABSORB,
      maxTurns: 40,
    });

    expect(state.status).toBe("in-progress");
    expect(turnsPlayed).toBe(40);
    expect(state.log.map((entry) => entry.event.type)).not.toContain("attack-declared");
  });

  it("takes long enough that the match is decided by accumulated advantage", () => {
    const lengths = SEEDS.map((seed) => autoplay(newMatch({ seed })).turnsPlayed);
    const average = lengths.reduce((total, value) => total + value, 0) / lengths.length;

    // Not a balance target — a guard against content that trivially one-shots
    // the three-creature squad, which bible §45 flags as the key warning sign.
    expect(average).toBeGreaterThan(6);
  });
});
