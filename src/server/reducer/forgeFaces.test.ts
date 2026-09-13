import { describe, expect, it } from "vitest";
import { getFaceCard } from "../content/faces.js";
import {
  TEST_PLAYABLE,
  TEST_SYNTHETIC_MECHANICAL_A,
  testCard,
} from "../testing/fixtures/index.js";
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

const CHOOSE_STAMP_OR_DISCOUNT = testCard({
  id: "card-test-choose-stamp-or-discount",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  forge: { faces: 2, kind: "synthetic", attribute: "mechanical", target: "own-die" },
  effect: {
    requires: { mechanical: 2 },
    effects: [
      {
        type: "choose-effect-mode",
        modes: [
          [{ type: "reapply-die-modifiers" }],
          [{ type: "arm-forge-discount", amount: 2 }],
        ],
        modeLabels: ["Stamp", "Discount 2 forge"],
      },
    ],
  },
});

describe("forge face selection", () => {
  it("pulls a named synthetic from the controller pool", () => {
    const ready = withPile(withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]), P1, 10);
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    expect(ready.players[P1]?.facePool).toContain(TEST_SYNTHETIC_MECHANICAL_A);
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(forged.players[P1]?.facePool).not.toContain(TEST_SYNTHETIC_MECHANICAL_A);
    expect(getFaceCard(TEST_SYNTHETIC_MECHANICAL_A)?.symbol).toBe("mechanical");
  });

  it("gated choose-effect-mode opens after play", () => {
    const ready = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [CHOOSE_STAMP_OR_DISCOUNT.id]),
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
