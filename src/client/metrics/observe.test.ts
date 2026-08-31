import { describe, expect, it } from "vitest";
import { advance, type GameAction } from "@server";
import { COG_DRAFT, TOOLING_ORDER } from "@server/content/cards.js";
import { COGTOOTH } from "@server/content/faces.js";
import {
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withPile,
  withHand,
  withPhase,
} from "@server/testing/scenario.js";
import { applyObservation } from "./observe.js";
import type { ObservationContext } from "./types.js";

const ctx = (nowMs: number, recordingId = "rec-1"): ObservationContext => ({
  nowMs,
  recordingId,
  recordedAs: "local",
  roomCode: null,
  localPlayerId: null,
  p1DeckId: "deck-a",
  p2DeckId: "deck-b",
  p1DeckName: "Aggro",
  p2DeckName: "Control",
});

describe("applyObservation", () => {
  it("opens a recording from the opening state without counting a player action", () => {
    const state = newMatch({ seed: 7 });
    const { recording, abandoned } = applyObservation(
      null,
      { prevState: null, state, action: null, accepted: true, error: null },
      ctx(1_000),
    );

    expect(abandoned).toBeNull();
    expect(recording.matchId).toBe(state.matchId);
    expect(recording.status).toBe("in-progress");
    expect(recording.acceptedActions).toBe(0);
    expect(recording.eventCounts["match-started"]).toBe(1);
    expect(recording.eventCounts["turn-started"]).toBe(1);
    expect(recording.turns.length).toBeGreaterThanOrEqual(1);
    expect(recording.actions).toHaveLength(1);
    expect(recording.actions[0]?.reconstructed).toBe(true);
  });

  it("records think time and action type on ROLL_DICE", () => {
    const start = newMatch({ seed: 7 });
    let { recording } = applyObservation(
      null,
      { prevState: null, state: start, action: null, accepted: true, error: null },
      ctx(1_000),
    );

    const action: GameAction = { type: "ROLL_DICE", playerId: P1 };
    const rolled = advance(start, action);
    expect(rolled.ok).toBe(true);

    recording = applyObservation(
      recording,
      {
        prevState: start,
        state: rolled.state,
        action,
        accepted: true,
        error: null,
      },
      ctx(4_500),
    ).recording;

    const sample = recording.actions[1];
    expect(sample?.actionType).toBe("ROLL_DICE");
    expect(sample?.accepted).toBe(true);
    expect(sample?.deltaMs).toBe(3_500);
    expect(sample?.reconstructed).toBe(false);
    expect(recording.acceptedActions).toBe(1);
    expect(recording.eventCounts["die-rolled"]).toBeGreaterThan(0);
  });

  it("closes a turn on END_TURN and starts the opponent turn", () => {
    const start = newMatch({ seed: 7 });
    let { recording } = applyObservation(
      null,
      { prevState: null, state: start, action: null, accepted: true, error: null },
      ctx(1_000),
    );

    const roll: GameAction = { type: "ROLL_DICE", playerId: P1 };
    const rolled = advance(start, roll);
    expect(rolled.ok).toBe(true);
    recording = applyObservation(
      recording,
      { prevState: start, state: rolled.state, action: roll, accepted: true, error: null },
      ctx(2_000),
    ).recording;

    const end: GameAction = { type: "END_TURN", playerId: P1 };
    const ended = advance(rolled.state, end);
    expect(ended.ok).toBe(true);
    recording = applyObservation(
      recording,
      { prevState: rolled.state, state: ended.state, action: end, accepted: true, error: null },
      ctx(8_000),
    ).recording;

    const first = recording.turns.find((turn) => turn.turn === 1);
    expect(first?.endedAt).not.toBeNull();
    expect(first?.durationMs).toBe(7_000);
    expect(ended.state.turn).toBe(2);
    expect(recording.totalTurns).toBe(2);
  });

  it("counts rejected actions without mutating event totals twice", () => {
    const start = newMatch({ seed: 7 });
    let { recording } = applyObservation(
      null,
      { prevState: null, state: start, action: null, accepted: true, error: null },
      ctx(1_000),
    );
    const eventsBefore = { ...recording.eventCounts };

    const illegal: GameAction = { type: "ROLL_DICE", playerId: P2 };
    const result = advance(start, illegal);
    expect(result.ok).toBe(false);

    recording = applyObservation(
      recording,
      {
        prevState: start,
        state: result.state,
        action: illegal,
        accepted: false,
        error: result.ok ? null : result.error,
      },
      ctx(2_000),
    ).recording;

    expect(recording.rejectedActions).toBe(1);
    expect(recording.acceptedActions).toBe(0);
    expect(recording.eventCounts).toEqual(eventsBefore);
    expect(recording.actions[1]?.accepted).toBe(false);
  });

  it("abandons the previous in-progress recording when matchId changes", () => {
    const first = newMatch({ seed: 1, matchId: "match-a" });
    const second = newMatch({ seed: 2, matchId: "match-b" });
    const opened = applyObservation(
      null,
      { prevState: null, state: first, action: null, accepted: true, error: null },
      ctx(1_000, "rec-a"),
    ).recording;

    const next = applyObservation(
      opened,
      { prevState: first, state: second, action: null, accepted: true, error: null },
      ctx(9_000, "rec-b"),
    );

    expect(next.abandoned?.recordingId).toBe("rec-a");
    expect(next.abandoned?.status).toBe("abandoned");
    expect(next.recording.matchId).toBe("match-b");
    expect(next.recording.recordingId).toBe("rec-b");
    expect(next.recording.status).toBe("in-progress");
  });

  it("counts PLAY_CARD toward effect plays, not forge", () => {
    const start = withPile(withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]), P1, 10);
    let { recording } = applyObservation(
      null,
      { prevState: null, state: start, action: null, accepted: true, error: null },
      ctx(1_000),
    );

    const action: GameAction = {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(start, P1, 0),
    };
    const played = advance(start, action);
    expect(played.ok).toBe(true);

    recording = applyObservation(
      recording,
      { prevState: start, state: played.state, action, accepted: true, error: null },
      ctx(2_000),
    ).recording;

    expect(recording.totalCardsPlayed).toBe(1);
    expect(recording.totalCardsForged).toBe(0);
    expect(recording.cardPlayCounts["Cog Draft (card-cog-draft)"]).toBe(1);
    expect(recording.cardForgeCounts).toEqual({});
    expect(recording.turns.some((turn) => turn.cardsPlayed === 1 && turn.cardsForged === 0)).toBe(
      true,
    );
  });

  it("counts a forged tactic once even when it installs two faces", () => {
    const start = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [TOOLING_ORDER]),
      P1,
      10,
    );
    const dieId = start.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("test: no die");

    let { recording } = applyObservation(
      null,
      { prevState: null, state: start, action: null, accepted: true, error: null },
      ctx(1_000),
    );

    const playAction = {
      type: "PLAY_CARD" as const,
      playerId: P1,
      cardInstanceId: handCardIdAt(start, P1, 0),
    };
    const played = resolveOpenChain(
      (() => {
        const result = advance(start, playAction);
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("play failed");
        return result.state;
      })(),
    );

    const resolveAction = {
      type: "RESOLVE_FORGE_FACES" as const,
      playerId: P1,
      dieId,
      slotIndexes: [3, 4],
      faceCardId: COGTOOTH,
    };
    const forged = advance(played, resolveAction);
    expect(forged.ok).toBe(true);
    if (!forged.ok) return;

    recording = applyObservation(
      recording,
      { prevState: start, state: played, action: playAction, accepted: true, error: null },
      ctx(2_000),
    ).recording;
    recording = applyObservation(
      recording,
      { prevState: played, state: forged.state, action: resolveAction, accepted: true, error: null },
      ctx(3_000),
    ).recording;

    expect(recording.totalCardsPlayed).toBe(1);
    expect(recording.cardPlayCounts["Tooling Order (card-tooling-order)"]).toBe(1);
  });
});
