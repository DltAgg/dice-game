import { describe, expect, it } from "vitest";
import { asPlayerId, type GameState } from "@server";
import { hintFor } from "./hintFor";

const P1 = asPlayerId("p1");

function pendingState(pending: GameState["pendingDecision"]): GameState {
  return { pendingDecision: pending } as unknown as GameState;
}

describe("hintFor optional discard", () => {
  it("mentions Decline when discard is optional", () => {
    const hint = hintFor(
      { kind: "idle" },
      pendingState({
        type: "discard-cards",
        controllerId: P1,
        amount: 1,
        optional: true,
        sourceCardInstanceId: null,
        sourceFaceCardId: null,
      }),
      true,
    );
    expect(hint).toContain("Decline");
    expect(hint).toContain("up to");
  });

  it("requires an exact count when discard is not optional", () => {
    const hint = hintFor(
      { kind: "idle" },
      pendingState({
        type: "discard-cards",
        controllerId: P1,
        amount: 1,
        sourceCardInstanceId: null,
        sourceFaceCardId: null,
      }),
      true,
    );
    expect(hint).not.toContain("Decline");
    expect(hint).toContain("Choose 1");
  });
});
