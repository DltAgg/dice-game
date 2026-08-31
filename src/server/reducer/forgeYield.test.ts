import { describe, expect, it } from "vitest";
import { MENDING_LIGHT } from "../content/cards.js";
import { naturalFaceId } from "../content/faces.js";
import { symbolCountsOn } from "../rules/dice.js";
import {
  expectOk,
  forgeAction,
  handCardIdAt,
  newMatch,
  P1,
  withAttributePool,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

describe("forge yield", () => {
  it("natural forge does not displace unrelated attributes beyond the batch", () => {
    const ready = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [MENDING_LIGHT]),
      P1,
      { luminar: 2 },
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    const before = symbolCountsOn(ready.dice[dieId]!);
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [5])),
    );
    const after = symbolCountsOn(forged.dice[dieId]!);
    expect(forged.dice[dieId]?.slots[5]?.faceCardId).toBe(naturalFaceId("luminar"));
    expect(after.luminar ?? 0).toBe((before.luminar ?? 0) + 1);
  });
});
