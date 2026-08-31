import { describe, expect, it } from "vitest";
import { getCard, SHIM_KIT } from "../content/cards.js";
import {
  canAffordUnderCaps,
  discountedRequirementNeed,
  pickSpendUnderCaps,
  reduceRequirement,
} from "./discounts.js";

/** Multi-attribute header used by several Tempo synthetic forges. */
const DUAL_COST = { mechanical: 1, luminar: 1 };

describe("flexible attribute-pile discounts", () => {
  it("computes need as printed total minus discount (min 0)", () => {
    expect(discountedRequirementNeed(DUAL_COST, 1)).toBe(1);
    expect(discountedRequirementNeed(DUAL_COST, 2)).toBe(0);
    expect(discountedRequirementNeed(DUAL_COST, 5)).toBe(0);
    expect(discountedRequirementNeed({ mechanical: 2 }, 1)).toBe(1);
  });

  it("dual-attribute discount 1 is affordable with only one printed attribute", () => {
    expect(canAffordUnderCaps({ mechanical: 1 }, DUAL_COST, 1)).toBe(true);
    expect(canAffordUnderCaps({ luminar: 1 }, DUAL_COST, 1)).toBe(true);
    expect(canAffordUnderCaps({}, DUAL_COST, 1)).toBe(false);
    expect(canAffordUnderCaps({ arcane: 5 }, DUAL_COST, 1)).toBe(false);
  });

  it("dual-attribute discount 1 burns the attribute held (ATTRIBUTES order when both)", () => {
    expect(pickSpendUnderCaps({ mechanical: 1 }, DUAL_COST, 1)).toEqual({ mechanical: 1 });
    expect(pickSpendUnderCaps({ luminar: 1 }, DUAL_COST, 1)).toEqual({ luminar: 1 });
    expect(pickSpendUnderCaps({ mechanical: 1, luminar: 1 }, DUAL_COST, 1)).toEqual({
      luminar: 1,
    });
  });

  it("single-attribute discount still peels one token from that attribute", () => {
    const library = { mechanical: 2 };
    expect(reduceRequirement(library, 1, { mechanical: 2 })).toEqual({ mechanical: 1 });
    expect(canAffordUnderCaps({ mechanical: 1 }, library, 1)).toBe(true);
  });

  it("pads shortfall onto caps for Resonance wildcards", () => {
    expect(pickSpendUnderCaps({}, DUAL_COST, 1)).toEqual({ luminar: 1 });
    expect(canAffordUnderCaps({}, DUAL_COST, 1, 1)).toBe(true);
  });

  it("reads live Tempo card costs", () => {
    expect(getCard(SHIM_KIT)?.playCost).toEqual({ mechanical: 2 });
  });
});
