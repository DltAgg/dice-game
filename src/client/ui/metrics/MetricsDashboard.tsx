import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  aggregateFighting,
  aggregateRecordings,
  BASELINE_TURNS,
  buildMetricsExport,
  firstDefeatTurn,
  formatAgentPrompt,
  formatMetricsMarkdown,
  insightsFor,
  matchPace,
  recordedAsLabel,
  type Insight,
  type MatchRecording,
} from "@client/metrics";
import { useMetricsStore } from "@client/store/metricsStore";
import { BarList, formatDuration, formatPct, StatCard, TurnHistogram } from "./charts";
import { MatchDetail } from "./MatchDetail";

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
  const fighting = useMemo(() => aggregateFighting(recordings), [recordings]);
  const insights = useMemo(() => insightsFor(recordings), [recordings]);
  const selected = recordings.find((row) => row.recordingId === selectedId) ?? null;
  const exported = useMemo(() => buildMetricsExport(recordings), [recordings]);
  const stamp = exported.exportedAt.slice(0, 19).replaceAll(":", "");

  const flash = (key: string) => {
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1600);
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">Metrics</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ink-muted)]">
            Observer for the tag fighter: sequence hits, Meter, Tag, Assist, and how the Chain was
            answered. It watches the match and does not change it. Recordings stay in this browser.
            Copy agent prompt is instructions only; attach the Download JSON file in the chat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded border border-stone-700 px-3 py-1 text-sm text-stone-300 hover:border-stone-500" onClick={() => void refresh()}>
            Refresh
          </button>
          <button
            type="button"
            className="rounded border border-stone-700 px-3 py-1 text-sm text-stone-300 hover:border-stone-500"
            onClick={() => downloadText(`dice-skirmish-metrics-${stamp}.json`, JSON.stringify(exported, null, 2), "application/json")}
          >
            Download JSON
          </button>
          <button
            type="button"
            className="rounded border border-stone-700 px-3 py-1 text-sm text-stone-300 hover:border-stone-500"
            onClick={() => downloadText(`dice-skirmish-metrics-${exported.exportedAt.slice(0, 10)}.md`, formatMetricsMarkdown(exported), "text/markdown")}
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
        <p className="rounded border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-100">{notice}</p>
      ) : null}
      {loading && recordings.length === 0 ? <p className="text-sm text-[var(--ink-muted)]">Loading recordings…</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Finished matches"
          value={`${String(aggregates.finishedCount)} / ${String(aggregates.matchCount)}`}
          hint={`${String(aggregates.inProgressCount)} live · ${String(aggregates.abandonedCount)} abandoned`}
        />
        <StatCard
          label="Median turns"
          value={aggregates.medianTurns?.toFixed(1) ?? "—"}
          hint={`mean ${aggregates.meanTurns?.toFixed(1) ?? "—"} · past ${String(BASELINE_TURNS)}: ${formatPct(aggregates.pctOverBaseline)}`}
          warn={aggregates.medianTurns !== null && aggregates.medianTurns > BASELINE_TURNS}
        />
        <StatCard
          label="HP damage / turn"
          value={aggregates.meanDamagePerTurn?.toFixed(2) ?? "—"}
          hint={`first KO T${aggregates.medianFirstDefeatTurn?.toFixed(0) ?? "—"} · never ${formatPct(aggregates.pctNeverDefeat)}`}
          warn={aggregates.meanDamagePerTurn !== null && aggregates.meanDamagePerTurn < 2}
        />
        <StatCard
          label="Median duration"
          value={formatDuration(aggregates.medianDurationMs)}
          hint={`think p50 ${formatDuration(aggregates.medianThinkMs)} · p90 ${formatDuration(aggregates.p90ThinkMs)}`}
        />
        <StatCard
          label="Sequence hits"
          value={fighting.sampledMatches === 0 ? "—" : `${String(fighting.starters)}/${String(fighting.extenders)}/${String(fighting.finishers)}`}
          hint={
            fighting.meanHitsPerTurn === null
              ? "Starter / extender / finisher"
              : `${fighting.meanHitsPerTurn.toFixed(2)} hits/turn · end ${String(fighting.endSequences)}`
          }
        />
        <StatCard
          label="Meter spent"
          value={fighting.meterGained === 0 ? "—" : formatPct(fighting.meterSpendRate === null ? null : fighting.meterSpendRate * 100)}
          hint={`${String(fighting.meterSpent)} of ${String(fighting.meterGained)} gained`}
          warn={fighting.meterSpendRate !== null && fighting.meterGained >= 8 && fighting.meterSpendRate < 0.25}
        />
        <StatCard
          label="Tag / Assist"
          value={
            fighting.meanTagsPerMatch === null
              ? "—"
              : `${fighting.meanTagsPerMatch.toFixed(1)} / ${fighting.meanAssistsPerMatch?.toFixed(1) ?? "—"}`
          }
          hint="Mean per finished match"
        />
        <StatCard
          label="Chain answers"
          value={formatPct(fighting.defenseAnswerRate === null ? null : fighting.defenseAnswerRate * 100)}
          hint={`${String(fighting.defenseAnswers)} answers / ${String(fighting.reactionWindows)} windows`}
        />
      </section>

      {aggregates.matchCount > 0 && fighting.sampledMatches === 0 ? (
        <p className="rounded border border-stone-800 bg-black/20 px-3 py-2 text-sm text-[var(--ink-muted)]">
          Stored matches were recorded before sequence, Meter, Tag, and Assist tracking. Play a new
          match to fill the charts below. Pace and damage from those older recordings still show above.
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartPanel title="Turns per finished match" caption={`Red line is the ${String(BASELINE_TURNS)}-turn baseline.`}>
          <TurnHistogram turns={aggregates.finishedTurns} baselineAt={BASELINE_TURNS} />
        </ChartPanel>
        <ChartPanel title="Pace" caption="On-pace, empty-early, dragging, grinding, or long-active.">
          <BarList items={aggregates.verdictMix} warnKeys={new Set(["dragging", "grinding", "empty-early"])} />
        </ChartPanel>
        {fighting.sampledMatches > 0 ? (
          <>
            <ChartPanel title="Sequence roles" caption="Starter opens, extender keeps the combo, finisher ends it.">
              <BarList items={fighting.sequenceMix} />
            </ChartPanel>
            <ChartPanel title="Hit strength" caption="Light, medium, and heavy change the Meter a hit grants.">
              <BarList items={fighting.strengthMix} />
            </ChartPanel>
            <ChartPanel title="What players committed to" caption="Faces, Techniques, Assists, Tags, rerolls, and ending the sequence.">
              <BarList items={fighting.commitmentMix} />
            </ChartPanel>
            <ChartPanel title="Chain answers" caption="Counter, Parry, Brace, and Shift against reaction windows.">
              <BarList items={fighting.defenseMix} />
            </ChartPanel>
            <ChartPanel title="Declared hits" caption="Face, Technique, and Assist names.">
              <BarList items={fighting.hitNames} />
            </ChartPanel>
            <ChartPanel title="Fighter actions" caption="Faces, Techniques, Assists, and Tags in. The label includes damage taken.">
              <BarList items={fighting.fighterMix} />
            </ChartPanel>
            <ChartPanel title="Seat split" caption="Hits, Meter spent, and Tags by seat.">
              <BarList items={fighting.seatMix} />
            </ChartPanel>
            <ChartPanel title="Rejected attempts" caption="Illegal clicks. INSUFFICIENT_METER means the pool was short.">
              <BarList items={fighting.rejectionMix} warnKeys={new Set(["INSUFFICIENT_METER"])} />
            </ChartPanel>
          </>
        ) : null}
        <ChartPanel title="Cards played" caption="Each play, including Responses, Modifies, and EX.">
          <BarList items={aggregates.cardPlayMix} />
        </ChartPanel>
        <ChartPanel title="Think time by action (p90)" caption="Wall-clock gap before that action. Host and local clocks are the fair ones.">
          <BarList
            items={Object.fromEntries(
              Object.entries(aggregates.thinkByAction).map(([type, stats]) => [type, stats.p90 ?? 0]),
            )}
          />
        </ChartPanel>
        <ChartPanel title="Opening seat" caption="Finished matches with a known first player.">
          <BarList items={aggregates.firstPlayerWinMix} />
        </ChartPanel>
        <ChartPanel title="How you played" caption="Hotseat, local vs AI, host, or guest. Same match is kept once.">
          <BarList items={aggregates.recordedAsMix} />
        </ChartPanel>
        <ChartPanel title="Deck pairs" caption="Finished matches. Label is P1 deck vs P2 deck.">
          <BarList items={aggregates.deckPairMix} />
        </ChartPanel>
        <ChartPanel title="First Fighter defeated" caption="Turns 1–3 are early. After turn 10, or never, the close is late.">
          <BarList items={aggregates.firstDefeatHistogram} warnKeys={new Set(["1–3 early", "11+ overtime", "never"])} />
        </ChartPanel>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">Insights</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {insights.map((insight) => (
            <li key={insight.id} className={`rounded border px-3 py-2 text-sm ${severityClass(insight.severity)}`}>
              <p className="font-semibold">
                {insight.title} <span className="font-mono text-xs opacity-70">{insight.severity}</span>
              </p>
              <p className="mt-1 text-[var(--ink-muted)]">{insight.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">Recorded matches</h2>
          {recordings.length > 0 ? (
            <button
              type="button"
              className="text-xs text-stone-500 hover:text-red-300"
              onClick={() => {
                if (window.confirm("Delete every stored recording on this browser?")) void clearAll();
              }}
            >
              Clear all
            </button>
          ) : null}
        </div>
        {recordings.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            Play a hotseat, vs AI, or host match. This tab fills as actions resolve.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded border border-stone-800">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="bg-black/30 text-[10px] uppercase tracking-[0.16em] text-amber-200/70">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Turns</th>
                  <th className="px-3 py-2">Pace</th>
                  <th className="px-3 py-2">Sequence</th>
                  <th className="px-3 py-2">Meter</th>
                  <th className="px-3 py-2">Tag/Assist</th>
                  <th className="px-3 py-2">Dmg/turn</th>
                  <th className="px-3 py-2">First KO</th>
                  <th className="px-3 py-2">Decks</th>
                  <th className="px-3 py-2">Winner</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {recordings.map((row) => {
                  const pace = matchPace(row);
                  const death = firstDefeatTurn(row);
                  const active = row.recordingId === selectedId;
                  const sequence =
                    row.fighting === undefined
                      ? "—"
                      : `${String(row.fighting.starters)}/${String(row.fighting.extenders)}/${String(row.fighting.finishers)}`;
                  return (
                    <tr
                      key={row.recordingId}
                      className={`cursor-pointer border-t border-stone-800/80 ${active ? "bg-[var(--accent)]/10" : "hover:bg-white/5"}`}
                      onClick={() => select(active ? null : row.recordingId)}
                    >
                      <td className="px-3 py-2 font-mono text-xs text-stone-300">{row.startedAt.slice(0, 19).replace("T", " ")}</td>
                      <td className="px-3 py-2 text-[var(--ink-muted)]">{statusLabel(row.status)} · {recordedAsLabel(row.recordedAs)}</td>
                      <td className={`px-3 py-2 font-mono ${pace.overBaseline ? "text-red-300" : "text-stone-200"}`}>{row.totalTurns}</td>
                      <td className="px-3 py-2 text-xs text-stone-300">{pace.verdict}</td>
                      <td className="px-3 py-2 font-mono text-xs">{sequence}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {row.fighting === undefined ? "—" : `${String(row.fighting.meterSpent)}/${String(row.fighting.meterGained)}`}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {row.fighting === undefined ? "—" : `${String(row.fighting.tags)}/${String(row.fighting.assists)}`}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {row.totalTurns > 0 ? (row.totalDamageDealt / row.totalTurns).toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{death === null ? "—" : death}</td>
                      <td className="px-3 py-2 text-xs text-stone-400">{row.p1DeckName} vs {row.p2DeckName}</td>
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

function ChartPanel({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return (
    <section className="rounded border border-stone-800 bg-black/20 p-4">
      <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">{caption}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}
