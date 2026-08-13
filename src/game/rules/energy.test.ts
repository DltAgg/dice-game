import { describe, expect, it } from "vitest";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import { expectOk, newMatch, P1, P2, advanceResolvingChain as advance } from "../testing/scenario.js";
import { energyAvailableTo, passEnergy, spendEnergy } from "./energy.js";

const config = DEFAULT_RULES_CONFIG.energy;

describe("the shared energy track", () => {
  it("leaves the marker with the spender when it stays on their side", () => {
    const outcome = spendEnergy({ holderId: P1, value: 5 }, 3, P2, config);

    expect(outcome.track).toEqual({ holderId: P1, value: 2 });
    expect(outcome.turnEnds).toBe(false);
  });

  it("does not end the turn when the marker lands exactly on zero", () => {
    const outcome = spendEnergy({ holderId: P1, value: 3 }, 3, P2, config);

    expect(outcome.track).toEqual({ holderId: P1, value: 0 });
    expect(outcome.turnEnds).toBe(false);
  });

  it("ends the turn and mirrors the overshoot when the marker crosses", () => {
    const outcome = spendEnergy({ holderId: P1, value: 3 }, 5, P2, config);

    expect(outcome.turnEnds).toBe(true);
    expect(outcome.track).toEqual({ holderId: P2, value: 2 });
    expect(outcome.passedToOpponent).toBe(2);
  });

  it("caps the overshoot at the size of the track", () => {
    const outcome = spendEnergy({ holderId: P1, value: 0 }, 40, P2, config);

    expect(outcome.track).toEqual({ holderId: P2, value: config.trackMax });
  });

  it("reports zero energy to the player who does not hold the marker", () => {
    const track = { holderId: P1, value: 4 };

    expect(energyAvailableTo(track, P1)).toBe(4);
    expect(energyAvailableTo(track, P2)).toBe(0);
  });

  it("hands the configured amount over on a voluntary pass", () => {
    expect(passEnergy(P2, config)).toEqual({
      holderId: P2,
      value: config.energyOnVoluntaryPass,
    });
  });
});

describe("energy across a turn transition", () => {
  it("starts the first player on the configured opening energy", () => {
    const state = newMatch();

    expect(state.energy).toEqual({ holderId: P1, value: config.startingEnergy });
  });

  it("moves the marker to the other player when the turn ends", () => {
    const next = expectOk(advance(newMatch(), { type: "END_TURN", playerId: P1 }));

    expect(next.activePlayerId).toBe(P2);
    expect(next.energy.holderId).toBe(P2);
    expect(next.energy.value).toBe(config.energyOnVoluntaryPass);
    expect(next.turn).toBe(2);
    expect(next.phase).toBe("roll");
  });

  it("gives control back on the following turn", () => {
    const third = expectOk(
      advance(
        expectOk(advance(newMatch(), { type: "END_TURN", playerId: P1 })),
        { type: "END_TURN", playerId: P2 },
      ),
    );

    expect(third.activePlayerId).toBe(P1);
    expect(third.energy.holderId).toBe(P1);
    expect(third.turn).toBe(3);
  });
});
