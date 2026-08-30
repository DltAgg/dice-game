import {
  closeByTurn,
  deckPairRecords,
  defeatCloseKind,
  firstAttackTurn,
  firstDamageTurn,
  firstDefeatTurn,
  firstPlayerWon,
  type CloseTurnPoint,
  type DeckPairRecord,
} from "./close.js";
import {
  ARMING_TURN_WINDOW,
  BASELINE_TURNS,
  DRAG_SCORE_HIGH,
  DRAG_SCORE_WARN,
  FIRST_DEATH_EARLY_TURN,
  FIRST_DEATH_LATE_TURN,
  FIRST_PLAYER_WIN_BIAS,
  FIRST_PLAYER_WIN_MIN_N,
  LOW_LETHALITY_DAMAGE_PER_TURN,
} from "./thresholds.js";
import { matchPace, type MatchPace, type PaceVerdict } from "./pace.js";
import { forgeCardCountOf, forgeCardsOnTurn, mean, median, pearsonCorrelation, percentile } from "./snapshot.js";
import type { MatchRecording } from "./types.js";

export interface PlayForgeRatePoint {
  readonly recordingId: string;
  readonly matchId: string;
  readonly effectPerTurn: number;
  readonly forgePerTurn: number;
  readonly totalTurns: number;
}

export interface PlayForgeTurnPoint {
  readonly turn: number;
  readonly meanEffect: number;
  readonly meanForge: number;
  readonly matchCount: number;
}

export type InsightSeverity = "info" | "warn" | "high";

export interface Insight {
  readonly id: string;
  readonly severity: InsightSeverity;
  readonly title: string;
  readonly detail: string;
  readonly evidence: Readonly<Record<string, number | string | null>>;
}

