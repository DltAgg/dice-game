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
    expect(getCard(SHIM_KIT)?.playCost).toEqual({ mechanical: 2, any: 1 });
  });

  const hybrid = { arcane: 1, any: 2 };

  it("Any pips are part of the printed total", () => {
    expect(discountedRequirementNeed(hybrid, 0)).toBe(3);
    expect(discountedRequirementNeed(hybrid, 1)).toBe(2);
    expect(discountedRequirementNeed({ any: 2 }, 2)).toBe(0);
  });

  it("Discount 1 on Arcane + 2 Any still requires the Arcane", () => {
    expect(canAffordUnderCaps({ martial: 2 }, hybrid, 2)).toBe(false);
    expect(canAffordUnderCaps({ arcane: 1, martial: 1 }, hybrid, 2)).toBe(true);
    expect(canAffordUnderCaps({ arcane: 3 }, hybrid, 2)).toBe(true);
  });

  it("full Arcane + 2 Any spend takes named then leftover in ATTRIBUTES order", () => {
    expect(pickSpendUnderCaps({ arcane: 1, martial: 2, wild: 1 }, hybrid, 3)).toEqual({
      arcane: 1,
      martial: 2,
    });
    expect(pickSpendUnderCaps({ martial: 2 }, { any: 2 }, 2)).toEqual({ martial: 2 });
  });

  it("wildcard pad for Any shortfall lands on Martial", () => {
    expect(pickSpendUnderCaps({}, { any: 2 }, 2)).toEqual({ martial: 2 });
    expect(canAffordUnderCaps({}, { any: 2 }, 2, 2)).toBe(true);
  });
});
