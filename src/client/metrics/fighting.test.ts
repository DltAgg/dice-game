import { describe, expect, it } from "vitest";
import type { GameAction, GameEvent, GameState } from "@server";
import { aggregateFighting, fightingInsights } from "./fightingRead.js";
import { emptyFightingTurn, noteFightingAction, noteFightingEvent, noteWhiffs } from "./fighting.js";
import { fakeRecording } from "./fixtures.js";
import type { TurnRecord } from "./types.js";

const turn = (): TurnRecord => ({
  turn: 1,
  playerId: "p1",
  startedAt: null,
  endedAt: null,
  durationMs: null,
  actionCount: 0,
  rejectedCount: 0,
  damageDealt: 0,
  healAmount: 0,
  damagePrevented: 0,
  attacksDeclared: 0,
  cardsPlayed: 0,
  cardsDrawn: 0,
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
});

const state = {
  creatures: {
    ryu: {
      id: "ryu",
      definitionId: "creature-ryu",
      ownerId: "p1",
      position: "frontline",
      defeated: false,
    },
  },
  players: {},
  usedSequenceActionIds: [] as string[],
} as unknown as GameState;

describe("tag-fighter metrics", () => {
  it("counts a Jab as a light starter and a Parry as a chain answer", () => {
    const jab = noteFightingEvent(
      turn(),
      {
        type: "face-used",
        playerId: "p1",
        creatureId: "ryu",
        dieId: "die",
        faceCardId: "face-jab",
      } as GameEvent,
      state,
    );
    expect(jab?.turn.fighting).toMatchObject({ facesUsed: 1, starters: 1, lightHits: 1 });
    expect(jab?.turn.stall).toBe(false);
    expect(jab?.names.Jab).toBe(1);
    expect(jab?.fighters["p1:creature-ryu"]?.facesUsed).toBe(1);

    const parry = noteFightingEvent(
      turn(),
      {
        type: "card-played",
        playerId: "p2",
        cardInstanceId: "inst",
        cardId: "card-parry",
      } as GameEvent,
      state,
    );
    expect(parry?.delta).toMatchObject({ parries: 1, responses: 1 });
    expect(parry?.seats.p2?.parries).toBe(1);

    const ex = noteFightingEvent(
      turn(),
      {
        type: "card-played",
        playerId: "p1",
        cardInstanceId: "inst-ex",
        cardId: "card-crushing-throw",
      } as GameEvent,
      state,
    );
    expect(ex?.delta.exPlays).toBe(1);
  });

  it("counts Ryu's Technique and Seal assist by role and strength", () => {
    const technique = noteFightingEvent(
      turn(),
      {
        type: "technique-used",
        playerId: "p1",
        creatureId: "ryu",
        techniqueId: "technique-ryu-check-fire",
        primaryDieId: "d1",
        secondaryDieId: "d2",
        primaryFaceCardId: "face-focus",
        secondaryFaceCardId: "face-dash",
      } as GameEvent,
      state,
    );
    expect(technique?.turn.fighting).toMatchObject({
      techniquesUsed: 1,
      starters: 1,
      lightHits: 1,
    });
    expect(technique?.names["Check Focus"]).toBe(1);

    const assist = noteFightingEvent(
      turn(),
      { type: "assist-declared", playerId: "p1", reserveCreatureId: "ryu" } as GameEvent,
      state,
    );
    expect(assist?.turn.fighting).toMatchObject({
      assists: 1,
      assistHits: 1,
      finishers: 1,
      mediumHits: 1,
    });
  });

  it("counts Meter, a skipped reroll, an ended sequence, and a starter whiff", () => {
    const gained = noteFightingEvent(
      turn(),
      { type: "meter-changed", playerId: "p1", delta: 4, meter: 4 } as GameEvent,
      state,
    );
    expect(gained?.delta.meterGained).toBe(4);
    expect(gained?.turn.fighting?.meterEnd).toBe(4);

    const spent = noteFightingEvent(
      gained?.turn ?? turn(),
      { type: "meter-changed", playerId: "p2", delta: -2, meter: 1 } as GameEvent,
      state,
    );
    expect(spent?.turn.fighting?.meterGained).toBe(4);
    expect(spent?.turn.fighting?.meterSpent).toBe(2);
    expect(spent?.turn.fighting?.meterEnd).toBe(4);

    const ended = noteFightingAction(
      turn(),
      { type: "END_SEQUENCE", playerId: "p1" } as GameAction,
      "actions",
    );
    expect(ended?.delta.endSequences).toBe(1);

    const skipped = noteFightingAction(
      turn(),
      { type: "ADVANCE_PHASE", playerId: "p1" } as GameAction,
      "roll",
    );
    expect(skipped?.delta.rerollsSkipped).toBe(1);

    const next = {
      ...state,
      usedSequenceActionIds: ["starter-whiff:ryu:1"],
    } as GameState;
    const whiff = noteWhiffs(turn(), state, next);
    expect(whiff?.delta.whiffs).toBe(1);
    expect(noteWhiffs(turn(), next, next)).toBeNull();
  });

  it("flags unspent Meter on a schema 2 sample and ignores schema 1 recordings", () => {
    const fighting = {
      ...emptyFightingTurn(),
      meterGained: 12,
      meterSpent: 1,
      starters: 4,
      endSequences: 4,
    };
    const recorded = fakeRecording({
      fighting,
      fightingBySeat: { p1: fighting },
      eventCounts: { "reaction-priority-opened": 8 },
    });
    const agg = aggregateFighting([recorded]);
    expect(agg.meterSpendRate).toBeCloseTo(1 / 12);
    expect(agg.sequenceMix.Starter).toBe(4);
    const ids = fightingInsights([
      recorded,
      fakeRecording({ schemaVersion: 1, matchId: "old-match" }),
    ]).map((insight) => insight.id);
    expect(ids).toContain("meter-unspent");
    expect(ids).toContain("sequence-bailed");
    expect(fightingInsights([fakeRecording({ schemaVersion: 1 })])).toEqual([]);
  });
});
