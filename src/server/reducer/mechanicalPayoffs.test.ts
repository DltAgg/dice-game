import { describe, expect, it } from "vitest";
import {
  TEST_SQUAD,
  testAttack,
  testCard,
  testCreature,
} from "../testing/fixtures/index.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withHand,
  withPhase,
  withPile,
  withShowingFaces,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const STAMP_THEN_DRAW = testCard({
  id: "card-test-stamp-then-draw",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  effect: {
    effects: [{ type: "reapply-die-modifiers" }, { type: "draw-cards", amount: 1 }],
  },
});

const STAMP_THEN_EMPOWER = testCard({
  id: "card-test-stamp-then-empower",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  effect: {
    effects: [{ type: "next-attack-bonus", amount: 1 }, { type: "reapply-die-modifiers" }],
  },
});

const DISCOUNT_SPECIAL = testAttack({
  id: "attack-test-discount-special",
  kind: "special",
  unlock: { mechanical: 2 },
  followUpEffects: [{ type: "arm-forge-discount", amount: 2 }],
});

const DISCOUNT_BODY = testCreature({
  id: "creature-test-discount-body",
  attributes: ["mechanical"],
  attacks: [DISCOUNT_SPECIAL],
});

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

describe("Mechanical Stamp, Discount, and Empower payoffs", () => {
  it("Stamp then Draw opens a die choice and plays the card", () => {
    const ready = withShowingFaces(actionsReady([STAMP_THEN_DRAW.id]), P1, ["mechanical"]);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("choose-die");
    expect(eventTypes(played)).toContain("card-played");
  });

  it("Empower then Stamp arms the next attack and opens a die choice", () => {
    const ready = withShowingFaces(actionsReady([STAMP_THEN_EMPOWER.id]), P1, ["mechanical"]);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("choose-die");
    expect(eventTypes(played)).toContain("card-played");
    expect(played.attackBonusThisTurn[P1]).toBe(1);
  });

  it("a special follow-up arms Discount 2 forge", () => {
    const match = newMatch({
      players: [
        {
          id: P1,
          squad: [DISCOUNT_BODY.id, TEST_SQUAD[1]!, TEST_SQUAD[2]!],
          deck: [],
        },
        { id: P2, squad: TEST_SQUAD, deck: [] },
      ],
    });
    const ready = withShowingFaces(withPhase(match, "actions"), P1, [
      "mechanical",
      "mechanical",
    ]);
    const after = expectOk(
      advance(ready, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(ready, P1, 0),
        attackId: DISCOUNT_SPECIAL.id,
        targetId: creatureIdAt(ready, P2, 0),
      }),
    );
    expect(after.creatures[creatureIdAt(after, P2, 0)]?.damage).toBe(2);
    expect(after.forgeDiscountThisTurn[P1]).toBe(2);
    expect(after.pendingDecision).toBeNull();
  });
});
