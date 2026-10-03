import { describe, expect, it } from "vitest";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import { livingCreaturesOf } from "../rules/creatures.js";
import { autoplay, NEVER_ATTACK } from "../testing/autoplay.js";
import { newMatchWithDecks, P1, P2 } from "../testing/scenario.js";

/** The smoke window is longer than a 42-card deck. Deck-out is tested on its own. */
function enduringMatch(seed: number) {
  return newMatchWithDecks({
    seed,
    config: { ...DEFAULT_RULES_CONFIG, deckOutEnabled: false },
  });
}

const SEEDS = [1, 2, 3, 5, 8, 13, 21, 37, 55, 89];
const AUTOPLAY_MAX_TURNS = 80;

describe("a full match through the reducer alone", () => {
  it.each(SEEDS)("seed %i runs without throwing for %i turns", (seed) => {
    const { state, turnsPlayed } = autoplay(enduringMatch(seed), {
      maxTurns: AUTOPLAY_MAX_TURNS,
    });

    expect(state.status).toBe("in-progress");
    expect(turnsPlayed).toBe(AUTOPLAY_MAX_TURNS);
    expect(state.winner).toBeNull();
  });

  it("passes the turn back and forth, alternating the active player", () => {
    const { states } = autoplay(enduringMatch(3), { maxTurns: 6 });
    const actives = states.slice(0, 6).map((state) => state.activePlayerId);

    expect(actives).toEqual([P1, P2, P1, P2, P1, P2]);
  });

  it("can roll and act on the opening turn", () => {
    for (const seed of SEEDS.slice(0, 3)) {
      const { states } = autoplay(enduringMatch(seed), { maxTurns: 2 });
      const afterFirstTurn = states[1];
      if (afterFirstTurn === undefined) continue;
      expect(afterFirstTurn.turn).toBeGreaterThanOrEqual(1);
    }
  });

  it("records a coherent event log through combat", () => {
    const { state } = autoplay(enduringMatch(21), { maxTurns: AUTOPLAY_MAX_TURNS });
    const types = state.log.map((entry) => entry.event.type);

    expect(types[0]).toBe("match-started");
    expect(types).toContain("die-rolled");
    expect(types).toContain("symbol-generated");
    expect(types).toContain("attack-declared");
    expect(types).toContain("damage-dealt");
    expect(types).toContain("turn-ended");
    expect(types).not.toContain("match-finished");
  });

  it("still declares attacks after absorbing symbols", () => {
    const { state } = autoplay(enduringMatch(5), { maxTurns: AUTOPLAY_MAX_TURNS });
    const types = state.log.map((entry) => entry.event.type);
    expect(types).toContain("symbol-absorbed");
    expect(types).toContain("attack-declared");
    expect(livingCreaturesOf(state, P1).length + livingCreaturesOf(state, P2).length).toBeGreaterThan(
      0,
    );
  });

  it("never resolves for a player who refuses to attack", () => {
    const { state, turnsPlayed } = autoplay(enduringMatch(5), {
      policy: NEVER_ATTACK,
      maxTurns: 40,
    });

    expect(state.status).toBe("in-progress");
    expect(turnsPlayed).toBe(40);
    expect(state.log.map((entry) => entry.event.type)).not.toContain("attack-declared");
  });

  it("accumulates turns over a short autoplay window", () => {
    const lengths = SEEDS.map(
      (seed) => autoplay(enduringMatch(seed), { maxTurns: AUTOPLAY_MAX_TURNS }).turnsPlayed,
    );
    const average = lengths.reduce((total, value) => total + value, 0) / lengths.length;

    expect(average).toBe(AUTOPLAY_MAX_TURNS);
  });
});
