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

export const METRICS_PROMPT_PREAMBLE = `You are helping make Dice Skirmish playable and fun again.

The game used two resources (energy and attributes). Fuel is now the **attribute pile only** — rolled and generated pips auto-bank. Energy is gone. Ignore leftover energy* keys on old recordings. Do not propose bringing energy back.

The live set is in a weird, slow state: matches often fail to close, attacks are often unpaid, and forge is a weak third choice behind play and Overcharge. Diagnose **that** — not a generic 11–20 turn band.

The dump is an observer outside reduce()/advance(). It never changes GameState. Wall-clock think time is time between observations. Guest think times include network delay; prefer recordedAs host / local / local-ai. Deduped by matchId (richer sample wins).

Pace flags (per match, not an 11–20 bucket):
- Red flag: totalTurns > ${String(BASELINE_TURNS)}. Overtime = max(0, turns − ${String(BASELINE_TURNS)}).
- Idle: no attack, damage, absorb, play, forge, ritual, heal/prevent, pending, reaction, or chain.
- Stall: 0 HP damage and 0 attacks (setup can still stall). Late idle = idle after turns 1–2.
- Drag = overtime + late idle.
- Verdicts: on-pace, empty-early, dragging (empty overtime), grinding (setup/stall, cannot close), long-active (combat happened, still too many turns).

Playability (pile-only fuel):
- 0 attacks is not “chose setup.” Check INSUFFICIENT_SYMBOLS, attack discards vs a 2-die roll, and 1-pip leftovers that can pay a 1-cost card or Overcharge (0 pile) but not a 2-token basic.
- turn.absorbs counts symbol-absorbed **and** symbols-consumed — it is not spare pile.
- Separate cannot-pay-attack from cannot-kill (prevent/Shield, zero-damage attacks) from not converting setup.

Fun:
- Close (bible §45): first death on turns 1–3 is too early for a three-creature skirmish; after turn ${String(BASELINE_TURNS)} or never with overtime, the close is not arriving.
- Forge vs play vs Overcharge: Overcharge is 0 pile and juices every copy of a face; synthetic forge pays playCost. Say whether forge is a line a player would pick.
- Reaction volume vs dwell: many PASS_PRIORITY with tiny think is window spam, not reading time.

Please:
1. Per match, correlate overtime with idle vs setup vs combat.
2. Say whether the sample is dragging, grinding, or long-active — then whether it is unfun because unpaid attacks, unpayable forge, prevent-not-killing, or UX think.
3. Propose concrete rules or UX experiments that make matches fun to play (cite the numbers). Prefer paying a basic off a normal roll over adding attack rewards. Do not invent engine behavior that is not in the evidence.
4. List missing instrumentation (pile snapshot, attack-legal, prevent vs Shield).

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

### How you played

${mixTable(s.recordedAsMix)}

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
    return `### ${match.matchId} (${match.status}, ${match.recordedAs}, ${String(match.totalTurns)} turns)\n${turns || "  - (no turns)"}`;
  })
  .join("\n\n")}
`;
}

/** Clipboard text only — the dump is Download JSON / Download Markdown. */
export function formatAgentPrompt(exported: MetricsExport): string {
  return `${exported.promptPreamble}

This clipboard is the prompt only. Attach the file from Download JSON (or Download Markdown). A path is enough.
`;
}
