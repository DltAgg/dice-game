import type { Insight } from "./insights.js";
import { emptyFightingCounts, hasFightingSample, turnHits } from "./fighting.js";
import type { FightingCounts, MatchRecording } from "./types.js";

export function firstSequenceTurn(recording: MatchRecording): number | null {
  const found = [...recording.turns]
    .sort((left, right) => left.turn - right.turn)
    .find((turn) => (turnHits(turn) ?? 0) > 0);
  return found === undefined ? null : found.turn;
}

function dedupe(recordings: readonly MatchRecording[]): MatchRecording[] {
  const byMatch = new Map<string, MatchRecording>();
  for (const recording of recordings) {
    const existing = byMatch.get(recording.matchId);
    if (existing === undefined || recording.actions.length >= existing.actions.length) {
      byMatch.set(recording.matchId, recording);
    }
  }
  return [...byMatch.values()];
}

export interface FightingAggregates {
  readonly sampledMatches: number;
  readonly finishedSampled: number;
  readonly starters: number;
  readonly extenders: number;
  readonly finishers: number;
  readonly endSequences: number;
  readonly assists: number;
  readonly assistHits: number;
  readonly tags: number;
  readonly rerolls: number;
  readonly rerollsSkipped: number;
  readonly meterGained: number;
  readonly meterSpent: number;
  readonly meterSpendRate: number | null;
  readonly counters: number;
  readonly parries: number;
  readonly braces: number;
  readonly exPlays: number;
  readonly shifts: number;
  readonly whiffs: number;
  readonly koSwaps: number;
  readonly movesets: number;
  readonly reactionWindows: number;
  readonly defenseAnswers: number;
  readonly defenseAnswerRate: number | null;
  readonly meanHitsPerTurn: number | null;
  readonly meanTagsPerMatch: number | null;
  readonly meanAssistsPerMatch: number | null;
  readonly sequenceMix: Readonly<Record<string, number>>;
  readonly strengthMix: Readonly<Record<string, number>>;
  readonly commitmentMix: Readonly<Record<string, number>>;
  readonly defenseMix: Readonly<Record<string, number>>;
  readonly hitNames: Readonly<Record<string, number>>;
  readonly fighterMix: Readonly<Record<string, number>>;
  readonly rejectionMix: Readonly<Record<string, number>>;
  readonly seatMix: Readonly<Record<string, number>>;
}

export function aggregateFighting(recordings: readonly MatchRecording[]): FightingAggregates {
  const sample = dedupe(recordings).filter(hasFightingSample);
  const finished = sample.filter((recording) => recording.status === "finished");
  const sum = (pick: (counts: FightingCounts) => number): number =>
    sample.reduce((total, recording) => total + pick(recording.fighting ?? emptyFightingCounts()), 0);
  const starters = sum((counts) => counts.starters);
  const extenders = sum((counts) => counts.extenders);
  const finishers = sum((counts) => counts.finishers);
  const assists = sum((counts) => counts.assists);
  const tags = sum((counts) => counts.tags);
  const meterGained = sum((counts) => counts.meterGained);
  const meterSpent = sum((counts) => counts.meterSpent);
  const counters = sum((counts) => counts.counters);
  const parries = sum((counts) => counts.parries);
  const braces = sum((counts) => counts.braces);
  const shifts = sum((counts) => counts.shifts);
  const defenseAnswers = counters + parries + braces + shifts;
  const reactionWindows = sample.reduce(
    (total, recording) => total + (recording.eventCounts["reaction-priority-opened"] ?? 0),
    0,
  );
  const turns = sample.reduce((total, recording) => total + Math.max(recording.totalTurns, 1), 0);
  const hits = sample.reduce(
    (total, recording) =>
      total +
      (recording.fighting?.facesUsed ?? 0) +
      (recording.fighting?.techniquesUsed ?? 0) +
      (recording.fighting?.assistHits ?? 0),
    0,
  );
  const hitNames: Record<string, number> = {};
  const fighterMix: Record<string, number> = {};
  const rejectionMix: Record<string, number> = {};
  const seatMix: Record<string, number> = {};
  for (const recording of sample) {
    for (const [name, count] of Object.entries(recording.hitNames ?? {})) {
      hitNames[name] = (hitNames[name] ?? 0) + count;
    }
    for (const [code, count] of Object.entries(recording.rejectionCounts ?? {})) {
      rejectionMix[code] = (rejectionMix[code] ?? 0) + count;
    }
    for (const row of Object.values(recording.fighterActivity ?? {})) {
      const actions = row.facesUsed + row.techniquesUsed + row.assists + row.tagsIn;
      const label = `${row.name} (${row.ownerId}) · dmg ${String(row.damageTaken)}`;
      fighterMix[label] = (fighterMix[label] ?? 0) + actions;
    }
    for (const [seat, counts] of Object.entries(recording.fightingBySeat ?? {})) {
      const label = `${seat} hits`;
      seatMix[label] =
        (seatMix[label] ?? 0) + counts.facesUsed + counts.techniquesUsed + counts.assistHits;
      seatMix[`${seat} meter spent`] = (seatMix[`${seat} meter spent`] ?? 0) + counts.meterSpent;
      seatMix[`${seat} tags`] = (seatMix[`${seat} tags`] ?? 0) + counts.tags;
    }
  }
  const per = (total: number): number | null => (finished.length === 0 ? null : total / finished.length);
  return {
    sampledMatches: sample.length,
    finishedSampled: finished.length,
    starters,
    extenders,
    finishers,
    endSequences: sum((counts) => counts.endSequences),
    assists,
    assistHits: sum((counts) => counts.assistHits),
    tags,
    rerolls: sum((counts) => counts.rerolls),
    rerollsSkipped: sum((counts) => counts.rerollsSkipped),
    meterGained,
    meterSpent,
    meterSpendRate: meterGained === 0 ? null : meterSpent / meterGained,
    counters,
    parries,
    braces,
    exPlays: sum((counts) => counts.exPlays),
    shifts,
    whiffs: sum((counts) => counts.whiffs),
    koSwaps: sum((counts) => counts.koSwaps),
    movesets: sum((counts) => counts.movesets),
    reactionWindows,
    defenseAnswers,
    defenseAnswerRate: reactionWindows === 0 ? null : defenseAnswers / reactionWindows,
    meanHitsPerTurn: sample.length === 0 ? null : hits / turns,
    meanTagsPerMatch: per(tags),
    meanAssistsPerMatch: per(assists),
    sequenceMix: { Starter: starters, Extender: extenders, Finisher: finishers },
    strengthMix: {
      Light: sum((counts) => counts.lightHits),
      Medium: sum((counts) => counts.mediumHits),
      Heavy: sum((counts) => counts.heavyHits),
    },
    commitmentMix: {
      "Face hits": sum((counts) => counts.facesUsed),
      Techniques: sum((counts) => counts.techniquesUsed),
      "Assist hits": sum((counts) => counts.assistHits),
      "End sequence": sum((counts) => counts.endSequences),
      Tags: tags,
      Assists: assists,
      Rerolls: sum((counts) => counts.rerolls),
      "Rerolls skipped": sum((counts) => counts.rerollsSkipped),
      "EX plays": sum((counts) => counts.exPlays),
    },
    defenseMix: {
      Counter: counters,
      Parry: parries,
      Brace: braces,
      Shift: shifts,
      Negates: sum((counts) => counts.negates),
    },
    hitNames,
    fighterMix,
    rejectionMix,
    seatMix,
  };
}

