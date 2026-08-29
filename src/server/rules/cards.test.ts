import { describe, expect, it } from "vitest";
import { CONTROL_SQUAD } from "../content/creatures.js";
import type { CardDefinition } from "../model/cards.js";
import { asCardId, type PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { newMatch, P1, P2, withAttributePool } from "../testing/scenario.js";
import { canAffordForge, canAffordPlay } from "./cards.js";

function exampleCard(overrides: Partial<CardDefinition> = {}): CardDefinition {
  return {
    id: asCardId("card-example-afford"),
    name: "Example Afford",
    playCost: { arcane: 2 },
    type: "instant",
    subtypes: [],
    attribute: "arcane",
    forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
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

/** Archmage (CONTROL_SQUAD[0]) grants −1 play cost on Arcane cards once per turn. */
function controlMatch(): GameState {
  return newMatch({
    players: [
      { id: P1, squad: CONTROL_SQUAD, deck: [] },
      { id: P2, squad: CONTROL_SQUAD, deck: [] },
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
    const state = withAttributePool(newMatch(), P1, { arcane: 1 });
    const card = exampleCard({ playCost: { arcane: 2 } });
    expect(canAffordPlay(state, P1, card)).toBe(false);
    expect(canAffordForge(state, P1, card)).toBe(false);
  });

  it("returns true when the pile covers the full header cost", () => {
    const state = withAttributePool(newMatch(), P1, { arcane: 2 });
    const card = exampleCard({ playCost: { arcane: 2 } });
    expect(canAffordPlay(state, P1, card)).toBe(true);
    expect(canAffordForge(state, P1, card)).toBe(true);
  });

  it("applies play-cost discounts to play but not forge", () => {
    const state = withAttributePool(controlMatch(), P1, { arcane: 1 });
    const card = exampleCard({ playCost: { arcane: 2 }, attribute: "arcane" });
    expect(canAffordPlay(state, P1, card)).toBe(true);
    expect(canAffordForge(state, P1, card)).toBe(false);
  });

  it("applies forgeDiscountThisTurn to forge but not play", () => {
    const state = withForgeDiscount(
      withAttributePool(newMatch(), P1, { arcane: 1 }),
      P1,
      1,
    );
    const card = exampleCard({ playCost: { arcane: 2 } });
    expect(canAffordForge(state, P1, card)).toBe(true);
    expect(canAffordPlay(state, P1, card)).toBe(false);
  });
});
