import { describe, expect, it } from "vitest";
import { TOOLING_ORDER, getCard } from "../content/cards.js";
import { TEMPO_SQUAD } from "../content/creatures.js";
import type { CardDefinition } from "../model/cards.js";
import { asCardId, type PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import {
  newMatch,
  P1,
  P2,
  withAttributePool,
} from "../testing/scenario.js";
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

function withForgeDiscount(
  state: GameState,
  playerId: PlayerId,
  amount: number,
): GameState {
  return {
    ...state,
    forgeDiscountThisTurn: { ...state.forgeDiscountThisTurn, [playerId]: amount },
  };
}

function withPlayCostDiscount(
  state: GameState,
  playerId: PlayerId,
  amount: number,
): GameState {
  return {
    ...state,
    playCostDiscountThisTurn: { ...state.playCostDiscountThisTurn, [playerId]: amount },
  };
}

function tempoMatch(): GameState {
  return newMatch({
    players: [
      { id: P1, squad: TEMPO_SQUAD, deck: [] },
      { id: P2, squad: TEMPO_SQUAD, deck: [] },
    ],
  });
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

  it("returns false when the pile cannot cover the header cost", () => {
    const state = withAttributePool(newMatch(), P1, { mechanical: 1 });
    const card = exampleCard({ playCost: { mechanical: 2 } });
    expect(canAffordPlay(state, P1, card)).toBe(false);
    expect(canAffordForge(state, P1, card)).toBe(false);
  });

  it("returns true when the pile covers the full header cost", () => {
    const state = withAttributePool(newMatch(), P1, { mechanical: 2 });
    const card = exampleCard({ playCost: { mechanical: 2 } });
    expect(canAffordPlay(state, P1, card)).toBe(true);
    expect(canAffordForge(state, P1, card)).toBe(true);
  });

  it("On roll play-cost-discount covers a play but not a forge", () => {
    const card = exampleCard({ playCost: { mechanical: 2 } });
    const state = withPlayCostDiscount(
      withAttributePool(newMatch(), P1, { mechanical: 1 }),
      P1,
      1,
    );
    expect(canAffordPlay(state, P1, card)).toBe(true);
    expect(canAffordForge(state, P1, card)).toBe(false);
  });

  it("Arcane + 2 Any is payable with one Arcane and off-attribute tokens", () => {
    const card = exampleCard({
      attribute: "arcane",
      playCost: { arcane: 1, any: 2 },
      forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
    });
    const splash = withAttributePool(newMatch(), P1, { arcane: 1, martial: 2 });
    const mono = withAttributePool(newMatch(), P1, { martial: 3 });
    expect(canAffordPlay(splash, P1, card)).toBe(true);
    expect(canAffordForge(splash, P1, card)).toBe(true);
    expect(canAffordPlay(mono, P1, card)).toBe(false);
    expect(canAffordForge(mono, P1, card)).toBe(false);
  });

  it("applies forgeDiscountThisTurn to forge but not play", () => {
    const state = withForgeDiscount(
      withAttributePool(tempoMatch(), P1, { mechanical: 1 }),
      P1,
      1,
    );
    const card = exampleCard({ playCost: { mechanical: 2 } });
    expect(canAffordForge(state, P1, card)).toBe(true);
    expect(canAffordPlay(state, P1, card)).toBe(false);
  });

  it("treats natural forge as free regardless of pile or playCost", () => {
    const state = withAttributePool(newMatch(), P1, {});
    const card = exampleCard({
      playCost: { mechanical: 2 },
      forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
    });
    expect(canAffordForge(state, P1, card)).toBe(true);
    expect(canAffordPlay(state, P1, card)).toBe(false);
  });

  it("multi-attr forge discount 1 accepts either printed attribute", () => {
    const card = exampleCard({
      playCost: { mechanical: 1, luminar: 1 },
      attribute: "mechanical",
      forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
    });
    const mechanical = withForgeDiscount(
      withAttributePool(newMatch(), P1, { mechanical: 1 }),
      P1,
      1,
    );
    const luminar = withForgeDiscount(withAttributePool(newMatch(), P1, { luminar: 1 }), P1, 1);
    expect(canAffordForge(mechanical, P1, card)).toBe(true);
    expect(canAffordForge(luminar, P1, card)).toBe(true);
    expect(canAffordPlay(mechanical, P1, card)).toBe(false);
    expect(canAffordPlay(luminar, P1, card)).toBe(false);
  });

  it("Requires gate is unmet even when Discount 1 would cover the header", () => {
    const tooling = getCard(TOOLING_ORDER);
    if (tooling === undefined) throw new Error("Tooling Order");
    const state = withPlayCostDiscount(
      withAttributePool(newMatch(), P1, { mechanical: 1 }),
      P1,
      2,
    );
    expect(canAffordPlay(state, P1, tooling)).toBe(false);
    expect(canAffordForge(state, P1, tooling)).toBe(true);
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

