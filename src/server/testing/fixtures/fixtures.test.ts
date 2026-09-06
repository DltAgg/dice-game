import { describe, expect, it } from "vitest";
import { getCard, getCreatureDefinition, getFaceCard } from "@server";
import { isOpeningBasicFace } from "../../rules/loadout.js";
import {
  TEST_FACE_DECK,
  TEST_LEGAL_DECK,
  TEST_PLAYABLE,
  TEST_SHIELD_FACE_ID,
  TEST_SQUAD,
  TEST_SYNTHETIC_MECHANICAL_A,
} from "./index.js";
import { testCard, testNaturalFaceId } from "./builders.js";

describe("test catalogue fixtures", () => {
  it("registers identity faces as opening basics", () => {
    expect(isOpeningBasicFace(testNaturalFaceId("luminar"))).toBe(true);
    expect(isOpeningBasicFace(TEST_SHIELD_FACE_ID)).toBe(true);
    expect(getFaceCard(TEST_SYNTHETIC_MECHANICAL_A)?.kind).toBe("synthetic");
  });

  it("registers a playable tactic and a legal squad", () => {
    expect(getCard(TEST_PLAYABLE)?.type).toBe("instant");
    expect(TEST_SQUAD).toHaveLength(3);
    expect(getCreatureDefinition(TEST_SQUAD[2]!)?.legendary).toBe(true);
    expect(TEST_FACE_DECK).toHaveLength(6);
    expect(TEST_LEGAL_DECK).toHaveLength(42);
  });

  it("lets a test own a one-off card without using catalogue ids", () => {
    const card = testCard({
      name: "One-off",
      playCost: { arcane: 3 },
      attribute: "arcane",
      effect: { effects: [{ type: "draw-cards", amount: 2 }] },
    });
    expect(getCard(card.id)?.playCost).toEqual({ arcane: 3 });
  });
});
