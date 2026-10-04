import { describe, expect, it } from "vitest";
import type { CardSubtype, CardType } from "../model/cards.js";
import { playCostTotal } from "../rules/cards.js";
import { ALL_CARDS } from "./cards.js";

/**
 * A card is Modify or Response. Equipment, overload, and ritual are regions
 * on that card, not types. Instant / Continuous / Reaction stay subtype
 * modifiers on a ritual region.
 */

const CARD_TYPES = ["modify", "response"] as const satisfies readonly CardType[];

describe("card type ↔ region consistency", () => {
  it.each(ALL_CARDS)("$name: type is Modify or Response", (card) => {
    expect(CARD_TYPES).toContain(card.type);
  });

  it.each(ALL_CARDS)("$name: at most one play region", (card) => {
    const regions = [card.effect, card.equipment, card.overload, card.ritual].filter(
      (region) => region !== undefined,
    );
    expect(regions.length, `${card.name} has more than one play region`).toBeLessThanOrEqual(1);
  });

  it.each(ALL_CARDS)("$name: forge names faces and a die", (card) => {
    expect(card.forge.faces).toBeGreaterThan(0);
    expect(card.forge.target === "own-die" || card.forge.target === "opponent-die").toBe(true);
  });

  it("lists every CardSubtype so new ones cannot be forgotten", () => {
    const known: Record<CardSubtype, true> = {
      instant: true,
      continuous: true,
      reaction: true,
    };
    expect(Object.keys(known).sort()).toEqual(["continuous", "instant", "reaction"]);
    expect(CARD_TYPES.every((type) => !(type in known))).toBe(true);
  });

  it.each(ALL_CARDS)("$name: live rituals are not Instant subtype", (card) => {
    if (card.ritual !== undefined) {
      expect(
        card.subtypes.includes("instant"),
        `${card.name} is type ritual but still has Instant subtype`,
      ).toBe(false);
    }
  });

  it.each(ALL_CARDS)("$name: header forge faces follow the playCost curve", (card) => {
    const cost = playCostTotal(card);
    const expected =
      cost >= 5 ? 4 : cost === 4 ? 3 : cost === 3 ? 2 : card.forge.faces;
    expect(
      card.forge.faces,
      `${card.name} costs ${String(cost)} so forge.faces should be ${String(expected)}`,
    ).toBe(expected);
  });
});
