import { describe, expect, it } from "vitest";
import { testCard } from "../testing/fixtures/index.js";
import { cardPlayIsFuelled, holdsTokens, isNonEmptyRequirement, pickPilePayment, pileRequirementShortfall } from "./tokens.js";

describe("cardPlayIsFuelled", () => {
  const spendCard = testCard({ playCost: { mechanical: 2 } });
  const spend = spendCard.playCost;
  if (!isNonEmptyRequirement(spend)) {
    throw new Error("fixture playCost");
  }

  it("always returns true after pile fuel gates were removed", () => {
    expect(cardPlayIsFuelled({ mechanical: 2 }, { spend })).toBe(true);
    expect(cardPlayIsFuelled({ mechanical: 1 }, { spend, spendNeed: 1 })).toBe(true);
    expect(cardPlayIsFuelled({ mechanical: 1 }, { spend })).toBe(true);
    expect(cardPlayIsFuelled({}, { spend })).toBe(true);
  });
});

describe("any pile pips", () => {
  const hybrid = { arcane: 1, any: 2 };

  it("shortfall reserves named attributes then leftover covers Any", () => {
    expect(pileRequirementShortfall({ arcane: 3 }, hybrid)).toBe(0);
    expect(pileRequirementShortfall({ arcane: 1, martial: 2 }, hybrid)).toBe(0);
    expect(pileRequirementShortfall({ martial: 5 }, hybrid)).toBe(1);
    expect(pileRequirementShortfall({ arcane: 1, martial: 1 }, hybrid)).toBe(1);
    expect(holdsTokens({ martial: 2, wild: 1 }, { any: 2 })).toBe(true);
    expect(holdsTokens({ martial: 1 }, { any: 2 })).toBe(false);
  });

  it("Spend of Any burns leftover tokens in ATTRIBUTES order", () => {
    expect(pickPilePayment({ arcane: 1, martial: 2, wild: 1 }, hybrid)).toEqual({
      arcane: 1,
      martial: 2,
    });
    expect(pickPilePayment({ darkness: 3 }, { any: 2 })).toEqual({ darkness: 2 });
  });

  it("card play fuel ignores pile contents", () => {
    expect(cardPlayIsFuelled({ arcane: 1, wild: 2 }, { spend: hybrid })).toBe(true);
    expect(cardPlayIsFuelled({ wild: 3 }, { spend: hybrid })).toBe(true);
    expect(cardPlayIsFuelled({ wild: 2 }, { spend: hybrid, spendNeed: 2 })).toBe(true);
    expect(cardPlayIsFuelled({ arcane: 1, wild: 1 }, { spend: hybrid, spendNeed: 2 })).toBe(
      true,
    );
  });
});