export function fightingInsights(recordings: readonly MatchRecording[]): Insight[] {
  const sample = dedupe(recordings).filter(hasFightingSample);
  if (sample.length === 0) return [];
  const agg = aggregateFighting(sample);
  const insights: Insight[] = [];
  const hits = agg.starters + agg.extenders + agg.finishers;
  if (hits >= 4 && agg.finishers === 0 && agg.endSequences >= 2) {
    insights.push({
      id: "sequence-bailed",
      severity: "warn",
      title: "Sequences are ending before a finisher",
      detail: `${String(agg.endSequences)} end-sequence actions and ${String(hits)} role hits, with no finisher. Players are opening or extending and then handing the turn back.`,
      evidence: { endSequences: agg.endSequences, starters: agg.starters, extenders: agg.extenders },
    });
  }
  if (agg.meterGained >= 8 && agg.meterSpendRate !== null && agg.meterSpendRate < 0.25) {
    insights.push({
      id: "meter-unspent",
      severity: "warn",
      title: "Meter is gained and mostly not spent",
      detail: `${String(agg.meterSpent)} spent of ${String(agg.meterGained)} gained (${(agg.meterSpendRate * 100).toFixed(0)}%). Hits are filling the pool, and cards, Assists, or EX are not taking it back out.`,
      evidence: { meterGained: agg.meterGained, meterSpent: agg.meterSpent },
    });
  }
  if (
    agg.finishedSampled >= 2 &&
    agg.meanTagsPerMatch !== null &&
    agg.meanTagsPerMatch < 0.5 &&
    agg.meanAssistsPerMatch !== null &&
    agg.meanAssistsPerMatch < 0.5
  ) {
    insights.push({
      id: "bench-unused",
      severity: "warn",
      title: "Tag and Assist are barely used",
      detail: `Finished matches average ${agg.meanTagsPerMatch.toFixed(2)} Tags and ${agg.meanAssistsPerMatch.toFixed(2)} Assists. The bench is not part of how these games are being played.`,
      evidence: { meanTags: Number(agg.meanTagsPerMatch.toFixed(2)), meanAssists: Number(agg.meanAssistsPerMatch.toFixed(2)) },
    });
  }
  if (agg.reactionWindows >= 6 && agg.defenseAnswerRate !== null && agg.defenseAnswerRate < 0.1) {
    insights.push({
      id: "chains-unchallenged",
      severity: "info",
      title: "Chains are passed through",
      detail: `${String(agg.defenseAnswers)} Counters, Parries, Braces, and Shifts across ${String(agg.reactionWindows)} reaction windows. Priority is being passed, not answered.`,
      evidence: { defenseAnswers: agg.defenseAnswers, reactionWindows: agg.reactionWindows },
    });
  }
  const rerollChances = agg.rerolls + agg.rerollsSkipped;
  if (rerollChances >= 4 && agg.rerolls / rerollChances <= 0.2) {
    insights.push({
      id: "reroll-skipped",
      severity: "info",
      title: "The reroll is usually skipped",
      detail: `${String(agg.rerolls)} rerolls and ${String(agg.rerollsSkipped)} skips. Players are taking the opening roll into the sequence.`,
      evidence: { rerolls: agg.rerolls, skipped: agg.rerollsSkipped },
    });
  }
  const meterRejects = agg.rejectionMix.INSUFFICIENT_METER ?? 0;
  const rejected = Object.values(agg.rejectionMix).reduce((total, count) => total + count, 0);
  if (rejected >= 4 && meterRejects / rejected >= 0.4) {
    insights.push({
      id: "meter-rejects",
      severity: "info",
      title: "Rejected plays are mostly short Meter",
      detail: `${String(meterRejects)} of ${String(rejected)} rejections are INSUFFICIENT_METER. Players are reaching for a cost the pool does not have.`,
      evidence: { meterRejects, rejected },
    });
  }
  return insights;
}
