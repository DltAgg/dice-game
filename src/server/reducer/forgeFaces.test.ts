import { describe, expect, it } from "vitest";
import { COG_DRAFT, TOOLING_ORDER } from "../content/cards.js";
import { COGTOOTH, getFaceCard } from "../content/faces.js";
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

describe("forge face selection", () => {
  it("pulls a named synthetic from the controller pool", () => {
    const ready = withPile(withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]), P1, 10);
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    expect(ready.players[P1]?.facePool).toContain(COGTOOTH);
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(forged.players[P1]?.facePool).not.toContain(COGTOOTH);
    expect(getFaceCard(COGTOOTH)?.symbol).toBe("mechanical");
  });

  it("Tooling Order consumes two pool faces when gated", () => {
    const ready = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [TOOLING_ORDER]),
      P1,
      10,
    );
    const afterPlay = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(afterPlay.pendingDecision?.type).toBe("choose-effect-mode");
  });
});
