import { describe, expect, it } from "vitest";
import { fakeRecording } from "./fixtures.js";
import { aggregateRecordings, insightsFor } from "./insights.js";

describe("insights", () => {
  it("flags matches past the 10-turn baseline plus low lethality and stalls", () => {
    const recordings = [
      fakeRecording({ recordingId: "a", matchId: "m-a" }),
      fakeRecording({
        recordingId: "b",
        matchId: "m-b",
        totalTurns: 14,
        totalDamageDealt: 10,
        stallTurnCount: 8,
      }),
    ];
    const insights = insightsFor(recordings);
    const ids = insights.map((insight) => insight.id);
    expect(ids).toContain("often-over-baseline");
    expect(ids).toContain("high-drag");
    expect(ids).toContain("low-lethality");
    expect(ids).toContain("stall-turns");
  });

  it("dedupes the same matchId keeping the richer recording", () => {
    const thin = fakeRecording({ recordingId: "thin", matchId: "dup", actions: [] });
    const rich = fakeRecording({ recordingId: "rich", matchId: "dup" });
    const agg = aggregateRecordings([thin, rich]);
    expect(agg.matchCount).toBe(1);
    expect(agg.finishedCount).toBe(1);
  });

  it("asks for more data when nothing has finished", () => {
    const insights = insightsFor([
      fakeRecording({ status: "in-progress", endedAt: null, winnerId: null }),
    ]);
    expect(insights[0]?.id).toBe("insufficient-finished");
  });

  it("splits effect plays from forge spends", () => {
    const agg = aggregateRecordings([fakeRecording()]);
    expect(agg.playVsForgeMix).toEqual({
      "Played (effect)": 10,
      "Played (forge)": 4,
    });
    expect(agg.totalCardsPlayed).toBe(10);
    expect(agg.totalCardsForged).toBe(4);
    expect(agg.cardPlayMix["Eclipse (card-eclipse)"]).toBe(2);
    expect(agg.cardForgeMix["Living Library (card-living-library)"]).toBe(4);
  });

  it("correlates effect/turn with forge/turn across matches", () => {
    const agg = aggregateRecordings([
      fakeRecording({
        recordingId: "a",
        matchId: "m-a",
        totalTurns: 10,
        totalCardsPlayed: 10,
        totalCardsForged: 5,
      }),
      fakeRecording({
        recordingId: "b",
        matchId: "m-b",
        totalTurns: 10,
        totalCardsPlayed: 20,
        totalCardsForged: 10,
      }),
    ]);
    expect(agg.playForgeRates).toHaveLength(2);
    expect(agg.playForgeCorrelation).toBeCloseTo(1);
    expect(agg.meanEffectPerTurn).toBeCloseTo(1.5);
    expect(agg.meanForgePerTurn).toBeCloseTo(0.75);
  });

  it("averages effect vs forge counts by turn number", () => {
    const agg = aggregateRecordings([
      fakeRecording({
        recordingId: "a",
        matchId: "m-a",
        turns: [
          {
            ...fakeRecording().turns[0]!,
            turn: 1,
            cardsPlayed: 2,
            cardsForged: 1,
          },
          {
            ...fakeRecording().turns[0]!,
            turn: 2,
            playerId: "p2",
            cardsPlayed: 0,
            cardsForged: 2,
          },
        ],
      }),
      fakeRecording({
        recordingId: "b",
        matchId: "m-b",
        turns: [
          {
            ...fakeRecording().turns[0]!,
            turn: 1,
            cardsPlayed: 0,
            cardsForged: 1,
          },
        ],
      }),
    ]);
    expect(agg.playForgeByTurn).toEqual([
      { turn: 1, meanEffect: 1, meanForge: 1, matchCount: 2 },
      { turn: 2, meanEffect: 0, meanForge: 2, matchCount: 1 },
    ]);
  });
});
