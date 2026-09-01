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

describe("hintFor choose-silence-host", () => {
  it("lists mixed hosts for the chooser", () => {
    const hint = hintFor(
      { kind: "idle" },
      pendingState({
        type: "choose-silence-host",
        controllerId: P1,
        hosts: ["creature", "ritual", "face"],
        deferred: {} as never,
      }),
      true,
    );
    expect(hint).toBe("Choose an opposing creature, ritual, or die face to Silence.");
  });

  it("narrows copy when hosts is a creature-only subset", () => {
    const hint = hintFor(
      { kind: "idle" },
      pendingState({
        type: "choose-silence-host",
        controllerId: P1,
        hosts: ["creature"],
        deferred: {} as never,
      }),
      true,
    );
    expect(hint).toBe("Choose an opposing creature to Silence.");
  });

  it("waits when the local seat is not the chooser", () => {
    const hint = hintFor(
      { kind: "idle" },
      pendingState({
        type: "choose-silence-host",
        controllerId: P1,
        hosts: ["creature", "ritual", "face"],
        deferred: {} as never,
      }),
      false,
    );
    expect(hint).toBe("Waiting for the opponent to choose a host to Silence.");
  });
});

describe("hintFor choose-bounce-card", () => {
  it("lists mixed hosts for the chooser", () => {
    const hint = hintFor(
      { kind: "idle" },
      pendingState({
        type: "choose-bounce-card",
        controllerId: P1,
        hosts: ["ritual", "equipment", "overload"],
        deferred: {} as never,
      }),
      true,
    );
    expect(hint).toBe("Choose an opposing ritual, equipment, or overload to Bounce.");
  });

  it("narrows copy when hosts is an equipment-only subset", () => {
    const hint = hintFor(
      { kind: "idle" },
      pendingState({
        type: "choose-bounce-card",
        controllerId: P1,
        hosts: ["equipment"],
        deferred: {} as never,
      }),
      true,
    );
    expect(hint).toBe("Choose an opposing equipment to Bounce.");
  });

  it("waits when the local seat is not the chooser", () => {
    const hint = hintFor(
      { kind: "idle" },
      pendingState({
        type: "choose-bounce-card",
        controllerId: P1,
        hosts: ["ritual", "equipment", "overload"],
        deferred: {} as never,
      }),
      false,
    );
    expect(hint).toBe("Waiting for the opponent to choose a card to Bounce.");
  });
});

describe("hintFor choose-die-slot any-synthetic", () => {
  it("names Desynthesize while waiting", () => {
    const hint = hintFor(
      { kind: "idle" },
      pendingState({
        type: "choose-die-slot",
        controllerId: P1,
        filter: "any-synthetic",
        optional: false,
        deferred: {} as never,
      }),
      false,
    );
    expect(hint).toBe("Waiting for the opponent to choose a synthetic face to Desynthesize.");
  });
});
