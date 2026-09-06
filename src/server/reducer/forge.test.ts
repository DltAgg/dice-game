import { describe, expect, it } from "vitest";
import {
  TEST_NATURAL_FORGE,
  TEST_PLAYABLE,
  TEST_REQUIRES_GATE,
  TEST_SYNTHETIC_MECHANICAL_A,
  testNaturalFaceId,
} from "../testing/fixtures/index.js";
import {
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
