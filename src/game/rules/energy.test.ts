import { describe, expect, it } from "vitest";
import { ECLIPSE } from "../content/cards.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import { advance as advanceRaw } from "../reducer/reduce.js";
import {
  expectOk,
  eventTypes,
  forgeAction,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withEnergy,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";
import {
  energyAfterOvershootPass,
  energyAvailableTo,
  passEnergy,
  spendEnergy,
} from "./energy.js";

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

  it("ends the turn and mirrors the raw overshoot when the marker crosses", () => {
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
    expect(config.energyOnVoluntaryPass).toBe(5);
  });

  it("adds the overshoot-pass bonus when a crossed marker actually passes the turn", () => {
    expect(energyAfterOvershootPass({ holderId: P2, value: 2 }, config)).toEqual({
      holderId: P2,
      value: 4,
    });
    expect(config.energyOnOvershootBonus).toBe(2);
  });

  it("caps overshoot-pass Energy at the size of the track", () => {
    expect(energyAfterOvershootPass({ holderId: P2, value: config.trackMax }, config)).toEqual({
      holderId: P2,
      value: config.trackMax,
    });
    expect(energyAfterOvershootPass({ holderId: P2, value: config.trackMax - 1 }, config)).toEqual({
      holderId: P2,
      value: config.trackMax,
    });
  });
});

describe("energy across a turn transition", () => {
  it("starts the first player on the configured opening energy, not the clean-pass amount", () => {
    const state = newMatch();

    expect(state.energy).toEqual({ holderId: P1, value: config.startingEnergy });
    expect(config.startingEnergy).toBe(3);
    expect(config.startingEnergy).not.toBe(config.energyOnVoluntaryPass);
  });

  it("gives the incoming player the clean-pass amount after a voluntary END_TURN", () => {
    const next = expectOk(advance(newMatch(), { type: "END_TURN", playerId: P1 }));

    expect(next.activePlayerId).toBe(P2);
    expect(next.energy.holderId).toBe(P2);
    expect(next.energy.value).toBe(config.energyOnVoluntaryPass);
    expect(next.turn).toBe(2);
    expect(next.phase).toBe("roll");
  });

  it("gives the incoming player overshoot plus the pass bonus when the marker crosses", () => {
    // 1 Energy, 3-cost Eclipse → overshoot 2 → incoming 4.
    const state = withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]), P1, 1);

    const next = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );

    expect(next.activePlayerId).toBe(P2);
    expect(next.energy).toEqual({ holderId: P2, value: 4 });
    expect(eventTypes(next)).toContain("energy-passed");
    const passed = next.log.map((entry) => entry.event).find((event) => event.type === "energy-passed");
    expect(passed).toMatchObject({ amount: 4, cause: "overshoot", toPlayerId: P2 });
  });

  it("does not add the overshoot bonus until the turn actually passes", () => {
    const state = withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]), P1, 1);

    const opened = expectOk(
      advanceRaw(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );

    expect(opened.activePlayerId).toBe(P1);
    expect(opened.energy).toEqual({ holderId: P2, value: 2 });
    expect(opened.pendingDecision?.type).toBe("reaction-priority");
  });

  it("adds the overshoot bonus on a forge that crosses the marker", () => {
    const state = withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]), P1, 1);
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("test: no die");

    const next = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4])),
    );

    expect(next.activePlayerId).toBe(P2);
    expect(next.energy).toEqual({ holderId: P2, value: 4 });
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
    expect(third.energy.value).toBe(config.energyOnVoluntaryPass);
    expect(third.turn).toBe(3);
  });
});
