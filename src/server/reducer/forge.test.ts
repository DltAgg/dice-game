import { describe, expect, it } from "vitest";
import { COG_DRAFT, MENDING_LIGHT, TOOLING_ORDER } from "../content/cards.js";
import { COGTOOTH, naturalFaceId } from "../content/faces.js";
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
      withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]),
      P1,
      10,
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(forged.dice[dieId]?.slots[4]?.faceCardId).toBe(COGTOOTH);
  });

  it("installs a natural Luminar face via Mending Light", () => {
    const ready = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [MENDING_LIGHT]),
      P1,
      { luminar: 2 },
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [5])),
    );
    expect(forged.dice[dieId]?.slots[5]?.faceCardId).toBe(naturalFaceId("luminar"));
  });

  it("Tooling Order requires Mechanical pile gate before forging", () => {
    const ready = withHand(withPhase(newMatch(), "actions"), P1, [TOOLING_ORDER]);
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    const denied = advance(ready, {
      type: "FORGE_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(ready, P1, 0),
      dieId,
      slotIndexes: [3, 4],
      faceCardId: naturalFaceId("mechanical"),
    });
    expect(denied.ok).toBe(false);
  });
});