export function dedupeRecordings(recordings: readonly MatchRecording[]): MatchRecording[] {
  const byMatch = new Map<string, MatchRecording>();
  for (const recording of recordings) {
    const existing = byMatch.get(recording.matchId);
    if (existing === undefined || recording.actions.length >= existing.actions.length) {
      byMatch.set(recording.matchId, recording);
    }
  }
  return [...byMatch.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function decidedMatches(recordings: readonly MatchRecording[]): MatchRecording[] {
  return dedupeRecordings(recordings).filter((recording) => recording.status === "finished");
}

function histogram(values: readonly number[], bucket: (value: number) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const key = bucket(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function mixFromRecords(
  recordings: readonly MatchRecording[],
  pick: (recording: MatchRecording) => Readonly<Record<string, number>>,
): Record<string, number> {
  const mix: Record<string, number> = {};
  for (const recording of recordings) {
    for (const [key, value] of Object.entries(pick(recording))) {
      mix[key] = (mix[key] ?? 0) + value;
    }
  }
  return mix;
}

function actionTypeMix(recordings: readonly MatchRecording[]): Record<string, number> {
  const mix: Record<string, number> = {};
  for (const recording of recordings) {
    for (const sample of recording.actions) {
      if (!sample.accepted) {
        mix["(rejected)"] = (mix["(rejected)"] ?? 0) + 1;
        continue;
      }
      const key = sample.actionType ?? "(state-tick)";
      mix[key] = (mix[key] ?? 0) + 1;
    }
  }
  return mix;
}

function thinkTimes(recordings: readonly MatchRecording[]): number[] {
  const times: number[] = [];
  for (const recording of recordings) {
    for (const sample of recording.actions) {
      if (sample.deltaMs > 0 && !sample.reconstructed) times.push(sample.deltaMs);
    }
  }
  return times;
}

function playForgeRatePoints(recordings: readonly MatchRecording[]): PlayForgeRatePoint[] {
  const points: PlayForgeRatePoint[] = [];
  for (const recording of recordings) {
    if (recording.totalTurns <= 0) continue;
    points.push({
      recordingId: recording.recordingId,
      matchId: recording.matchId,
      effectPerTurn: recording.totalCardsPlayed / recording.totalTurns,
      forgePerTurn: forgeCardCountOf(recording) / recording.totalTurns,
      totalTurns: recording.totalTurns,
    });
  }
  return points;
}

function playForgeByTurn(recordings: readonly MatchRecording[]): PlayForgeTurnPoint[] {
  const byTurn = new Map<number, { effect: number; forge: number; n: number }>();
  for (const recording of recordings) {
    for (const row of recording.turns) {
      const bucket = byTurn.get(row.turn) ?? { effect: 0, forge: 0, n: 0 };
      bucket.effect += row.cardsPlayed;
      bucket.forge += forgeCardsOnTurn(row, recording);
      bucket.n += 1;
      byTurn.set(row.turn, bucket);
    }
  }
  return [...byTurn.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([turn, bucket]) => ({
      turn,
      meanEffect: bucket.effect / bucket.n,
      meanForge: bucket.forge / bucket.n,
      matchCount: bucket.n,
    }));
}

function firstDefeatHistogram(recordings: readonly MatchRecording[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const recording of recordings) {
    const kind = defeatCloseKind(recording);
    const turn = firstDefeatTurn(recording);
    const key =
      kind === "never"
        ? "never"
        : kind === "unlogged"
          ? "close, turn unknown"
          : turn !== null && turn <= FIRST_DEATH_EARLY_TURN
            ? `1–${String(FIRST_DEATH_EARLY_TURN)} early`
            : turn !== null && turn <= FIRST_DEATH_LATE_TURN
              ? `${String(FIRST_DEATH_EARLY_TURN + 1)}–${String(FIRST_DEATH_LATE_TURN)}`
              : `${String(FIRST_DEATH_LATE_TURN + 1)}+ overtime`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function mixFromCloseSeries(
  series: readonly CloseTurnPoint[],
  pick: (point: CloseTurnPoint) => number | null,
): Record<string, number> {
  const mix: Record<string, number> = {};
  for (const point of series) {
    const value = pick(point);
    if (value === null) continue;
    mix[`T${String(point.turn)}`] = Number(value.toFixed(2));
  }
  return mix;
}

function thinkTimesByAction(recordings: readonly MatchRecording[]): Record<string, number[]> {
  const byType: Record<string, number[]> = {};
  for (const recording of recordings) {
    for (const sample of recording.actions) {
      if (sample.deltaMs <= 0 || sample.reconstructed || sample.actionType === null) continue;
      const list = byType[sample.actionType] ?? [];
      list.push(sample.deltaMs);
      byType[sample.actionType] = list;
    }
  }
  return byType;
}

export interface MetricsAggregates {
  readonly matchCount: number;
  readonly finishedCount: number;
  readonly abandonedCount: number;
  readonly inProgressCount: number;
  readonly meanTurns: number | null;
  readonly medianTurns: number | null;
  readonly pctOverBaseline: number | null;
  readonly medianDragScore: number | null;
  readonly meanIdleRate: number | null;
  readonly meanLateIdleRate: number | null;
  readonly medianDurationMs: number | null;
  readonly meanDamagePerTurn: number | null;
  readonly medianThinkMs: number | null;
  readonly p90ThinkMs: number | null;
  readonly stallTurnRate: number | null;
  readonly verdictMix: Readonly<Record<PaceVerdict, number>>;
  readonly finishedDragScores: readonly number[];
  readonly finishedPaces: readonly MatchPace[];
  readonly rejectRate: number | null;
  readonly turnHistogram: Readonly<Record<string, number>>;
  readonly durationHistogram: Readonly<Record<string, number>>;
  readonly actionMix: Readonly<Record<string, number>>;
  readonly eventMix: Readonly<Record<string, number>>;
  readonly pendingMix: Readonly<Record<string, number>>;
  readonly cardPlayMix: Readonly<Record<string, number>>;
  readonly cardForgeMix: Readonly<Record<string, number>>;
  readonly playVsForgeMix: Readonly<Record<string, number>>;
  readonly playForgeRates: readonly PlayForgeRatePoint[];
  readonly playForgeByTurn: readonly PlayForgeTurnPoint[];
  readonly playForgeCorrelation: number | null;
  readonly meanEffectPerTurn: number | null;
  readonly meanForgePerTurn: number | null;
  readonly totalCardsPlayed: number;
  readonly totalCardsForged: number;
  readonly medianFirstDamageTurn: number | null;
  readonly medianFirstAttackTurn: number | null;
  readonly medianFirstDefeatTurn: number | null;
  readonly pctNeverDefeat: number | null;
  readonly firstDefeatHistogram: Readonly<Record<string, number>>;
  readonly closeByTurn: readonly CloseTurnPoint[];
  readonly deathsByTurnMix: Readonly<Record<string, number>>;
  readonly firstPlayerWinRate: number | null;
  readonly firstPlayerDecided: number;
  readonly firstPlayerWinMix: Readonly<Record<string, number>>;
  readonly p1WinRate: number | null;
  readonly deckPairs: readonly DeckPairRecord[];
  readonly deckPairMix: Readonly<Record<string, number>>;
  readonly thinkByAction: Readonly<
    Record<string, { readonly n: number; readonly p50: number | null; readonly p90: number | null }>
  >;
  readonly finishedTurns: readonly number[];
  readonly finishedDamagePerTurn: readonly number[];
}

export function aggregateRecordings(recordings: readonly MatchRecording[]): MetricsAggregates {
  const unique = dedupeRecordings(recordings);
  const finished = unique.filter((recording) => recording.status === "finished");
  const turns = finished.map((recording) => recording.totalTurns);
  const durations = unique
    .filter((recording) => recording.durationMs > 0)
    .map((recording) => recording.durationMs);
  const damagePerTurn = finished.map((recording) =>
    recording.totalTurns > 0 ? recording.totalDamageDealt / recording.totalTurns : 0,
  );
  const thinks = thinkTimes(unique).sort((a, b) => a - b);
  const paces = unique.map(matchPace);
  const finishedPaces = finished.map(matchPace);
  const overBaseline = finishedPaces.filter((pace) => pace.overBaseline).length;
  const dragScores = finishedPaces.map((pace) => pace.dragScore);
  const idleRates = paces.flatMap((pace) => (pace.idleRate === null ? [] : [pace.idleRate]));
  const lateIdleRates = paces.flatMap((pace) =>
    pace.lateIdleRate === null ? [] : [pace.lateIdleRate],
  );
  const verdictMix: Record<PaceVerdict, number> = {
    "on-pace": 0,
    "empty-early": 0,
    dragging: 0,
    grinding: 0,
    "long-active": 0,
  };
  for (const pace of finishedPaces) {
    verdictMix[pace.verdict] += 1;
  }

  const stallTurns = paces.reduce((sum, pace) => sum + pace.stallTurns, 0);
  const closedTurns = paces.reduce((sum, pace) => sum + pace.closedTurns, 0);
  const accepted = unique.reduce((sum, recording) => sum + recording.acceptedActions, 0);
  const rejected = unique.reduce((sum, recording) => sum + recording.rejectedActions, 0);

  const thinkByActionRaw = thinkTimesByAction(unique);
  const thinkByAction: Record<
    string,
    { readonly n: number; readonly p50: number | null; readonly p90: number | null }
  > = {};
  for (const [actionType, values] of Object.entries(thinkByActionRaw)) {
    const sorted = [...values].sort((a, b) => a - b);
    thinkByAction[actionType] = {
      n: sorted.length,
      p50: percentile(sorted, 50),
      p90: percentile(sorted, 90),
    };
  }

  const playForgeRates = playForgeRatePoints(unique);
  const playForgeByTurnSeries = playForgeByTurn(unique);
  const firstDamageTurns = finished
    .map(firstDamageTurn)
    .filter((turn): turn is number => turn !== null);
  const firstAttackTurns = finished
    .map(firstAttackTurn)
    .filter((turn): turn is number => turn !== null);
  const firstDefeatTurns = finished.map(firstDefeatTurn);
  const defeatTurnsKnown = firstDefeatTurns.filter((turn): turn is number => turn !== null);
  const neverDefeat = finished.filter((recording) => defeatCloseKind(recording) === "never").length;
  const firstPlayerResults = finished
    .map(firstPlayerWon)
    .filter((won): won is boolean => won !== null);
  const firstPlayerWins = firstPlayerResults.filter((won) => won).length;
  const p1Wins = finished.filter((recording) => recording.winnerId === "p1").length;
  const p2Wins = finished.filter((recording) => recording.winnerId === "p2").length;
  const decidedWinners = p1Wins + p2Wins;
  const closeSeries = closeByTurn(unique);
  const pairs = deckPairRecords(finished);
  const firstPlayerDecided = firstPlayerResults.length;

  return {
    matchCount: unique.length,
    finishedCount: finished.length,
    abandonedCount: unique.filter((recording) => recording.status === "abandoned").length,
    inProgressCount: unique.filter((recording) => recording.status === "in-progress").length,
    meanTurns: mean(turns),
    medianTurns: median(turns),
    pctOverBaseline: finished.length === 0 ? null : (overBaseline / finished.length) * 100,
    medianDragScore: median(dragScores),
    meanIdleRate: mean(idleRates),
    meanLateIdleRate: mean(lateIdleRates),
    medianDurationMs: median(durations),
    meanDamagePerTurn: mean(damagePerTurn),
    medianThinkMs: median(thinks),
    p90ThinkMs: percentile(thinks, 90),
    stallTurnRate: closedTurns === 0 ? null : stallTurns / closedTurns,
    rejectRate: accepted + rejected === 0 ? null : rejected / (accepted + rejected),
    turnHistogram: histogram(turns, (value) => {
      if (value <= 5) return "1–5";
      if (value <= BASELINE_TURNS) return `6–${String(BASELINE_TURNS)}`;
      if (value <= 15) return "11–15 overtime";
      if (value <= 25) return "16–25 overtime";
      return "26+ overtime";
    }),
    durationHistogram: histogram(durations, (value) => {
      const minutes = value / 60_000;
      if (minutes < 5) return "<5m";
      if (minutes < 10) return "5–10m";
      if (minutes < 20) return "10–20m";
      if (minutes < 40) return "20–40m";
      return "40m+";
    }),
    actionMix: actionTypeMix(unique),
    eventMix: mixFromRecords(unique, (recording) => recording.eventCounts),
    pendingMix: mixFromRecords(unique, (recording) => recording.pendingDecisionCounts),
    cardPlayMix: mixFromRecords(unique, (recording) => recording.cardPlayCounts ?? {}),
    cardForgeMix: mixFromRecords(unique, (recording) => recording.cardForgeCounts ?? {}),
    playVsForgeMix: {
      "Played (effect)": unique.reduce((sum, recording) => sum + recording.totalCardsPlayed, 0),
      "Played (forge)": unique.reduce((sum, recording) => sum + forgeCardCountOf(recording), 0),
    },
    playForgeRates,
    playForgeByTurn: playForgeByTurnSeries,
    playForgeCorrelation: pearsonCorrelation(
      playForgeRates.map((point) => point.effectPerTurn),
      playForgeRates.map((point) => point.forgePerTurn),
    ),
    meanEffectPerTurn: mean(playForgeRates.map((point) => point.effectPerTurn)),
    meanForgePerTurn: mean(playForgeRates.map((point) => point.forgePerTurn)),
    totalCardsPlayed: unique.reduce((sum, recording) => sum + recording.totalCardsPlayed, 0),
    totalCardsForged: unique.reduce((sum, recording) => sum + forgeCardCountOf(recording), 0),
    medianFirstDamageTurn: median(firstDamageTurns),
    medianFirstAttackTurn: median(firstAttackTurns),
    medianFirstDefeatTurn: median(defeatTurnsKnown),
    pctNeverDefeat: finished.length === 0 ? null : (neverDefeat / finished.length) * 100,
    firstDefeatHistogram: firstDefeatHistogram(finished),
    closeByTurn: closeSeries,
    deathsByTurnMix: mixFromCloseSeries(closeSeries, (point) => point.meanDeaths),
    firstPlayerWinRate: firstPlayerDecided === 0 ? null : firstPlayerWins / firstPlayerDecided,
    firstPlayerDecided,
    firstPlayerWinMix: {
      "First player won": firstPlayerWins,
      "Second player won": firstPlayerDecided - firstPlayerWins,
    },
    p1WinRate: decidedWinners === 0 ? null : p1Wins / decidedWinners,
    deckPairs: pairs,
    deckPairMix: Object.fromEntries(
      pairs.map((pair) => [
        `${pair.pair} (p1 ${String(pair.p1Wins)}/${String(pair.matches)})`,
        pair.matches,
      ]),
    ),
    thinkByAction,
    verdictMix,
    finishedTurns: turns,
    finishedDamagePerTurn: damagePerTurn,
    finishedDragScores: dragScores,
    finishedPaces,
  };
}

export function insightsFor(recordings: readonly MatchRecording[]): Insight[] {
  const unique = dedupeRecordings(recordings);
  const finished = unique.filter((recording) => recording.status === "finished");
  const agg = aggregateRecordings(unique);
  const insights: Insight[] = [];

  if (finished.length === 0) {
    insights.push({
      id: "insufficient-finished",
      severity: "info",
      title: "Not enough finished matches yet",
      detail:
        "Play a few games to completion (hotseat or host). Abandoned and in-progress recordings still count toward think-time charts.",
      evidence: { recorded: unique.length, finished: 0 },
    });
  }

  if (agg.pctOverBaseline !== null && agg.pctOverBaseline >= 50) {
    const dragging = agg.verdictMix.dragging;
    const grinding = agg.verdictMix.grinding;
    const longActive = agg.verdictMix["long-active"];
    insights.push({
      id: "often-over-baseline",
      severity: "high",
      title: `Most finished matches run past ${String(BASELINE_TURNS)} turns`,
      detail: `${agg.pctOverBaseline.toFixed(0)}% of finished matches exceed the ${String(BASELINE_TURNS)}-turn baseline. Median drag (overtime + idle after arming) is ${agg.medianDragScore?.toFixed(1) ?? "—"}. Breakdown: ${String(dragging)} dragging (empty overtime), ${String(grinding)} grinding (setup/stall, no close), ${String(longActive)} long-active (combat happening, still too many turns).`,
      evidence: {
        pctOverBaseline: Number(agg.pctOverBaseline.toFixed(1)),
        medianDragScore: agg.medianDragScore,
        medianTurns: agg.medianTurns,
        dragging,
        grinding,
        longActive,
        finished: finished.length,
      },
    });
  }

  if (agg.medianDragScore !== null && agg.medianDragScore >= DRAG_SCORE_WARN) {
    const idlePct = agg.meanLateIdleRate === null ? null : Number((agg.meanLateIdleRate * 100).toFixed(0));
    insights.push({
      id: "high-drag",
      severity: agg.medianDragScore >= DRAG_SCORE_HIGH ? "high" : "warn",
      title: "Drag score says extra turns are not converting into a close",
      detail: `Median drag is ${agg.medianDragScore.toFixed(1)} (overtime past ${String(BASELINE_TURNS)} plus idle turns after the first ${String(ARMING_TURN_WINDOW)} arming turns). Late idle rate ${idlePct === null ? "—" : `${String(idlePct)}%`}. High drag with high idle = pass-fests; high drag with low idle = the board fights but cannot finish.`,
      evidence: {
        medianDragScore: Number(agg.medianDragScore.toFixed(1)),
        meanLateIdleRate: idlePct,
      },
    });
  }

  if (agg.meanDamagePerTurn !== null && agg.meanDamagePerTurn < LOW_LETHALITY_DAMAGE_PER_TURN) {
    insights.push({
      id: "low-lethality",
      severity: "high",
      title: "Low lethality — matches may not be able to close",
      detail: `Mean HP damage per turn is ${agg.meanDamagePerTurn.toFixed(2)} (flag below ${String(LOW_LETHALITY_DAMAGE_PER_TURN)}). Check absorb-to-attack delay, prevent/shield, and attack fueling — first turns are expected to arm rather than swing.`,
      evidence: { meanDamagePerTurn: Number(agg.meanDamagePerTurn.toFixed(2)) },
    });
  }

  if (agg.stallTurnRate !== null && agg.stallTurnRate >= 0.35) {
    insights.push({
      id: "stall-turns",
      severity: "warn",
      title: "Many turns deal no damage and declare no attacks",
      detail: `${(agg.stallTurnRate * 100).toFixed(0)}% of closed turns are stalls. Split stall into idle (roll/pass, no decisions) vs setup (absorb/play/forge without attacking). Setup on turns 1–2 is expected; idle after that is empty length.`,
      evidence: { stallTurnRate: Number((agg.stallTurnRate * 100).toFixed(1)) },
    });
  }

  if (
    agg.medianFirstDefeatTurn !== null &&
    agg.medianFirstDefeatTurn <= FIRST_DEATH_EARLY_TURN &&
    (agg.firstDefeatHistogram[`1–${String(FIRST_DEATH_EARLY_TURN)} early`] ?? 0) >= 2
  ) {
    insights.push({
      id: "early-first-death",
      severity: "warn",
      title: "Creatures die in the opening",
      detail: `Median first creature death is turn ${agg.medianFirstDefeatTurn.toFixed(1)} (flag on or before turn ${String(FIRST_DEATH_EARLY_TURN)}). Bible §45 cares about this: if squad members vanish before the dice engine comes online, the three-creature skirmish is not happening.`,
      evidence: {
        medianFirstDefeatTurn: Number(agg.medianFirstDefeatTurn.toFixed(1)),
        medianFirstDamageTurn: agg.medianFirstDamageTurn,
        medianFirstAttackTurn: agg.medianFirstAttackTurn,
      },
    });
  }

  if (
    finished.length >= 2 &&
    ((agg.medianFirstDefeatTurn !== null && agg.medianFirstDefeatTurn > FIRST_DEATH_LATE_TURN) ||
      (agg.pctNeverDefeat !== null && agg.pctNeverDefeat >= 40))
  ) {
    insights.push({
      id: "late-first-death",
      severity: "warn",
      title: "The board is slow to take a creature off",
      detail: `Median first death is ${agg.medianFirstDefeatTurn?.toFixed(1) ?? "—"} (after turn ${String(FIRST_DEATH_LATE_TURN)} is late). ${agg.pctNeverDefeat?.toFixed(0) ?? "—"}% of finished matches never logged a defeat. Pair with damage per turn and play/forge mix to see whether the board is failing to convert setup into kills.`,
      evidence: {
        medianFirstDefeatTurn: agg.medianFirstDefeatTurn,
        pctNeverDefeat: agg.pctNeverDefeat === null ? null : Number(agg.pctNeverDefeat.toFixed(1)),
        meanDamagePerTurn:
          agg.meanDamagePerTurn === null ? null : Number(agg.meanDamagePerTurn.toFixed(2)),
      },
    });
  }

  if (
    agg.firstPlayerWinRate !== null &&
    agg.firstPlayerDecided >= FIRST_PLAYER_WIN_MIN_N &&
    (agg.firstPlayerWinRate >= FIRST_PLAYER_WIN_BIAS ||
      agg.firstPlayerWinRate <= 1 - FIRST_PLAYER_WIN_BIAS)
  ) {
    insights.push({
      id: "first-player-bias",
      severity: "info",
      title: "Opening seat is winning more than a coin flip",
      detail: `First player won ${(agg.firstPlayerWinRate * 100).toFixed(0)}% of ${String(agg.firstPlayerDecided)} finished matches with a known opener. Seat win rate is not pace, but a 70/30 split will pollute every other balance read.`,
      evidence: {
        firstPlayerWinRate: Number((agg.firstPlayerWinRate * 100).toFixed(1)),
        n: agg.firstPlayerDecided,
        p1WinRate: agg.p1WinRate === null ? null : Number((agg.p1WinRate * 100).toFixed(1)),
      },
    });
  }

  const reactionWindows = agg.eventMix["reaction-priority-opened"] ?? 0;
  const accepted = Object.entries(agg.actionMix).reduce((sum, [key, count]) => {
    return key === "(rejected)" ? sum : sum + count;
  }, 0);
  if (accepted > 0 && reactionWindows / Math.max(1, finished.length || unique.length) >= 8) {
    insights.push({
      id: "reaction-heavy",
      severity: "warn",
      title: "Reaction windows are frequent",
      detail: `${String(reactionWindows)} reaction-priority openings across ${String(unique.length)} matches. Each window is extra think time and Pass spam — a common source of “the game feels slow” even when turns are few.`,
      evidence: { reactionWindows, matches: unique.length },
    });
  }

  const pendingTotal = Object.values(agg.pendingMix).reduce((sum, count) => sum + count, 0);
  if (pendingTotal > accepted * 0.4 && accepted > 20) {
    insights.push({
      id: "decision-heavy",
      severity: "info",
      title: "Pending decisions are a large share of clicks",
      detail:
        "Search / discard / choose / forge-faces prompts add dwell. If p90 think time spikes on RESOLVE_* actions, the friction is UX or too many mandatory choices, not combat math.",
      evidence: { pendingSamples: pendingTotal, acceptedActions: accepted },
    });
  }

  if (agg.p90ThinkMs !== null && agg.p90ThinkMs >= 20_000) {
    insights.push({
      id: "slow-think",
      severity: "warn",
      title: "p90 time-between-actions is over 20s",
      detail:
        "Wall-clock gaps include reading the board, reaction Pass, and network on guests. Compare think-by-action: END_TURN vs ATTACK vs pending resolves. Host recordings are the better clock for online.",
      evidence: { p90ThinkMs: Math.round(agg.p90ThinkMs), medianThinkMs: agg.medianThinkMs === null ? null : Math.round(agg.medianThinkMs) },
    });
  }

  if (agg.rejectRate !== null && agg.rejectRate >= 0.15) {
    insights.push({
      id: "illegal-friction",
      severity: "info",
      title: "High illegal-action rate",
      detail: `${(agg.rejectRate * 100).toFixed(0)}% of recorded attempts were rejected. That is UI affordance / seat-gating noise, not rules duration — but it still makes the table feel sticky.`,
      evidence: { rejectRate: Number((agg.rejectRate * 100).toFixed(1)) },
    });
  }

  if (insights.length === 0 && finished.length > 0) {
    insights.push({
      id: "no-red-flags",
      severity: "info",
      title: "No threshold flags on this sample",
      detail: `Median finished length is ${agg.medianTurns?.toFixed(1) ?? "?"} turns. Compare individual matches in the table if a session still felt slow.`,
      evidence: { medianTurns: agg.medianTurns, finished: finished.length },
    });
  }

  return insights;
}
