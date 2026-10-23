import { describe, expect, it } from "vitest";
import { getCard } from "../content/cards.js";
import type { CardDefinition } from "../model/cards.js";
import { asCardId } from "../model/ids.js";
import { TEST_REQUIRES_GATE } from "../testing/fixtures/index.js";
import { newMatch, P1 } from "../testing/scenario.js";
import { canAffordForge, canAffordPlay, isReactionCard, meterPlayCost, ritualDurationOf } from "./cards.js";

function exampleCard(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    id: asCardId("card-example-afford"),
    name: "Example Afford",
    playCost: { mechanical: 2 },
    type: "modify",
    subtypes: [],
    forge: { faces: 1, target: "own-die" },
    rulesText: "Test.",
    ...overrides,
  };
}

describe("canAffordPlay / canAffordForge", () => {
  it("returns true for a free / empty header cost", () => {
    const state = newMatch();
    const { playCost: _omitted, ...freeBase } = exampleCard();
    void _omitted;
    const free: CardDefinition = freeBase;
    const empty = exampleCard({ playCost: {} });
    expect(canAffordPlay(state, P1, free)).toBe(true);
    expect(canAffordForge(state, P1, free)).toBe(true);
    expect(canAffordPlay(state, P1, empty)).toBe(true);
    expect(canAffordForge(state, P1, empty)).toBe(true);
  });

  it("returns true regardless of printed header cost or forge waiver state", () => {
    const state = {
      ...newMatch(),
      syntheticForgedThisTurn: { [P1]: true as const },
    };
    const card = exampleCard({ playCost: { mechanical: 2 } });
    expect(canAffordPlay(state, P1, card)).toBe(true);
    expect(canAffordForge(state, P1, card)).toBe(true);
  });

  it("returns true for multi-attribute costs and Requires fixtures", () => {
    const card = exampleCard({
      playCost: { arcane: 1, any: 2 },
      forge: { faces: 1, target: "own-die" },
    });
    const tooling = getCard(TEST_REQUIRES_GATE);
    if (tooling === undefined) throw new Error("requires-gate fixture");
    const state = newMatch();
    expect(canAffordPlay(state, P1, card)).toBe(true);
    expect(canAffordForge(state, P1, card)).toBe(true);
    expect(canAffordPlay(state, P1, tooling)).toBe(true);
    expect(canAffordForge(state, P1, tooling)).toBe(true);
  });

  it("returns true for natural forge and repeated synthetics", () => {
    const state = {
      ...newMatch(),
      syntheticForgedThisTurn: { [P1]: true as const },
    };
    const card = exampleCard({
      playCost: { mechanical: 2 },
      forge: { faces: 1, target: "own-die" },
    });
    expect(canAffordForge(state, P1, card)).toBe(true);
    expect(canAffordPlay(state, P1, card)).toBe(true);
    expect(
      canAffordForge({ ...state, syntheticForgedThisTurn: { [P1]: true } }, P1, exampleCard()),
    ).toBe(true);
  });
});

describe("meterPlayCost", () => {
  it("ignores a leftover pile playCost", () => {
    expect(meterPlayCost(exampleCard({ playCost: { mechanical: 2 } }))).toBe(0);
  });

  it("counts Meter spent on every play", () => {
    expect(meterPlayCost(exampleCard({ meterCost: 1, playCost: { arcane: 4 } }))).toBe(1);
  });

  it("counts exceptional Meter when a Tag Modify can only be played that way", () => {
    const callOut = getCard(asCardId("card-call-out"));
    if (callOut === undefined) throw new Error("call out");
    expect(meterPlayCost(callOut)).toBe(2);
    expect(callOut.rulesText).toBe("Tag to a living Reserve Fighter.");
  });

  it("leaves outside-chain Meter off the play cost when the card can be played free", () => {
    const palm = getCard(asCardId("card-open-palm"));
    if (palm === undefined) throw new Error("open palm");
    expect(palm.exceptionalMeterCost).toBe(2);
    expect(meterPlayCost(palm)).toBe(0);
    expect(palm.rulesText).toContain("Spend 2 Meter to play this outside a chain");
  });
});

describe("Vega Drill", () => {
  it("prevents the tagged-out Fighter from Tagging in", () => {
    const drill = getCard(asCardId("card-vega-drill"));
    const tagOut = drill?.addedTechnique?.effects.find((effect) => effect.type === "tag-out");
    expect(tagOut).toMatchObject({ preventTagIn: true });
  });
});

describe("ritualDurationOf", () => {
  const ritualBase: Partial<CardDefinition> = {
    type: "modify",
    ritual: { effects: [] },
  };

  it("returns null for non-rituals", () => {
    expect(ritualDurationOf(exampleCard({ type: "modify" }))).toBeNull();
    expect(ritualDurationOf(exampleCard({ type: "response", subtypes: [] }))).toBeNull();
  });

  it("maps continuous and reaction subtypes to stay/exhaust", () => {
    const continuous = exampleCard({ ...ritualBase, subtypes: ["continuous"] });
    const reaction = exampleCard({ ...ritualBase, subtypes: ["reaction"] });
    expect(ritualDurationOf(continuous)).toBe("continuous");
    expect(ritualDurationOf(reaction)).toBe("continuous");
    expect(isReactionCard(reaction)).toBe(true);
    expect(isReactionCard(continuous)).toBe(false);
  });

  it("maps leftover instant subtype to GY", () => {
    const leftover = exampleCard({ ...ritualBase, subtypes: ["instant"] });
    expect(ritualDurationOf(leftover)).toBe("instant");
    expect(isReactionCard(leftover)).toBe(false);
  });
});
