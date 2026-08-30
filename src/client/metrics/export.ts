import { aggregateRecordings, insightsFor } from "./insights.js";
import { matchPace } from "./pace.js";
import {
  firstAttackTurn,
  firstDamageTurn,
  firstDefeatTurn,
} from "./close.js";
import { forgeCardCountOf } from "./snapshot.js";
import { BASELINE_TURNS, METRICS_SCHEMA_VERSION } from "./thresholds.js";
import type { MatchRecording } from "./types.js";

export const METRICS_PROMPT_PREAMBLE = `You are helping diagnose Dice Skirmish playtest pacing.

Players report that matches feel slow. More than ${String(BASELINE_TURNS)} turns is a red-flag baseline — not a 11–20 band. Each match has a drag score = overtime turns past ${String(BASELINE_TURNS)} plus idle turns after the 2-turn arming window. Idle means the player took no meaningful action and opened no decision (no attack, damage, absorb, play, forge, ritual, pending choice, or reaction). Stall is 0 damage and 0 attacks (setup can still be stall). Verdicts: on-pace, empty-early, dragging (overtime is empty), grinding (setup/stall without a close), long-active (combat happens, still too many turns).

The JSON (or Markdown) that follows is a metrics export from the local collector. It is an observer sitting outside the pure reducer: it never changes GameState. Wall-clock think time is time between recorded observations. Guest recordings include network delay; prefer host/local recordings when both exist for the same matchId (the export already dedupes, keeping the richer sample).

Close timeline (bible §45): median first damage / first attack / first creature death, deaths by turn, first-player win rate, and win rate by deck pair. A first death on turns 1–3 is too early for a three-creature skirmish; a first death after turn 10 (or never) with overtime is a close that is not arriving.

Please:
1. Per match, correlate overtime with idle vs setup vs combat. Do not treat “11–20 turns” as a default bucket.
2. Say whether the sample is dragging (empty), grinding (cannot close), or long-active.
3. Use first-death turn and damage / play-forge mix to separate “cannot kill” from “not converting setup.”
4. Propose concrete rules or UX experiments — cite the numbers. Do not invent engine behavior that is not in the evidence.
5. List what extra instrumentation would help if the picture is incomplete.

Do not propose a second rules engine in the UI.`;

export interface MetricsExport {
  readonly schemaVersion: typeof METRICS_SCHEMA_VERSION;
  readonly exportedAt: string;
  readonly promptPreamble: string;
  readonly summary: ReturnType<typeof aggregateRecordings>;
  readonly insights: ReturnType<typeof insightsFor>;
  readonly matches: readonly CompactMatch[];
}

export interface CompactMatch {
  readonly recordingId: string;
  readonly matchId: string;
  readonly status: MatchRecording["status"];
  readonly recordedAs: MatchRecording["recordedAs"];
  readonly startedAt: string;
  readonly durationMs: number;
  readonly totalTurns: number;
  readonly winnerId: string | null;
  readonly firstPlayerId: string | null;
  readonly p1DeckName: string;
  readonly p2DeckName: string;
  readonly seed: number;
  readonly acceptedActions: number;
  readonly rejectedActions: number;
  readonly totalDamageDealt: number;
  readonly damagePerTurn: number | null;
  readonly firstDamageTurn: number | null;
  readonly firstAttackTurn: number | null;
  readonly firstDefeatTurn: number | null;
  readonly stallTurnCount: number;
  readonly idleTurnCount: number;
  readonly overtimeTurns: number;
  readonly dragScore: number;
  readonly paceVerdict: string;
  readonly slowThinkCount: number;
  readonly livingCreaturesAtEnd: Readonly<Record<string, number>>;
  readonly hpRemainingAtEnd: Readonly<Record<string, number>>;
  readonly eventCounts: Readonly<Record<string, number>>;
  readonly cardPlayCounts: Readonly<Record<string, number>>;
  readonly cardForgeCounts: Readonly<Record<string, number>>;
  readonly totalCardsPlayed: number;
  readonly totalCardsForged: number;
  readonly turns: MatchRecording["turns"];
  readonly actions: MatchRecording["actions"];
}

