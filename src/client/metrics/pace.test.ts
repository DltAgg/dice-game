import { describe, expect, it } from "vitest";
import { fakeRecording } from "./fixtures.js";
import { matchPace, paceVerdict } from "./pace.js";
import type { TurnRecord } from "./types.js";

const turn = (over: Partial<TurnRecord>): TurnRecord => ({
  turn: 1,
  playerId: "p1",
  startedAt: "2026-08-18T12:00:00.000Z",
  endedAt: "2026-08-18T12:01:00.000Z",
  durationMs: 60_000,
  actionCount: 2,
  rejectedCount: 0,
  damageDealt: 0,
  healAmount: 0,
  damagePrevented: 0,
  attacksDeclared: 0,
  cardsPlayed: 0,
  cardsDrawn: 1,
  forges: 0,
  cardsForged: 0,
  absorbs: 0,
  ritualActivations: 0,
  creaturesDefeated: 0,
  pendingDecisionOpens: 0,
  reactionWindows: 0,
  chainLinksAdded: 0,
  stall: true,
  hp: [],
  zonesByPlayer: {},
  ...over,
});

describe("matchPace", () => {
  it("treats a short active match as on-pace with no overtime", () => {
    const recording = fakeRecording({
      totalTurns: 8,
      turns: [
        turn({ turn: 1, absorbs: 2, stall: true }),
        turn({ turn: 2, absorbs: 1, stall: true }),
        turn({ turn: 3, attacksDeclared: 1, damageDealt: 4, stall: false }),
        turn({ turn: 4, attacksDeclared: 1, damageDealt: 5, stall: false }),
        turn({ turn: 5, attacksDeclared: 1, damageDealt: 6, stall: false }),
        turn({ turn: 6, attacksDeclared: 1, damageDealt: 3, stall: false }),
        turn({ turn: 7, attacksDeclared: 1, damageDealt: 8, stall: false }),
        turn({ turn: 8, attacksDeclared: 1, damageDealt: 9, stall: false }),
      ],
    });
    const pace = matchPace(recording);
    expect(pace.overBaseline).toBe(false);
    expect(pace.overtimeTurns).toBe(0);
    expect(pace.idleTurns).toBe(0);
    expect(pace.dragScore).toBe(0);
    expect(pace.verdict).toBe("on-pace");
  });

  it("scores overtime plus late idle so empty long games drag harder than fighting long games", () => {
    const idleTurns = Array.from({ length: 12 }, (_, index) =>
      turn({ turn: index + 1, stall: true }),
    );
    const empty = matchPace(fakeRecording({ totalTurns: 12, turns: idleTurns }));
    expect(empty.overtimeTurns).toBe(2);
    expect(empty.lateIdleTurns).toBe(10);
    expect(empty.dragScore).toBe(12);
    expect(empty.verdict).toBe("dragging");

    const fightingTurns = Array.from({ length: 12 }, (_, index) =>
      turn({
        turn: index + 1,
        stall: index < 2,
        damageDealt: index < 2 ? 0 : 4,
        attacksDeclared: index < 2 ? 0 : 1,
        absorbs: index < 2 ? 2 : 0,
      }),
    );
    const fight = matchPace(fakeRecording({ totalTurns: 12, turns: fightingTurns }));
    expect(fight.overtimeTurns).toBe(2);
    expect(fight.lateIdleTurns).toBe(0);
    expect(fight.dragScore).toBe(2);
    expect(fight.verdict).toBe("long-active");
  });

  it("calls setup-heavy overtime grinding rather than dragging", () => {
    const turns = Array.from({ length: 14 }, (_, index) =>
      turn({
        turn: index + 1,
        stall: true,
        absorbs: 2,
        cardsPlayed: 1,
        damageDealt: 0,
        attacksDeclared: 0,
      }),
    );
    const pace = matchPace(fakeRecording({ totalTurns: 14, turns }));
    expect(pace.idleTurns).toBe(0);
    expect(pace.setupTurns).toBe(14);
    expect(pace.verdict).toBe("grinding");
  });
});

describe("paceVerdict", () => {
  it("uses 10 turns as the red-flag baseline, not an 11–20 band", () => {
    expect(paceVerdict({ overBaseline: false, lateIdleRate: 0.1, stallRate: 0.2 })).toBe("on-pace");
    expect(paceVerdict({ overBaseline: false, lateIdleRate: 0.5, stallRate: 0.5 })).toBe("empty-early");
    expect(paceVerdict({ overBaseline: true, lateIdleRate: 0.5, stallRate: 0.6 })).toBe("dragging");
    expect(paceVerdict({ overBaseline: true, lateIdleRate: 0.1, stallRate: 0.5 })).toBe("grinding");
    expect(paceVerdict({ overBaseline: true, lateIdleRate: 0.1, stallRate: 0.1 })).toBe("long-active");
  });
});
