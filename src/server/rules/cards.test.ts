import { describe, expect, it } from "vitest";
import { getCard } from "../content/cards.js";
import type { CardDefinition } from "../model/cards.js";
import { asCardId } from "../model/ids.js";
import { TEST_REQUIRES_GATE } from "../testing/fixtures/index.js";
import { newMatch, P1 } from "../testing/scenario.js";
import { canAffordForge, canAffordPlay, isReactionCard, ritualDurationOf } from "./cards.js";

function exampleCard(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    id: asCardId("card-example-afford"),
    name: "Example Afford",
    playCost: { mechanical: 2 },
    type: "instant",
    subtypes: [],
    attribute: "mechanical",
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
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
      attribute: "arcane",
      playCost: { arcane: 1, any: 2 },
      forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
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
      forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
    });
    expect(canAffordForge(state, P1, card)).toBe(true);
    expect(canAffordPlay(state, P1, card)).toBe(true);
    expect(
      canAffordForge({ ...state, syntheticForgedThisTurn: { [P1]: true } }, P1, exampleCard()),
    ).toBe(true);
  });
});

describe("ritualDurationOf", () => {
  const ritualBase: Partial<CardDefinition> = {
    type: "ritual",
  };

  it("returns null for non-rituals", () => {
    expect(ritualDurationOf(exampleCard({ type: "instant" }))).toBeNull();
    expect(ritualDurationOf(exampleCard({ type: "reaction", subtypes: [] }))).toBeNull();
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
