import { describe, expect, it } from "vitest";
import { DIE_PUNCH, TWIN_CAM, getCard } from "../content/cards.js";
import { cardPlayIsFuelled, holdsTokens, isNonEmptyRequirement, pickPilePayment, pileRequirementShortfall } from "./tokens.js";

describe("cardPlayIsFuelled", () => {
  it("Twin Cam with 2 Mechanical meets header Spend", () => {
    const twinCam = getCard(TWIN_CAM);
    if (twinCam === undefined) throw new Error("Twin Cam");
    const spend = twinCam.playCost;
    if (!isNonEmptyRequirement(spend)) {
      throw new Error("Twin Cam costs");
    }
    expect(cardPlayIsFuelled({ mechanical: 2 }, { spend })).toBe(true);
  });

  it("Twin Cam with 1 Mechanical fails the header; Discount 1 covers it", () => {
    const twinCam = getCard(TWIN_CAM);
    if (twinCam === undefined) throw new Error("Twin Cam");
    const spend = twinCam.playCost;
    if (!isNonEmptyRequirement(spend)) {
      throw new Error("Twin Cam costs");
    }
    expect(cardPlayIsFuelled({ mechanical: 1 }, { spend, spendNeed: 1 })).toBe(true);
    expect(cardPlayIsFuelled({ mechanical: 1 }, { spend })).toBe(false);
  });

  it("Die Punch with 2 Mechanical is fuelled (Spend 2, no gate)", () => {
    const diePunch = getCard(DIE_PUNCH);
    if (diePunch === undefined) throw new Error("Die Punch");
    const spend = diePunch.playCost;
    if (!isNonEmptyRequirement(spend)) {
      throw new Error("Die Punch costs");
    }
    expect(cardPlayIsFuelled({ mechanical: 2 }, { spend })).toBe(true);
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

  it("card play with Any spend is fuelled from off-attribute tokens", () => {
    expect(cardPlayIsFuelled({ arcane: 1, wild: 2 }, { spend: hybrid })).toBe(true);
    expect(cardPlayIsFuelled({ wild: 3 }, { spend: hybrid })).toBe(false);
    expect(cardPlayIsFuelled({ wild: 2 }, { spend: hybrid, spendNeed: 2 })).toBe(false);
    expect(cardPlayIsFuelled({ arcane: 1, wild: 1 }, { spend: hybrid, spendNeed: 2 })).toBe(
      true,
    );
  });
});
