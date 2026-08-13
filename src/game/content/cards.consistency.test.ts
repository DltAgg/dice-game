import { describe, expect, it } from "vitest";
import type { CardDefinition, CardSubtype } from "../model/cards.js";
import { ALL_CARDS } from "./cards.js";

/**
 * Equipment / Overload stay subtype ↔ region. Ritual is a main `CardType`, so
 * its region locks to `type === "ritual"` instead of a subtype token.
 */

const ATTACHMENT_SUBTYPES = ["equipment", "overload"] as const satisfies readonly CardSubtype[];

type AttachmentSubtype = (typeof ATTACHMENT_SUBTYPES)[number];

function regionFor(card: CardDefinition, subtype: AttachmentSubtype): unknown {
  switch (subtype) {
    case "equipment":
      return card.equipment;
    case "overload":
      return card.overload;
  }
}

describe("card subtype ↔ region consistency", () => {
  it.each(ALL_CARDS)("$name: attachment subtypes have matching regions", (card) => {
    for (const subtype of ATTACHMENT_SUBTYPES) {
      if (card.subtypes.includes(subtype)) {
        expect(
          regionFor(card, subtype),
          `${card.name} prints ${subtype} but has no ${subtype} region`,
        ).toBeDefined();
      }
    }
  });

  it.each(ALL_CARDS)("$name: attachment regions appear on the type line", (card) => {
    for (const subtype of ATTACHMENT_SUBTYPES) {
      if (regionFor(card, subtype) !== undefined) {
        expect(
          card.subtypes,
          `${card.name} has a ${subtype} region but does not list ${subtype}`,
        ).toContain(subtype);
      }
    }
  });

  it.each(ALL_CARDS)("$name: ritual type ↔ ritual region", (card) => {
    if (card.type === "ritual") {
      expect(card.ritual, `${card.name} is type ritual but has no ritual region`).toBeDefined();
    }
    if (card.ritual !== undefined) {
      expect(card.type, `${card.name} has a ritual region but type is not ritual`).toBe(
        "ritual",
      );
    }
  });

  it("lists every attachment subtype so new ones cannot be forgotten", () => {
    const known: readonly CardSubtype[] = [
      "instant",
      "continuous",
      "reaction",
      "equipment",
      "overload",
    ];
    expect(ATTACHMENT_SUBTYPES.every((subtype) => known.includes(subtype))).toBe(true);
  });
});
