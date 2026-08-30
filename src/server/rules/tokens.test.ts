import { describe, expect, it } from "vitest";
import { DIE_PUNCH, TWIN_CAM, getCard } from "../content/cards.js";
import { cardPlayIsFuelled, isNonEmptyRequirement } from "./tokens.js";

describe("cardPlayIsFuelled", () => {
  it("Twin Cam with 2 Mechanical meets gate and header Spend", () => {
    const twinCam = getCard(TWIN_CAM);
    if (twinCam === undefined) throw new Error("Twin Cam");
    const requires = twinCam.effect?.requires;
    const spend = twinCam.playCost;
    if (!isNonEmptyRequirement(requires) || !isNonEmptyRequirement(spend)) {
      throw new Error("Twin Cam costs");
    }
    expect(cardPlayIsFuelled({ mechanical: 2 }, { requires, spend })).toBe(true);
  });

  it("Twin Cam with 1 Mechanical fails the gate even when Discount 1 covers the header", () => {
    const twinCam = getCard(TWIN_CAM);
    if (twinCam === undefined) throw new Error("Twin Cam");
    const requires = twinCam.effect?.requires;
    const spend = twinCam.playCost;
    if (!isNonEmptyRequirement(requires) || !isNonEmptyRequirement(spend)) {
      throw new Error("Twin Cam costs");
    }
    expect(cardPlayIsFuelled({ mechanical: 1 }, { requires, spend, spendNeed: 1 })).toBe(
      false,
    );
  });

  it("Die Punch with 2 Mechanical is fuelled (gate 1 held, Spend 2)", () => {
    const diePunch = getCard(DIE_PUNCH);
    if (diePunch === undefined) throw new Error("Die Punch");
    const requires = diePunch.effect?.requires;
    const spend = diePunch.playCost;
    if (!isNonEmptyRequirement(requires) || !isNonEmptyRequirement(spend)) {
      throw new Error("Die Punch costs");
    }
    expect(cardPlayIsFuelled({ mechanical: 2 }, { requires, spend })).toBe(true);
  });
});
