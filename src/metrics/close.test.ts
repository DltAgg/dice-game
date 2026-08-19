import { describe, expect, it } from "vitest";
import {
  closeByTurn,
  deckPairRecords,
  defeatCloseKind,
  energySpentOf,
  firstAttackTurn,
  firstDamageTurn,
  firstDefeatTurn,
  firstPlayerWon,
} from "./close.js";
import { fakeRecording } from "./fixtures.js";

function omitKey<T extends object, K extends keyof T>(obj: T, key: K): Omit<T, K> {
  return Object.fromEntries(Object.entries(obj).filter(([entry]) => entry !== key)) as Omit<T, K>;
}

describe("close timeline", () => {
  it("reads first damage, attack, and death from turn rows", () => {
    const recording = fakeRecording({
      turns: [
        { ...fakeRecording().turns[0]!, turn: 1, damageDealt: 0, attacksDeclared: 0, creaturesDefeated: 0 },
        {
          ...fakeRecording().turns[0]!,
          turn: 2,
          playerId: "p2",
          damageDealt: 3,
          attacksDeclared: 1,
          creaturesDefeated: 0,
        },
        {
          ...fakeRecording().turns[0]!,
          turn: 5,
          damageDealt: 8,
          attacksDeclared: 1,
          creaturesDefeated: 1,
        },
      ],
    });
    expect(firstDamageTurn(recording)).toBe(2);
    expect(firstAttackTurn(recording)).toBe(2);
    expect(firstDefeatTurn(recording)).toBe(5);
  });

  it("treats a finished wipe without logged deaths as unlogged, not never", () => {
    const recording = fakeRecording({
      livingCreaturesAtEnd: { p1: 1, p2: 0 },
      turns: [
        { ...fakeRecording().turns[0]!, turn: 1, creaturesDefeated: 0, damageDealt: 0 },
      ],
    });
    expect(firstDefeatTurn(recording)).toBeNull();
    expect(defeatCloseKind(recording)).toBe("unlogged");
  });

  it("marks never when both squads are still up", () => {
    const recording = fakeRecording({
      livingCreaturesAtEnd: { p1: 3, p2: 3 },
      winnerId: "p1",
      turns: [{ ...fakeRecording().turns[0]!, creaturesDefeated: 0 }],
    });
    expect(defeatCloseKind(recording)).toBe("never");
  });

  it("sums Energy spent from the recording total or turn fields", () => {
    expect(energySpentOf(fakeRecording({ totalEnergySpent: 12 }))).toBe(12);
    const withTurnAmounts = fakeRecording({
      turns: [
        { ...fakeRecording().turns[0]!, energySpent: 4 },
        { ...fakeRecording().turns[0]!, turn: 2, energySpent: 3 },
      ],
    });
    expect(energySpentOf(omitKey(withTurnAmounts, "totalEnergySpent"))).toBe(7);
    const legacyTurn = omitKey(fakeRecording().turns[0]!, "energySpent");
    expect(
      energySpentOf(omitKey(fakeRecording({ turns: [legacyTurn] }), "totalEnergySpent")),
    ).toBeNull();
  });

  it("averages damage, deaths, and Energy by turn number", () => {
    const series = closeByTurn([
      fakeRecording({
        recordingId: "a",
        matchId: "m-a",
        turns: [
          { ...fakeRecording().turns[0]!, turn: 1, damageDealt: 2, creaturesDefeated: 0, energySpent: 4 },
          { ...fakeRecording().turns[0]!, turn: 2, damageDealt: 6, creaturesDefeated: 1, energySpent: 2 },
        ],
      }),
      fakeRecording({
        recordingId: "b",
        matchId: "m-b",
        turns: [
          { ...fakeRecording().turns[0]!, turn: 1, damageDealt: 0, creaturesDefeated: 0, energySpent: 6 },
        ],
      }),
    ]);
    expect(series[0]).toMatchObject({
      turn: 1,
      meanDamage: 1,
      meanDeaths: 0,
      meanEnergySpent: 5,
      matchCount: 2,
    });
    expect(series[1]).toMatchObject({
      turn: 2,
      meanDamage: 6,
      meanDeaths: 1,
      meanEnergySpent: 2,
      matchCount: 1,
    });
  });

  it("scores first-player wins and deck pairs", () => {
    const a = fakeRecording({
      recordingId: "a",
      matchId: "m-a",
      winnerId: "p1",
      firstPlayerId: "p1",
    });
    const b = fakeRecording({
      recordingId: "b",
      matchId: "m-b",
      winnerId: "p2",
      firstPlayerId: "p1",
      p1DeckName: "Aggro",
      p2DeckName: "Control",
    });
    expect(firstPlayerWon(a)).toBe(true);
    expect(firstPlayerWon(b)).toBe(false);
    expect(deckPairRecords([a, b])).toEqual([
      { pair: "Aggro vs Control", matches: 2, p1Wins: 1, p2Wins: 1 },
    ]);
  });
});
