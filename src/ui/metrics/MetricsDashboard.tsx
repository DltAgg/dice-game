import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  aggregateRecordings,
  BASELINE_TURNS,
  buildMetricsExport,
  formatAgentPrompt,
  formatMetricsMarkdown,
  insightsFor,
  forgeCardCountOf,
  matchPace,
  turnKind,
  type Insight,
  type MatchRecording,
} from "@/metrics";
import { useMetricsStore } from "@/store/metricsStore";
import { BarList, formatDuration, formatPct, ScatterPlot, SparkBars, StatCard, TurnHistogram } from "./charts";

function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function severityClass(severity: Insight["severity"]): string {
  if (severity === "high") return "border-red-900/80 bg-red-950/40 text-red-100";
  if (severity === "warn") return "border-amber-900/80 bg-amber-950/30 text-amber-100";
  return "border-stone-800 bg-black/20 text-stone-200";
}

function statusLabel(status: MatchRecording["status"]): string {
  if (status === "finished") return "finished";
  if (status === "abandoned") return "abandoned";
  return "in progress";
}

export function MetricsDashboard() {
  const recordings = useMetricsStore((s) => s.recordings);
  const loading = useMetricsStore((s) => s.loading);
  const selectedId = useMetricsStore((s) => s.selectedId);
  const notice = useMetricsStore((s) => s.notice);
  const refresh = useMetricsStore((s) => s.refresh);
  const select = useMetricsStore((s) => s.select);
  const remove = useMetricsStore((s) => s.remove);
  const clearAll = useMetricsStore((s) => s.clearAll);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const aggregates = useMemo(() => aggregateRecordings(recordings), [recordings]);
  const insights = useMemo(() => insightsFor(recordings), [recordings]);
  const selected = recordings.find((row) => row.recordingId === selectedId) ?? null;
  const exported = useMemo(() => buildMetricsExport(recordings), [recordings]);

  const flash = (key: string) => {
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Metrics
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ink-muted)]">
            Local observer for hotseat and online matches. Recordings live in IndexedDB (with a
            localStorage fallback) so a refresh does not wipe them. Nothing here is rules — the
            collector only watches <span className="text-stone-300">advance()</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border border-stone-700 px-3 py-1 text-sm text-stone-300 hover:border-stone-500"
            onClick={() => void refresh()}
          >
            Refresh
          </button>
          <button
            type="button"
            className="rounded border border-stone-700 px-3 py-1 text-sm text-stone-300 hover:border-stone-500"
            onClick={() => {
              downloadText(
                `dice-skirmish-metrics-${exported.exportedAt.slice(0, 19).replaceAll(":", "")}.json`,
                JSON.stringify(exported, null, 2),
                "application/json",
              );
            }}
          >
            Download JSON
          </button>
          <button
            type="button"
            className="rounded border border-stone-700 px-3 py-1 text-sm text-stone-300 hover:border-stone-500"
            onClick={() => {
              downloadText(
                `dice-skirmish-metrics-${exported.exportedAt.slice(0, 10)}.md`,
                formatMetricsMarkdown(exported),
                "text/markdown",
              );
            }}
          >
            Download Markdown
          </button>
          <button
            type="button"
            className="rounded border border-[var(--accent)] bg-[var(--accent)]/15 px-3 py-1 text-sm text-[var(--accent)]"
            onClick={() => {
              void copyText(formatAgentPrompt(exported)).then((ok) => {
                if (ok) flash("prompt");
              });
            }}
          >
            {copied === "prompt" ? "Copied" : "Copy agent prompt"}
          </button>
        </div>
      </header>

      {notice !== null ? (
        <p className="rounded border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-100">
          {notice}
        </p>
      ) : null}

      {loading && recordings.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">Loading recordings…</p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Finished matches"
          value={`${String(aggregates.finishedCount)} / ${String(aggregates.matchCount)}`}
          hint={`${String(aggregates.inProgressCount)} live · ${String(aggregates.abandonedCount)} abandoned`}
        />
        <StatCard
          label="Median turns"
          value={aggregates.medianTurns?.toFixed(1) ?? "—"}
          hint={`mean ${aggregates.meanTurns?.toFixed(1) ?? "—"}`}
          warn={aggregates.medianTurns !== null && aggregates.medianTurns > BASELINE_TURNS}
        />
        <StatCard
          label={`Past ${String(BASELINE_TURNS)}-turn baseline`}
          value={formatPct(aggregates.pctOverBaseline)}
          hint="Share of finished matches — red flag"
          warn={aggregates.pctOverBaseline !== null && aggregates.pctOverBaseline >= 50}
        />
        <StatCard
          label="Median drag"
          value={aggregates.medianDragScore?.toFixed(1) ?? "—"}
          hint="Overtime past 10 + idle after arming"
          warn={aggregates.medianDragScore !== null && aggregates.medianDragScore >= 4}
        />
        <StatCard
          label="Median duration"
          value={formatDuration(aggregates.medianDurationMs)}
          hint={`think p50 ${formatDuration(aggregates.medianThinkMs)} · p90 ${formatDuration(aggregates.p90ThinkMs)}`}
        />
        <StatCard
          label="HP damage / turn"
          value={aggregates.meanDamagePerTurn?.toFixed(2) ?? "—"}
          hint="Finished matches only"
          warn={aggregates.meanDamagePerTurn !== null && aggregates.meanDamagePerTurn < 2}
        />
        <StatCard
          label="Idle / stall turns"
          value={`${formatPct(aggregates.meanLateIdleRate === null ? null : aggregates.meanLateIdleRate * 100)} / ${formatPct(aggregates.stallTurnRate === null ? null : aggregates.stallTurnRate * 100)}`}
          hint="Late idle (no action/decision) vs 0-dmg 0-atk"
        />
        <StatCard
          label="Reject rate"
          value={formatPct(aggregates.rejectRate === null ? null : aggregates.rejectRate * 100)}
          hint="Illegal clicks vs attempts"
        />
        <StatCard
          label="Hand cards play / forge"
          value={`${String(aggregates.totalCardsPlayed)} / ${String(aggregates.totalCardsForged)}`}
          hint={`${aggregates.meanEffectPerTurn?.toFixed(2) ?? "—"} effect/turn · ${aggregates.meanForgePerTurn?.toFixed(2) ?? "—"} forge/turn`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartPanel
          title="Turns per finished match"
          caption={`Red line is the ${String(BASELINE_TURNS)}-turn baseline. Bars past it are overtime — drag score then says whether those turns were idle or a real fight.`}
        >
          <TurnHistogram turns={aggregates.finishedTurns} baselineAt={BASELINE_TURNS} />
        </ChartPanel>
        <ChartPanel
          title="Pace verdict"
          caption="Per finished match: on-pace, empty-early, dragging (empty overtime), grinding (setup without a close), long-active."
        >
          <BarList items={aggregates.verdictMix} warnKeys={new Set(["dragging", "grinding", "empty-early"])} />
        </ChartPanel>
        <ChartPanel title="Wall-clock duration" caption="How long sessions actually take at the table.">
          <BarList items={aggregates.durationHistogram} />
        </ChartPanel>
        <ChartPanel title="Action mix" caption="Host/local include GameAction types; guests may show state-ticks.">
          <BarList items={aggregates.actionMix} warnKeys={new Set(["(rejected)"])} />
        </ChartPanel>
        <ChartPanel title="Event mix" caption="Reducer log — damage, reactions, forges, absorbs.">
          <BarList items={aggregates.eventMix} />
        </ChartPanel>
        <ChartPanel title="Pending decisions" caption="Search, discard, choose, forge-faces, reaction priority.">
          <BarList items={aggregates.pendingMix} />
        </ChartPanel>
        <ChartPanel title="Energy pass cause" caption="Overshoot vs a clean END_TURN.">
          <BarList items={aggregates.energyPassMix} />
        </ChartPanel>
        <ChartPanel title="Think time by action (p90)" caption="Wall-clock gaps before that action.">
          <BarList
            items={Object.fromEntries(
              Object.entries(aggregates.thinkByAction).map(([type, stats]) => [
                type,
                stats.p90 ?? 0,
              ]),
            )}
          />
        </ChartPanel>
        <ChartPanel
          title="Play vs forge"
          caption="Tactic cards spent for their effect region vs spent to install a face (FORGE_CARD). Face-install count can be higher when a card forges more than one face."
        >
          <BarList items={aggregates.playVsForgeMix} />
        </ChartPanel>
        <ChartPanel
          title="Effect / turn vs forge / turn"
          caption={`Each point is a match. Pearson r ${aggregates.playForgeCorrelation === null ? "needs two matches with variance" : `= ${aggregates.playForgeCorrelation.toFixed(2)}`} (n=${String(aggregates.playForgeRates.length)}). Positive = they rise together; negative = Energy is split between playing and forging.`}
        >
          <ScatterPlot
            title="Effect plays per turn versus forge plays per turn"
            xLabel="Played (effect) / turn"
            yLabel="Played (forge) / turn"
            points={aggregates.playForgeRates.map((point) => ({
              x: point.effectPerTurn,
              y: point.forgePerTurn,
              label: point.matchId,
            }))}
          />
        </ChartPanel>
        <ChartPanel title="Cards played (effect)" caption="PLAY_CARD — catalogue names from card-played events.">
          <BarList items={aggregates.cardPlayMix} />
        </ChartPanel>
        <ChartPanel
          title="Cards played to forge"
          caption="FORGE_CARD — one count per tactic spent, even if it installs several faces."
        >
          <BarList items={aggregates.cardForgeMix} />
        </ChartPanel>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">Insights</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {insights.map((insight) => (
            <li
              key={insight.id}
              className={`rounded border px-3 py-2 text-sm ${severityClass(insight.severity)}`}
            >
              <p className="font-semibold">
                {insight.title}{" "}
                <span className="font-mono text-xs opacity-70">{insight.severity}</span>
              </p>
              <p className="mt-1 text-[var(--ink-muted)]">{insight.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
            Recorded matches
          </h2>
          {recordings.length > 0 ? (
            <button
              type="button"
              className="text-xs text-stone-500 hover:text-red-300"
              onClick={() => {
                if (window.confirm("Delete every stored recording on this browser?")) {
                  void clearAll();
                }
              }}
            >
              Clear all
            </button>
          ) : null}
        </div>
        {recordings.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            Play a hotseat or host match. This tab fills as actions resolve.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded border border-stone-800">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-black/30 text-[10px] uppercase tracking-[0.16em] text-amber-200/70">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Turns</th>
                  <th className="px-3 py-2">Pace</th>
                  <th className="px-3 py-2">Drag</th>
                  <th className="px-3 py-2">Idle/stall</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Dmg/turn</th>
                  <th className="px-3 py-2">Play/forge</th>
                  <th className="px-3 py-2">Decks</th>
                  <th className="px-3 py-2">Winner</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {recordings.map((row) => {
                  const dpt =
                    row.totalTurns > 0 ? (row.totalDamageDealt / row.totalTurns).toFixed(2) : "—";
                  const active = row.recordingId === selectedId;
                  const pace = matchPace(row);
                  const turnsClass = pace.overBaseline ? "text-red-300" : "text-stone-200";
                  return (
                    <tr
                      key={row.recordingId}
                      className={`cursor-pointer border-t border-stone-800/80 ${active ? "bg-[var(--accent)]/10" : "hover:bg-white/5"}`}
                      onClick={() => select(active ? null : row.recordingId)}
                    >
                      <td className="px-3 py-2 font-mono text-xs text-stone-300">
                        {row.startedAt.slice(0, 19).replace("T", " ")}
                      </td>
                      <td className="px-3 py-2 text-[var(--ink-muted)]">
                        {statusLabel(row.status)} · {row.recordedAs}
                      </td>
                      <td className={`px-3 py-2 font-mono ${turnsClass}`}>{row.totalTurns}</td>
                      <td className="px-3 py-2 text-xs text-stone-300">{pace.verdict}</td>
                      <td className="px-3 py-2 font-mono text-xs">{pace.dragScore}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {pace.idleTurns}/{pace.stallTurns}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{formatDuration(row.durationMs)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{dpt}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {row.totalCardsPlayed}/{forgeCardCountOf(row)}
                      </td>
                      <td className="px-3 py-2 text-xs text-stone-400">
                        {row.p1DeckName} vs {row.p2DeckName}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{row.winnerId ?? "—"}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-xs text-stone-500 hover:text-red-300"
                          onClick={(event) => {
                            event.stopPropagation();
                            void remove(row.recordingId);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected !== null ? <MatchDetail recording={selected} /> : null}
    </main>
  );
}

function ChartPanel({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded border border-stone-800 bg-black/20 p-4">
      <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">{caption}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MatchDetail({ recording }: { recording: MatchRecording }) {
  const pace = matchPace(recording);
  const damage = recording.turns.map((turn) => turn.damageDealt);
  const tones = recording.turns.map(turnKind);
  const hpP1 = recording.turns.map((turn) =>
    turn.hp.filter((creature) => creature.ownerId === "p1").reduce((sum, creature) => sum + creature.remaining, 0),
  );
  const think = recording.actions.filter((sample) => !sample.reconstructed).map((sample) => sample.deltaMs);

  return (
    <section className="rounded border border-stone-800 bg-black/20 p-4">
      <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
        {recording.matchId}
      </h2>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">
        seed {String(recording.seed)} · {recording.p1DeckName} vs {recording.p2DeckName} · recorded as{" "}
        {recording.recordedAs}
        {recording.roomCode !== null ? ` · room ${recording.roomCode}` : ""} · {pace.verdict} · drag{" "}
        {String(pace.dragScore)} (overtime {String(pace.overtimeTurns)} + late idle {String(pace.lateIdleTurns)})
        {" · "}
        {String(recording.totalCardsPlayed)} played / {String(forgeCardCountOf(recording))} forged
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/70">
            Damage per turn (green combat · gold setup · red idle)
          </p>
          <SparkBars values={damage} tones={tones} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/70">P1 HP remaining by turn</p>
          <SparkBars values={hpP1} />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-xs">
          <thead className="text-[10px] uppercase tracking-[0.16em] text-amber-200/70">
            <tr>
              <th className="py-1 pr-3">Turn</th>
              <th className="py-1 pr-3">Seat</th>
              <th className="py-1 pr-3">Dmg</th>
              <th className="py-1 pr-3">Atk</th>
              <th className="py-1 pr-3">Plays</th>
              <th className="py-1 pr-3">Forge cards/faces</th>
              <th className="py-1 pr-3">Pending</th>
              <th className="py-1 pr-3">Rxn</th>
              <th className="py-1 pr-3">Clock</th>
              <th className="py-1 pr-3">Pass</th>
            </tr>
          </thead>
          <tbody>
            {recording.turns.map((row) => {
              const kind = turnKind(row);
              return (
              <tr key={row.turn} className="border-t border-stone-800/80">
                <td className="py-1 pr-3 font-mono">
                  {row.turn}{" "}
                  <span className={kind === "idle" ? "text-red-300" : kind === "setup" ? "text-amber-200/80" : "text-stone-500"}>
                    {kind}
                  </span>
                </td>
                <td className="py-1 pr-3">{row.playerId}</td>
                <td className="py-1 pr-3 font-mono">{row.damageDealt}</td>
                <td className="py-1 pr-3 font-mono">{row.attacksDeclared}</td>
                <td className="py-1 pr-3 font-mono">{row.cardsPlayed}</td>
                <td className="py-1 pr-3 font-mono">
                  {row.cardsForged ?? 0}/{row.forges}
                </td>
                <td className="py-1 pr-3 font-mono">{row.pendingDecisionOpens}</td>
                <td className="py-1 pr-3 font-mono">{row.reactionWindows}</td>
                <td className="py-1 pr-3 font-mono">{formatDuration(row.durationMs)}</td>
                <td className="py-1 pr-3">{row.energyPassCause ?? "—"}</td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[10px] uppercase tracking-[0.16em] text-amber-200/70">
        Recent actions ({String(think.length)} timed)
      </p>
      <ul className="mt-2 max-h-48 overflow-auto font-mono text-[11px] text-stone-400">
        {recording.actions.slice(-40).map((sample) => (
          <li key={sample.seq}>
            t{sample.turn} {sample.actionType ?? "tick"} {sample.accepted ? "ok" : sample.errorCode}{" "}
            Δ{formatDuration(sample.deltaMs)}
            {sample.eventTypes.length > 0 ? ` · ${sample.eventTypes.join(",")}` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}
