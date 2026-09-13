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
  withShowingFaces,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const STAMP = testCard({
  id: "card-test-stamp-two",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  forge: { faces: 2, kind: "synthetic", attribute: "mechanical", target: "own-die" },
  effect: {
    effects: [{ type: "reapply-die-modifiers" }],
  },
});

describe("Stamp after play", () => {
  it("opens choose-die for Stamp", () => {
    const ready = withShowingFaces(
      withPile(withHand(withPhase(newMatch(), "actions"), P1, [STAMP.id]), P1, 10),
      P1,
      ["mechanical"],
    );
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("choose-die");
  });
});
