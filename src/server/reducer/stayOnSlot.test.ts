import { describe, expect, it } from "vitest";
import { COG_DRAFT } from "../content/cards.js";
import { COGTOOTH } from "../content/faces.js";
import {
  expectOk,
  forgeAction,
  handCardIdAt,
  newMatch,
  P1,
  withPile,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

describe("stay on slot", () => {
  it("forged faces remain installed on their slots", () => {
    const ready = withPile(withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]), P1, 10);
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(forged.dice[dieId]?.slots[4]?.faceCardId).toBe(COGTOOTH);
    const rolled = expectOk(advance(withPhase(forged, "roll"), { type: "ROLL_DICE", playerId: P1 }));
    expect(rolled.dice[dieId]?.slots[4]?.faceCardId).toBe(COGTOOTH);
  });
});
