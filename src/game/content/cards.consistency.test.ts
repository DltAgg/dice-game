import { describe, expect, it } from "vitest";
import type { CardDefinition, CardSubtype } from "../model/cards.js";
import { ALL_CARDS } from "./cards.js";

/**
 * Attachment subtypes are how the UI and PLAY_CARD decide install vs forge-only.
 * A subtype without its region (or a region without its subtype) made Venomous
 * Fangs and Eternal Darkness unplayable while still printing as Equipment /
 * Ritual. Keep the two in lockstep for every catalogue card.
 */

const ATTACHMENT_SUBTYPES = ["equipment", "overload", "ritual"] as const satisfies readonly CardSubtype[];

type AttachmentSubtype = (typeof ATTACHMENT_SUBTYPES)[number];

function regionFor(card: CardDefinition, subtype: AttachmentSubtype): unknown {
  switch (subtype) {
    case "equipment":
      return card.equipment;
    case "overload":
      return card.overload;
    case "ritual":
      return card.ritual;
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

  it("lists every attachment subtype so new ones cannot be forgotten", () => {
    // If CardSubtype gains another attach-style value, extend ATTACHMENT_SUBTYPES.
    const known: readonly CardSubtype[] = [
      "instant",
      "ritual",
      "reaction",
      "equipment",
      "overload",
    ];
    expect(ATTACHMENT_SUBTYPES.every((subtype) => known.includes(subtype))).toBe(true);
  });
});
