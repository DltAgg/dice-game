import { describe, expect, it } from "vitest";
import { getCard } from "../content/cards.js";
import { getFaceCard } from "../content/faces.js";
import {
  TEST_NATURAL_FORGE,
  TEST_PLAYABLE,
  TEST_SYNTHETIC_LUMINAR_A,
  testCard,
} from "../testing/fixtures/index.js";

const EQUIP_WITH_ABILITY = testCard({
  id: "card-test-equip-with-ability",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  type: "equipment",
  equipment: {
    mayTargetOpponent: false,
    abilities: [
      {
        type: "on-roll-symbol",
        symbol: "mechanical",
        rollingPlayer: "controller",
        effects: [{ type: "grant-next-attack-bonus", amount: 1, target: { kind: "source-creature" } }],
      },
    ],
  },
});

const CHOOSE_ALLY = testCard({
  id: "card-test-pending-choose-ally",
  playCost: { luminar: 2 },
  attribute: "luminar",
  effect: {
    effects: [{ type: "grant-shield", amount: 2, target: { kind: "choose-ally" } }],
  },
});

describe("pending sources", () => {
  it("instant effects come from instant tactics", () => {
    expect(getCard(TEST_PLAYABLE)?.type).toBe("instant");
    expect(getCard(TEST_NATURAL_FORGE)?.type).toBe("instant");
    expect(getCard(CHOOSE_ALLY.id)?.type).toBe("instant");
  });

  it("equipment hosts standing abilities", () => {
    expect(getCard(EQUIP_WITH_ABILITY.id)?.equipment?.abilities.length ?? 0).toBeGreaterThan(0);
  });

  it("a Luminar synthetic is registered for face lookups", () => {
    expect(getFaceCard(TEST_SYNTHETIC_LUMINAR_A)?.symbol).toBe("luminar");
  });
});
