import { describe, expect, it } from "vitest";
import type { GameEvent } from "@server";
import { forgeCardCountOf, uniqueForgeCardInstanceIds, pearsonCorrelation, forgeCardsOnTurn } from "./snapshot.js";

const faceForged = (cardInstanceId: string | null, slotIndex: number): GameEvent =>
  ({
    type: "face-forged",
    playerId: "p1",
    cardInstanceId,
    dieId: "d1",
    slotIndex,
    faceCardId: "face-x",
  }) as GameEvent;

describe("forge snapshots", () => {
  it("counts one tactic when two faces share a card instance", () => {
    const events = [faceForged("inst-1", 3), faceForged("inst-1", 4), faceForged(null, 5)];
    expect(uniqueForgeCardInstanceIds(events)).toEqual(["inst-1"]);
  });

  it("falls back to accepted FORGE_CARD actions when forge totals are missing", () => {
    expect(
      forgeCardCountOf({
        actions: [
          { accepted: true, actionType: "FORGE_CARD" },
          { accepted: true, actionType: "PLAY_CARD" },
          { accepted: false, actionType: "FORGE_CARD" },
        ],
      }),
    ).toBe(1);
  });

  it("counts FORGE_CARD actions on a turn when cardsForged is zero", () => {
    expect(
      forgeCardsOnTurn(
        { turn: 2, cardsForged: 0 },
        {
          actions: [
            { accepted: true, actionType: "FORGE_CARD", turn: 2 },
            { accepted: true, actionType: "FORGE_CARD", turn: 2 },
            { accepted: true, actionType: "FORGE_CARD", turn: 1 },
          ],
        },
      ),
    ).toBe(2);
  });
});

describe("pearsonCorrelation", () => {
  it("is 1 for a perfect positive line and -1 for inverse", () => {
    expect(pearsonCorrelation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(pearsonCorrelation([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1);
  });

  it("is null when a series has no variance or too few points", () => {
    expect(pearsonCorrelation([1], [1])).toBeNull();
    expect(pearsonCorrelation([1, 1], [2, 3])).toBeNull();
  });
});
