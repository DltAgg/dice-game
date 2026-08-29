import { describe, expect, it } from "vitest";
import { getCard } from "../content/cards.js";
import { asCardId } from "../model/ids.js";
import {
  canAffordUnderCaps,
  discountedRequirementNeed,
  pickSpendUnderCaps,
  reduceRequirement,
} from "./discounts.js";

/** Crosscut printed cost — proving multi-attribute header. */
const CROSSCUT_COST = getCard(asCardId("card-crosscut"))!.playCost!;

describe("flexible attribute-pile discounts", () => {
  it("computes need as printed total minus discount (min 0)", () => {
    expect(discountedRequirementNeed(CROSSCUT_COST, 1)).toBe(1);
    expect(discountedRequirementNeed(CROSSCUT_COST, 2)).toBe(0);
    expect(discountedRequirementNeed(CROSSCUT_COST, 5)).toBe(0);
    expect(discountedRequirementNeed({ arcane: 2 }, 1)).toBe(1);
  });

  it("Crosscut discount 1 is affordable with only martial or only wild", () => {
    expect(canAffordUnderCaps({ martial: 1 }, CROSSCUT_COST, 1)).toBe(true);
    expect(canAffordUnderCaps({ wild: 1 }, CROSSCUT_COST, 1)).toBe(true);
    expect(canAffordUnderCaps({}, CROSSCUT_COST, 1)).toBe(false);
    expect(canAffordUnderCaps({ arcane: 5 }, CROSSCUT_COST, 1)).toBe(false);
  });

  it("Crosscut discount 1 burns the attribute held (ATTRIBUTES order when both)", () => {
    expect(pickSpendUnderCaps({ martial: 1 }, CROSSCUT_COST, 1)).toEqual({ martial: 1 });
    expect(pickSpendUnderCaps({ wild: 1 }, CROSSCUT_COST, 1)).toEqual({ wild: 1 });
    // martial precedes wild in ATTRIBUTES → prefer martial when both are held
    expect(pickSpendUnderCaps({ martial: 1, wild: 1 }, CROSSCUT_COST, 1)).toEqual({
      martial: 1,
    });
  });

  it("single-attribute discount still peels one token from that attribute", () => {
    const library = { arcane: 2 };
    expect(reduceRequirement(library, 1, { arcane: 2 })).toEqual({ arcane: 1 });
    expect(canAffordUnderCaps({ arcane: 1 }, library, 1)).toBe(true);
  });

  it("pads shortfall onto caps for Resonance wildcards", () => {
    // need 1, empty pile → spend martial (first printed attr in ATTRIBUTES order)
    expect(pickSpendUnderCaps({}, CROSSCUT_COST, 1)).toEqual({ martial: 1 });
    expect(canAffordUnderCaps({}, CROSSCUT_COST, 1, 1)).toBe(true);
  });
});
