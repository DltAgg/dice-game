import { describe, expect, it } from "vitest";
import type { CardDefinition, CardSubtype, CardType } from "../model/cards.js";
import { ALL_CARDS } from "./cards.js";

/**
 * Equipment / Overload are main `CardType` values locked to their regions.
 * Ritual is also a main type with a matching `ritual` region. Instant /
 * Continuous / Reaction remain ritual `CardSubtype` modifiers only.
 */

const ATTACHMENT_TYPES = ["equipment", "overload"] as const satisfies readonly CardType[];

type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

function regionFor(card: CardDefinition, type: AttachmentType): unknown {
  switch (type) {
    case "equipment":
      return card.equipment;
    case "overload":
      return card.overload;
  }
}

describe("card type ↔ region consistency", () => {
  it.each(ALL_CARDS)("$name: attachment types have matching regions", (card) => {
    for (const type of ATTACHMENT_TYPES) {
      if (card.type === type) {
        expect(
          regionFor(card, type),
          `${card.name} is type ${type} but has no ${type} region`,
        ).toBeDefined();
      }
    }
  });

  it.each(ALL_CARDS)("$name: attachment regions appear as main type", (card) => {
    for (const type of ATTACHMENT_TYPES) {
      if (regionFor(card, type) !== undefined) {
        expect(
          card.type,
          `${card.name} has a ${type} region but type is not ${type}`,
        ).toBe(type);
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

  it.each(ALL_CARDS)("$name: forges its own attribute", (card) => {
    expect(
      card.forge.attribute,
      `${card.name} is ${card.attribute} but forges ${card.forge.attribute}`,
    ).toBe(card.attribute);
  });

  it("lists every CardSubtype so new ones cannot be forgotten", () => {
    const known: Record<CardSubtype, true> = {
      instant: true,
      continuous: true,
      reaction: true,
    };
    expect(Object.keys(known).sort()).toEqual(["continuous", "instant", "reaction"]);
    expect(ATTACHMENT_TYPES.every((type) => !(type in known))).toBe(true);
  });
});
