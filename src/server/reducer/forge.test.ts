import { describe, expect, it } from "vitest";
import { graveyardOf } from "../rules/cards.js";
import {
  TEST_NATURAL_FORGE,
  TEST_PLAYABLE,
  TEST_REQUIRES_GATE,
  TEST_SYNTHETIC_MECHANICAL_A,
  testCard,
  testNaturalFaceId,
} from "../testing/fixtures/index.js";
import {
  creatureIdAt,
  expectOk,
  forgeAction,
  handCardIdAt,
  newMatch,
  P1,
  withAttributePool,
  withPile,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const FORGE_AND_EMPOWER = testCard({
  id: "card-test-forge-empower",
  name: "Forge and Empower",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  type: "instant",
  effect: {
    effects: [{ type: "damage", amount: 2, target: { kind: "choose-enemy" } }],
  },
  forge: {
    faces: 1,
    kind: "synthetic",
    attribute: "mechanical",
    target: "own-die",
    effects: [{ type: "next-attack-bonus", amount: 1 }],
    rulesText: "[Empower 1].",
  },
  rulesText: "[Strike 2].",
});

const FORGE_CHOOSE_SHIELD = testCard({
  id: "card-test-forge-choose-shield",
  name: "Forge and Shield",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  type: "instant",
  effect: {
    effects: [{ type: "damage", amount: 2, target: { kind: "choose-enemy" } }],
  },
  forge: {
    faces: 1,
    kind: "synthetic",
    attribute: "mechanical",
    target: "own-die",
    effects: [{ type: "grant-shield", amount: 1, target: { kind: "choose-ally" } }],
    rulesText: "[Mark 1 Shield] on a chosen ally.",
  },
  rulesText: "[Strike 2].",
});

describe("FORGE_CARD", () => {
  it("installs a synthetic face from the pool", () => {
    const ready = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]),
      P1,
      10,
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(forged.dice[dieId]?.slots[4]?.faceCardId).toBe(TEST_SYNTHETIC_MECHANICAL_A);
  });

  it("installs a natural Luminar face", () => {
    const ready = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [TEST_NATURAL_FORGE]),
      P1,
      { luminar: 2 },
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [5])),
    );
    expect(forged.dice[dieId]?.slots[5]?.faceCardId).toBe(testNaturalFaceId("luminar"));
  });

  it("resolves forge.effects after a successful install without a reaction window", () => {
    const ready = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [FORGE_AND_EMPOWER.id]),
      P1,
      10,
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    const cardInstanceId = handCardIdAt(ready, P1, 0);
    const forged = expectOk(advance(ready, forgeAction(ready, P1, cardInstanceId, dieId, [4])));
    expect(forged.dice[dieId]?.slots[4]?.faceCardId).toBe(TEST_SYNTHETIC_MECHANICAL_A);
    expect(graveyardOf(forged, P1).map((card) => card.id)).toEqual([cardInstanceId]);
    expect(forged.attackBonusThisTurn[P1]).toBe(1);
    expect(forged.pendingDecision?.type).not.toBe("reaction-priority");
    expect(forged.pendingDecision).toBeNull();
    expect(forged.chainStack).toHaveLength(0);
  });

  it("does not run forge.effects when the card is played", () => {
    const ready = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [FORGE_AND_EMPOWER.id]),
      P1,
      10,
    );
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.attackBonusThisTurn[P1] ?? 0).toBe(0);
    expect(played.pendingDecision?.type).toBe("choose-creature");
  });

  it("pauses on choose-creature for targeted forge.effects without opening a window", () => {
    const ready = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [FORGE_CHOOSE_SHIELD.id]),
      P1,
      10,
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    const allyId = creatureIdAt(ready, P1, 0);
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(forged.pendingDecision?.type).toBe("choose-creature");
    expect(forged.pendingDecision?.type).not.toBe("reaction-priority");
    expect(forged.chainStack).toHaveLength(0);
    const resolved = expectOk(
      advance(forged, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: allyId,
      }),
    );
    expect(resolved.creatures[allyId]?.shields).toBe(1);
    expect(resolved.pendingDecision).toBeNull();
    expect(resolved.chainStack).toHaveLength(0);
  });

  it("refuses a forge when the Requires pile gate is unmet", () => {
    const ready = withHand(withPhase(newMatch(), "actions"), P1, [TEST_REQUIRES_GATE]);
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    const denied = advance(ready, {
      type: "FORGE_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(ready, P1, 0),
      dieId,
      slotIndexes: [3, 4],
      faceCardId: testNaturalFaceId("mechanical"),
    });
    expect(denied.ok).toBe(false);
  });
});