function compactMatch(recording: MatchRecording): CompactMatch {
  const pace = matchPace(recording);
  return {
    recordingId: recording.recordingId,
    matchId: recording.matchId,
    status: recording.status,
    recordedAs: recording.recordedAs,
    startedAt: recording.startedAt,
    durationMs: recording.durationMs,
    totalTurns: recording.totalTurns,
    winnerId: recording.winnerId,
    firstPlayerId: recording.firstPlayerId,
    p1DeckName: recording.p1DeckName,
    p2DeckName: recording.p2DeckName,
    seed: recording.seed,
    acceptedActions: recording.acceptedActions,
    rejectedActions: recording.rejectedActions,
    totalDamageDealt: recording.totalDamageDealt,
    damagePerTurn:
      recording.totalTurns > 0 ? recording.totalDamageDealt / recording.totalTurns : null,
    firstDamageTurn: firstDamageTurn(recording),
    firstAttackTurn: firstAttackTurn(recording),
    firstDefeatTurn: firstDefeatTurn(recording),
    stallTurnCount: pace.stallTurns,
    idleTurnCount: pace.idleTurns,
    overtimeTurns: pace.overtimeTurns,
    dragScore: pace.dragScore,
    paceVerdict: pace.verdict,
    slowThinkCount: recording.slowThinkCount,
    livingCreaturesAtEnd: recording.livingCreaturesAtEnd,
    hpRemainingAtEnd: recording.hpRemainingAtEnd,
    eventCounts: recording.eventCounts,
    cardPlayCounts: recording.cardPlayCounts ?? {},
    cardForgeCounts: recording.cardForgeCounts ?? {},
    totalCardsPlayed: recording.totalCardsPlayed,
    totalCardsForged: forgeCardCountOf(recording),
    turns: recording.turns,
    actions: recording.actions,
  };
}

export function buildMetricsExport(
  recordings: readonly MatchRecording[],
  nowMs: number = Date.now(),
): MetricsExport {
  return {
    schemaVersion: METRICS_SCHEMA_VERSION,
    exportedAt: new Date(nowMs).toISOString(),
    promptPreamble: METRICS_PROMPT_PREAMBLE,
    summary: aggregateRecordings(recordings),
    insights: insightsFor(recordings),
    matches: recordings.map(compactMatch),
  };
}

function fmtMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${String(Math.round(ms))}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function fmtPct(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(0)}%`;
}

function mixTable(mix: Readonly<Record<string, number>>, limit = 12): string {
  const rows = Object.entries(mix)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  if (rows.length === 0) return "(none)";
  return rows.map(([key, count]) => `- ${key}: ${String(count)}`).join("\n");
}

export function formatMetricsMarkdown(exported: MetricsExport): string {
  const s = exported.summary;
  const insightLines = exported.insights.map(
    (insight) => `- **${insight.severity} / ${insight.id}** — ${insight.title}: ${insight.detail}`,
  );
  const matchLines = exported.matches.map((match) => {
    const dpt = match.damagePerTurn === null ? "—" : match.damagePerTurn.toFixed(2);
    const death = match.firstDefeatTurn === null ? "—" : String(match.firstDefeatTurn);
    return `| ${match.startedAt.slice(0, 19)} | ${match.status} | ${String(match.totalTurns)} | ${match.paceVerdict} | ${String(match.dragScore)} | ${String(match.overtimeTurns)} | ${String(match.idleTurnCount)}/${String(match.stallTurnCount)} | ${dpt} | ${death} | ${match.p1DeckName} vs ${match.p2DeckName} | ${match.winnerId ?? "—"} |`;
  });

  return `# Dice Skirmish metrics briefing

${exported.promptPreamble}

Exported at ${exported.exportedAt} (schema ${String(exported.schemaVersion)}).

## Snapshot

| Metric | Value |
|---|---|
| Recordings (deduped) | ${String(s.matchCount)} |
| Finished | ${String(s.finishedCount)} |
| Abandoned | ${String(s.abandonedCount)} |
| In progress | ${String(s.inProgressCount)} |
| Mean / median turns | ${s.meanTurns?.toFixed(1) ?? "—"} / ${s.medianTurns?.toFixed(1) ?? "—"} |
| % past ${String(BASELINE_TURNS)}-turn baseline | ${fmtPct(s.pctOverBaseline)} |
| Median drag score | ${s.medianDragScore?.toFixed(1) ?? "—"} |
| Mean idle / late-idle rate | ${s.meanIdleRate === null ? "—" : `${(s.meanIdleRate * 100).toFixed(0)}%`} / ${s.meanLateIdleRate === null ? "—" : `${(s.meanLateIdleRate * 100).toFixed(0)}%`} |
| Pace verdicts | ${Object.entries(s.verdictMix)
  .filter(([, count]) => count > 0)
  .map(([key, count]) => `${key} ${String(count)}`)
  .join(", ") || "—"} |
