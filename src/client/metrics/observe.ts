import type { GameAction, GameError, GameState, LoggedEvent } from "@server";
import {
  countByType,
  creatureHpSnapshots,
  eventsSince,
  firstPlayerFromLog,
  incrementCardForges,
  incrementCardPlays,
  isoFromMs,
  livingAndHpByPlayer,
  mergeCounts,
  sumDamage,
  sumField,
  uniqueForgeCardInstanceIds,
  zonesByPlayer,
} from "./snapshot.js";
import { METRICS_SCHEMA_VERSION, SLOW_THINK_MS, STALL_DAMAGE_THRESHOLD } from "./thresholds.js";
import type { ActionSample, MatchRecording, ObservationContext, TurnRecord } from "./types.js";

export interface Observation {
  readonly prevState: GameState | null;
  readonly state: GameState;
  readonly action: GameAction | null;
  readonly accepted: boolean;
  readonly error: GameError | null;
}

type GameEvent = LoggedEvent["event"];

const emptyTurn = (
  turn: number,
  playerId: string,
  startedAt: string | null,
): TurnRecord => ({
  turn,
  playerId,
  startedAt,
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

function applyEventsToTurn(turn: TurnRecord, events: readonly GameEvent[], state: GameState): TurnRecord {
  const damageDealt = turn.damageDealt + sumDamage(events);
  const attacksDeclared =
    turn.attacksDeclared + events.filter((event) => event.type === "attack-declared").length;
  return {
    ...turn,
    damageDealt,
    healAmount: turn.healAmount + sumField(events, "creature-healed", "amount"),
    damagePrevented: turn.damagePrevented + sumField(events, "damage-prevented", "amount"),
    attacksDeclared,
    cardsPlayed: turn.cardsPlayed + events.filter((event) => event.type === "card-played").length,
    cardsDrawn: turn.cardsDrawn + events.filter((event) => event.type === "card-drawn").length,
    forges: turn.forges + events.filter((event) => event.type === "face-forged").length,
    cardsForged: turn.cardsForged,
    absorbs:
      turn.absorbs +
      events.filter((event) => event.type === "symbol-absorbed" || event.type === "symbols-consumed").length,
    ritualActivations:
      turn.ritualActivations + events.filter((event) => event.type === "ritual-activated").length,
    creaturesDefeated:
      turn.creaturesDefeated + events.filter((event) => event.type === "creature-defeated").length,
    pendingDecisionOpens:
      turn.pendingDecisionOpens +
      events.filter((event) => event.type.endsWith("-started") || event.type === "reaction-priority-opened")
        .length,
    reactionWindows:
      turn.reactionWindows + events.filter((event) => event.type === "reaction-priority-opened").length,
    chainLinksAdded:
      turn.chainLinksAdded + events.filter((event) => event.type === "chain-link-added").length,
    stall: damageDealt <= STALL_DAMAGE_THRESHOLD && attacksDeclared === 0,
    hp: creatureHpSnapshots(state),
    zonesByPlayer: zonesByPlayer(state),
  };
}

function closeTurn(turn: TurnRecord, endedAt: string): TurnRecord {
  const startedMs = turn.startedAt !== null ? Date.parse(turn.startedAt) : Number.NaN;
  const endedMs = Date.parse(endedAt);
  return {
    ...turn,
    endedAt,
    durationMs: Number.isFinite(startedMs) ? Math.max(0, endedMs - startedMs) : turn.durationMs,
  };
}

function bumpCount(
  counts: Readonly<Record<string, number>>,
  key: string | null,
): Record<string, number> {
  if (key === null) return { ...counts };
  return { ...counts, [key]: (counts[key] ?? 0) + 1 };
}

export function blankRecording(state: GameState, ctx: ObservationContext): MatchRecording {
  const at = isoFromMs(ctx.nowMs);
  const { living, hp } = livingAndHpByPlayer(state);
  return {
    schemaVersion: METRICS_SCHEMA_VERSION,
    recordingId: ctx.recordingId,
    matchId: state.matchId,
    startedAt: at,
    updatedAt: at,
    endedAt: null,
    status: "in-progress",
    recordedAs: ctx.recordedAs,
    roomCode: ctx.roomCode,
    localPlayerId: ctx.localPlayerId,
    seed: state.rng.seed,
    p1DeckId: ctx.p1DeckId,
    p2DeckId: ctx.p2DeckId,
    p1DeckName: ctx.p1DeckName,
    p2DeckName: ctx.p2DeckName,
    winnerId: state.winner,
    firstPlayerId: firstPlayerFromLog(state),
    totalTurns: state.turn,
    durationMs: 0,
    acceptedActions: 0,
    rejectedActions: 0,
    slowThinkCount: 0,
    stallTurnCount: 0,
    totalDamageDealt: 0,
    totalAttacksDeclared: 0,
    totalCardsPlayed: 0,
    totalCardsForged: 0,
    eventCounts: {},
    cardPlayCounts: {},
    cardForgeCounts: {},
    pendingDecisionCounts: {},
    livingCreaturesAtEnd: living,
    hpRemainingAtEnd: hp,
    turns: [],
    actions: [],
  };
}

export function abandonRecording(recording: MatchRecording, nowMs: number): MatchRecording {
  if (recording.status !== "in-progress") return recording;
  const at = isoFromMs(nowMs);
  return {
    ...recording,
    status: "abandoned",
    updatedAt: at,
    endedAt: recording.endedAt ?? at,
    durationMs: Math.max(0, nowMs - Date.parse(recording.startedAt)),
  };
}

function fold(recording: MatchRecording, observation: Observation, ctx: ObservationContext): MatchRecording {
  const { state, prevState, action, accepted, error } = observation;
  const at = isoFromMs(ctx.nowMs);
  const newEvents = eventsSince(prevState, state).map((entry) => entry.event);
  const lastAction = recording.actions[recording.actions.length - 1];
  const deltaMs = lastAction === undefined ? 0 : Math.max(0, ctx.nowMs - Date.parse(lastAction.at));
  const pending = (prevState ?? state).pendingDecision?.type ?? null;

  const sample: ActionSample = {
    seq: recording.actions.length,
    at,
    deltaMs,
    turn: (prevState ?? state).turn,
    phase: (prevState ?? state).phase,
    playerId: action?.playerId ?? (prevState ?? state).activePlayerId,
    actionType: action?.type ?? null,
    accepted,
    errorCode: error,
    pendingDecisionType: pending,
    chainDepth: (prevState ?? state).chainStack.length,
    eventsAppended: newEvents.length,
    eventTypes: newEvents.map((event) => event.type),
    reconstructed: prevState === null && recording.actions.length === 0,
  };

  const turns = [...recording.turns];
  const stampTurn = (index: number, next: TurnRecord): void => {
    turns[index] = next;
  };

  if (turns.length === 0) {
    const firstTurn = newEvents.find((event) => event.type === "turn-started");
    if (firstTurn?.type === "turn-started") {
      turns.push(emptyTurn(firstTurn.turn, firstTurn.playerId, at));
    } else {
      turns.push(
        emptyTurn(
          (prevState ?? state).turn,
          (prevState ?? state).activePlayerId,
          at,
        ),
      );
    }
  }

  let workingIndex = Math.max(0, turns.length - 1);
  let working = turns[workingIndex];
  if (working === undefined) {
    working = emptyTurn(state.turn, state.activePlayerId, at);
    turns.push(working);
    workingIndex = turns.length - 1;
  }

  if (action !== null) {
    if (accepted) {
      working = { ...working, actionCount: working.actionCount + 1 };
    } else {
      working = { ...working, rejectedCount: working.rejectedCount + 1 };
    }
    stampTurn(workingIndex, working);
  }

  if (accepted) {
    const seenForgeCards = new Set<string>();
    for (const event of newEvents) {
      if (event.type === "turn-started") {
        if (working.endedAt === null && working.turn !== event.turn) {
          working = closeTurn(working, at);
          stampTurn(workingIndex, working);
        }
        const existingIndex = turns.findIndex((turn) => turn.turn === event.turn && turn.endedAt === null);
        if (existingIndex >= 0) {
          workingIndex = existingIndex;
          working = turns[workingIndex] ?? working;
        } else {
          working = emptyTurn(event.turn, event.playerId, at);
          turns.push(working);
          workingIndex = turns.length - 1;
        }
      }

      working = applyEventsToTurn(working, [event], state);
      if (
        event.type === "face-forged" &&
        event.cardInstanceId !== null &&
        !seenForgeCards.has(event.cardInstanceId)
      ) {
        seenForgeCards.add(event.cardInstanceId);
        working = { ...working, cardsForged: working.cardsForged + 1 };
      }
      if (event.type === "turn-ended") {
        working = closeTurn(working, at);
      }
      stampTurn(workingIndex, working);
    }
  }

  if (state.status === "finished") {
    const last = turns[turns.length - 1];
    if (last !== undefined && last.endedAt === null) {
      stampTurn(turns.length - 1, closeTurn(last, at));
    }
  }

  const { living, hp } = livingAndHpByPlayer(state);
  const finished = state.status === "finished";

  return {
    ...recording,
    updatedAt: at,
    endedAt: finished ? at : recording.endedAt,
    status: finished ? "finished" : recording.status,
    winnerId: state.winner,
    firstPlayerId: recording.firstPlayerId ?? firstPlayerFromLog(state),
    totalTurns: Math.max(recording.totalTurns, state.turn),
    durationMs: Math.max(0, ctx.nowMs - Date.parse(recording.startedAt)),
    acceptedActions: recording.acceptedActions + (accepted && action !== null ? 1 : 0),
    rejectedActions: recording.rejectedActions + (accepted ? 0 : 1),
    slowThinkCount: recording.slowThinkCount + (deltaMs >= SLOW_THINK_MS ? 1 : 0),
    stallTurnCount: turns.filter((turn) => turn.stall && turn.endedAt !== null).length,
    totalDamageDealt: recording.totalDamageDealt + (accepted ? sumDamage(newEvents) : 0),
    totalAttacksDeclared:
      recording.totalAttacksDeclared +
      (accepted ? newEvents.filter((event) => event.type === "attack-declared").length : 0),
    totalCardsPlayed:
      recording.totalCardsPlayed +
      (accepted ? newEvents.filter((event) => event.type === "card-played").length : 0),
    totalCardsForged:
      recording.totalCardsForged + (accepted ? uniqueForgeCardInstanceIds(newEvents).length : 0),
    eventCounts: accepted ? mergeCounts(recording.eventCounts, countByType(newEvents)) : recording.eventCounts,
    cardPlayCounts: accepted ? incrementCardPlays(recording.cardPlayCounts, newEvents) : recording.cardPlayCounts,
    cardForgeCounts: accepted
      ? incrementCardForges(recording.cardForgeCounts, newEvents, state)
      : recording.cardForgeCounts,
    pendingDecisionCounts: accepted
      ? bumpCount(recording.pendingDecisionCounts, pending)
      : recording.pendingDecisionCounts,
    livingCreaturesAtEnd: living,
    hpRemainingAtEnd: hp,
    seed: state.rng.seed,
    p1DeckId: ctx.p1DeckId,
    p2DeckId: ctx.p2DeckId,
    p1DeckName: ctx.p1DeckName,
    p2DeckName: ctx.p2DeckName,
    recordedAs: ctx.recordedAs,
    roomCode: ctx.roomCode,
    localPlayerId: ctx.localPlayerId,
    turns,
    actions: [...recording.actions, sample],
  };
}

export function applyObservation(
  recording: MatchRecording | null,
  observation: Observation,
  ctx: ObservationContext,
): { readonly recording: MatchRecording; readonly abandoned: MatchRecording | null } {
  const { state, prevState } = observation;

  if (recording !== null && recording.matchId === state.matchId) {
    return { recording: fold(recording, observation, ctx), abandoned: null };
  }

  const abandoned =
    recording !== null && recording.matchId !== state.matchId
      ? abandonRecording(recording, ctx.nowMs)
      : null;
  const freshCtx =
    recording !== null && recording.matchId !== state.matchId
      ? { ...ctx, recordingId: ctx.recordingId }
      : ctx;
  const created = blankRecording(state, freshCtx);
  const ingestPrev = recording !== null && recording.matchId !== state.matchId ? null : prevState;
  return {
    recording: fold(created, { ...observation, prevState: ingestPrev }, ctx),
    abandoned,
  };
}

export function isMetricsRecording(value: unknown): value is MatchRecording {
  if (typeof value !== "object" || value === null) return false;
  const rec = value as Partial<MatchRecording>;
  return (
    rec.schemaVersion === METRICS_SCHEMA_VERSION &&
    typeof rec.recordingId === "string" &&
    typeof rec.matchId === "string" &&
    typeof rec.startedAt === "string" &&
    Array.isArray(rec.turns) &&
    Array.isArray(rec.actions)
  );
}
