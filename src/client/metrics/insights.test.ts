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

  it("aggregates close timeline and opening-seat wins", () => {
    const agg = aggregateRecordings([
      fakeRecording({
        recordingId: "a",
        matchId: "m-a",
        totalTurns: 8,
        totalDamageDealt: 20,
        winnerId: "p1",
        firstPlayerId: "p1",
        livingCreaturesAtEnd: { p1: 2, p2: 1 },
        turns: [
          {
            ...fakeRecording().turns[0]!,
            turn: 1,
            damageDealt: 0,
            attacksDeclared: 0,
            creaturesDefeated: 0,
          },
          {
            ...fakeRecording().turns[0]!,
            turn: 4,
            damageDealt: 6,
            attacksDeclared: 1,
            creaturesDefeated: 1,
          },
        ],
      }),
      fakeRecording({
        recordingId: "b",
        matchId: "m-b",
        totalTurns: 9,
        totalDamageDealt: 18,
        winnerId: "p2",
        firstPlayerId: "p1",
        p1DeckName: "Aggro",
        p2DeckName: "Control",
        livingCreaturesAtEnd: { p1: 0, p2: 2 },
        turns: [
          {
            ...fakeRecording().turns[0]!,
            turn: 1,
            damageDealt: 4,
            attacksDeclared: 1,
            creaturesDefeated: 0,
          },
          {
            ...fakeRecording().turns[0]!,
            turn: 6,
            damageDealt: 8,
            attacksDeclared: 1,
            creaturesDefeated: 1,
          },
        ],
      }),
    ]);
    expect(agg.medianFirstDamageTurn).toBe(2.5);
    expect(agg.medianFirstAttackTurn).toBe(2.5);
    expect(agg.medianFirstDefeatTurn).toBe(5);
    expect(agg.pctNeverDefeat).toBe(0);
    expect(agg.firstPlayerWinRate).toBe(0.5);
    expect(agg.p1WinRate).toBe(0.5);
    expect(agg.deckPairs).toEqual([{ pair: "Aggro vs Control", matches: 2, p1Wins: 1, p2Wins: 1 }]);
  });

  it("flags early first deaths", () => {
    const earlyTurn = {
      ...fakeRecording().turns[0]!,
      turn: 2,
      damageDealt: 10,
      attacksDeclared: 1,
      creaturesDefeated: 1,
    };
    const insights = insightsFor([
      fakeRecording({
        recordingId: "a",
        matchId: "early-a",
        totalTurns: 8,
        totalDamageDealt: 24,
        stallTurnCount: 0,
        winnerId: "p1",
        livingCreaturesAtEnd: { p1: 2, p2: 1 },
        turns: [earlyTurn],
      }),
      fakeRecording({
        recordingId: "b",
        matchId: "early-b",
        totalTurns: 7,
        totalDamageDealt: 20,
        stallTurnCount: 0,
        winnerId: "p2",
        livingCreaturesAtEnd: { p1: 1, p2: 2 },
        turns: [{ ...earlyTurn, turn: 3 }],
      }),
    ]);
    expect(insights.map((insight) => insight.id)).toContain("early-first-death");
  });
});