| Median match duration | ${fmtMs(s.medianDurationMs)} |
| Mean HP damage / turn | ${s.meanDamagePerTurn?.toFixed(2) ?? "—"} |
| Median first damage / attack / death | ${s.medianFirstDamageTurn?.toFixed(1) ?? "—"} / ${s.medianFirstAttackTurn?.toFixed(1) ?? "—"} / ${s.medianFirstDefeatTurn?.toFixed(1) ?? "—"} |
| Finished matches with no defeat | ${fmtPct(s.pctNeverDefeat)} |
| First-player win rate | ${fmtPct(s.firstPlayerWinRate === null ? null : s.firstPlayerWinRate * 100)} (n=${String(s.firstPlayerDecided)}) |
| P1 win rate | ${fmtPct(s.p1WinRate === null ? null : s.p1WinRate * 100)} |
| Median / p90 think | ${fmtMs(s.medianThinkMs)} / ${fmtMs(s.p90ThinkMs)} |
| Stall-turn rate | ${s.stallTurnRate === null ? "—" : `${(s.stallTurnRate * 100).toFixed(0)}%`} |
| Reject rate | ${fmtPct(s.rejectRate === null ? null : s.rejectRate * 100)} |

### Turn-length histogram

${mixTable(s.turnHistogram)}

### Wall-clock duration

${mixTable(s.durationHistogram)}

### Action mix

${mixTable(s.actionMix)}

### Event mix (top)

${mixTable(s.eventMix)}

### Pending decisions

${mixTable(s.pendingMix)}

### First creature death

${mixTable(s.firstDefeatHistogram)}

### Creature deaths by turn (mean)

${mixTable(s.deathsByTurnMix)}

### First player vs second

${mixTable(s.firstPlayerWinMix)}

### Deck pairs (finished)

${mixTable(s.deckPairMix)}

### Cards played (effect)

${mixTable(s.cardPlayMix)}

### Cards played to forge

${mixTable(s.cardForgeMix)}

### Play vs forge (hand cards spent)

${mixTable(s.playVsForgeMix)}

### Effect vs forge by turn

Mean cards that turn among matches that reached it. Effect is PLAY_CARD (effect region); forge is FORGE_CARD (one tactic even if it installs several faces).

${
  s.playForgeByTurn
    .map(
      (point) =>
        `- T${String(point.turn)}: effect ${point.meanEffect.toFixed(2)}, forge ${point.meanForge.toFixed(2)} (n=${String(point.matchCount)})`,
    )
    .join("\n") || "(none)"
}

Pearson r of match effect/turn vs forge/turn = ${s.playForgeCorrelation === null ? "—" : s.playForgeCorrelation.toFixed(2)} (n=${String(s.playForgeRates.length)}). Mean effect/turn ${s.meanEffectPerTurn?.toFixed(2) ?? "—"}, mean forge/turn ${s.meanForgePerTurn?.toFixed(2) ?? "—"}.

### Think time by action (p50 / p90)

${
    Object.entries(s.thinkByAction)
      .sort((a, b) => (b[1].p90 ?? 0) - (a[1].p90 ?? 0))
      .slice(0, 12)
      .map(([type, stats]) => `- ${type} (n=${String(stats.n)}): p50 ${fmtMs(stats.p50)} / p90 ${fmtMs(stats.p90)}`)
      .join("\n") || "(none)"
  }

## Insights

${insightLines.join("\n") || "- (none)"}

## Matches

| Started | Status | Turns | Verdict | Drag | Overtime | Idle/stall | Dmg/turn | First death | Decks | Winner |
|---|---|---|---|---|---|---|---|---|---|---|
${matchLines.join("\n") || "| — | — | — | — | — | — | — | — | — | — | — |"}

## Per-match turn notes

${exported.matches
  .map((match) => {
    const turns = match.turns
      .map((turn) => {
        const stall = turn.stall ? " STALL" : "";
        const idle =
          turn.damageDealt === 0 &&
          turn.attacksDeclared === 0 &&
          turn.cardsPlayed === 0 &&
          turn.forges === 0 &&
          (turn.cardsForged ?? 0) === 0 &&
          turn.absorbs === 0 &&
          turn.ritualActivations === 0 &&
          turn.pendingDecisionOpens === 0 &&
          turn.reactionWindows === 0 &&
          turn.chainLinksAdded === 0 &&
          turn.healAmount === 0 &&
          turn.damagePrevented === 0
            ? " IDLE"
            : "";
        return `  - T${String(turn.turn)} ${turn.playerId}: dmg ${String(turn.damageDealt)}, atk ${String(turn.attacksDeclared)}, death ${String(turn.creaturesDefeated)}, play ${String(turn.cardsPlayed)}, forge ${String(turn.cardsForged ?? 0)} cards/${String(turn.forges)} faces, pending ${String(turn.pendingDecisionOpens)}, rxn ${String(turn.reactionWindows)}, ${fmtMs(turn.durationMs)}${idle}${stall}`;
      })
      .join("\n");
    return `### ${match.matchId} (${match.status}, ${String(match.totalTurns)} turns)\n${turns || "  - (no turns)"}`;
  })
  .join("\n\n")}
`;
}

export function formatAgentPrompt(exported: MetricsExport): string {
  const json = JSON.stringify(exported, null, 2);
  return `${exported.promptPreamble}

---

\`\`\`json
${json}
\`\`\`
`;
}
