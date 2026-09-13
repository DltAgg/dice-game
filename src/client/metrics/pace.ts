import {
  ARMING_TURN_WINDOW,
  BASELINE_TURNS,
  EMPTY_TURN_RATE_FLAG,
  STALL_DAMAGE_THRESHOLD,
} from "./thresholds.js";
import type { MatchRecording, TurnRecord } from "./types.js";

/**
 * No combat close *and* no player-facing action or decision.
 * Draw-for-turn is ignored so automatic draws do not look like play.
 */
export function isIdleTurn(turn: TurnRecord): boolean {
  return (
    turn.damageDealt <= STALL_DAMAGE_THRESHOLD &&
    turn.attacksDeclared === 0 &&
    turn.cardsPlayed === 0 &&
    turn.forges === 0 &&
    (turn.cardsForged ?? 0) === 0 &&
    turn.absorbs === 0 &&
    turn.ritualActivations === 0 &&
    turn.creaturesDefeated === 0 &&
    turn.healAmount === 0 &&
    turn.damagePrevented === 0 &&
    turn.pendingDecisionOpens === 0 &&
    turn.reactionWindows === 0 &&
    turn.chainLinksAdded === 0
  );
}

export function isStallTurn(turn: TurnRecord): boolean {
  return turn.stall || (turn.damageDealt <= STALL_DAMAGE_THRESHOLD && turn.attacksDeclared === 0);
}

export type PaceVerdict = "on-pace" | "empty-early" | "dragging" | "grinding" | "long-active";

export interface MatchPace {
  readonly totalTurns: number;
  /** max(0, turns − 10). Crossing 10 is the red-flag baseline. */
  readonly overtimeTurns: number;
  readonly overBaseline: boolean;
  readonly closedTurns: number;
  readonly stallTurns: number;
  readonly idleTurns: number;
  /** Stall that still had absorbs / plays / forges / decisions (arming). */
  readonly setupTurns: number;
  readonly combatTurns: number;
  readonly lateIdleTurns: number;
  readonly lateStallTurns: number;
  readonly idleRate: number | null;
  readonly stallRate: number | null;
  readonly lateIdleRate: number | null;
  /**
   * Per-match “taking too long” score: overtime past 10 plus idle turns after
   * the arming window. A 12-turn fight with no empty turns scores 2; a 12-turn
   * pass-fest scores much higher.
   */
  readonly dragScore: number;
  readonly verdict: PaceVerdict;
}

function sampledTurns(recording: MatchRecording): readonly TurnRecord[] {
  const closed = recording.turns.filter((turn) => turn.endedAt !== null);
  return closed.length > 0 ? closed : recording.turns;
}

export function paceVerdict(input: {
  readonly overBaseline: boolean;
  readonly lateIdleRate: number | null;
  readonly stallRate: number | null;
}): PaceVerdict {
  const idle = input.lateIdleRate ?? 0;
  const stall = input.stallRate ?? 0;
  if (!input.overBaseline) {
    return idle >= EMPTY_TURN_RATE_FLAG ? "empty-early" : "on-pace";
  }
  if (idle >= EMPTY_TURN_RATE_FLAG) return "dragging";
  if (stall >= EMPTY_TURN_RATE_FLAG) return "grinding";
  return "long-active";
}

export function matchPace(recording: MatchRecording): MatchPace {
  const turns = sampledTurns(recording);
  const totalTurns = Math.max(recording.totalTurns, turns.length);
  const overtimeTurns = Math.max(0, totalTurns - BASELINE_TURNS);
  const stallTurns = turns.filter(isStallTurn).length;
  const idleTurns = turns.filter(isIdleTurn).length;
  const setupTurns = turns.filter((turn) => isStallTurn(turn) && !isIdleTurn(turn)).length;
  const combatTurns = turns.filter((turn) => !isStallTurn(turn)).length;
  const late = turns.filter((turn) => turn.turn > ARMING_TURN_WINDOW);
  const lateIdleTurns = late.filter(isIdleTurn).length;
  const lateStallTurns = late.filter(isStallTurn).length;
  const closedTurns = turns.length;
  const idleRate = closedTurns === 0 ? null : idleTurns / closedTurns;
  const stallRate = closedTurns === 0 ? null : stallTurns / closedTurns;
  const lateIdleRate = late.length === 0 ? null : lateIdleTurns / late.length;
  const overBaseline = totalTurns > BASELINE_TURNS;
  const dragScore = overtimeTurns + lateIdleTurns;

  return {
    totalTurns,
    overtimeTurns,
    overBaseline,
    closedTurns,
    stallTurns,
    idleTurns,
    setupTurns,
    combatTurns,
    lateIdleTurns,
    lateStallTurns,
    idleRate,
    stallRate,
    lateIdleRate,
    dragScore,
    verdict: paceVerdict({ overBaseline, lateIdleRate, stallRate }),
  };
}

export function turnKind(turn: TurnRecord): "combat" | "setup" | "idle" {
  if (isIdleTurn(turn)) return "idle";
  if (isStallTurn(turn)) return "setup";
  return "combat";
}
