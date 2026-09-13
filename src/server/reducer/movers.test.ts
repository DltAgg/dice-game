import { describe, expect, it } from "vitest";
import { testCard } from "../testing/fixtures/index.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withPile,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const REFORGE_TWO = testCard({
  id: "card-test-reforge-two",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  forge: { faces: 2, kind: "synthetic", attribute: "mechanical", target: "own-die" },
  effect: {
    effects: [{ type: "replace-synthetic-face", faces: 2, attribute: "mechanical" }],
  },
});

describe("synthetic replacement movers", () => {
  it("opens replace-synthetic-face for two Mechanical faces", () => {
    const ready = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [REFORGE_TWO.id]),
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
    expect(played.pendingDecision).toMatchObject({
      type: "replace-synthetic-face",
      faces: 2,
      attribute: "mechanical",
    });
  });
});
