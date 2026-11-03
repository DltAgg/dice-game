import {
  firstDefeatTurn,
  firstSequenceTurn,
  matchPace,
  recordedAsLabel,
  turnHits,
  turnKind,
  type MatchRecording,
} from "@client/metrics";
import { formatDuration, SparkBars } from "./charts";

export function MatchDetail({ recording }: { recording: MatchRecording }) {
  const pace = matchPace(recording);
  const fighting = recording.fighting;
  const damage = recording.turns.map((turn) => turn.damageDealt);
  const tones = recording.turns.map(turnKind);
  const meter = recording.turns.map((turn) => turn.fighting?.meterGained ?? 0);
  const hpP1 = recording.turns.map((turn) =>
    turn.hp.filter((creature) => creature.ownerId === "p1").reduce((sum, creature) => sum + creature.remaining, 0),
  );
  const think = recording.actions.filter((sample) => !sample.reconstructed).map((sample) => sample.deltaMs);
  const hits = fighting === undefined ? "—" : `${String(fighting.starters)}/${String(fighting.extenders)}/${String(fighting.finishers)}`;

  return (
    <section className="rounded border border-stone-800 bg-black/20 p-4">
      <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">{recording.matchId}</h2>
      <p className="mt-1 text-xs text-[var(--ink-muted)]">
        seed {String(recording.seed)} · {recording.p1DeckName} vs {recording.p2DeckName} · recorded as{" "}
        {recordedAsLabel(recording.recordedAs)}
        {recording.roomCode !== null ? ` · room ${recording.roomCode}` : ""} · {pace.verdict} · drag{" "}
        {String(pace.dragScore)} · sequence {hits} · meter {String(fighting?.meterSpent ?? "—")}/
        {String(fighting?.meterGained ?? "—")} · tag {String(fighting?.tags ?? "—")} · assist{" "}
        {String(fighting?.assists ?? "—")} · first hit T{firstSequenceTurn(recording) ?? "—"} · death T
        {firstDefeatTurn(recording) ?? "—"}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/70">
            Damage per turn (green combat · gold setup · red idle)
          </p>
          <SparkBars values={damage} tones={tones} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/70">Meter gained per turn</p>
          <SparkBars values={meter} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/70">P1 HP remaining by turn</p>
          <SparkBars values={hpP1} />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-xs">
          <thead className="text-[10px] uppercase tracking-[0.16em] text-amber-200/70">
            <tr>
              <th className="py-1 pr-3">Turn</th>
              <th className="py-1 pr-3">Seat</th>
              <th className="py-1 pr-3">Active</th>
              <th className="py-1 pr-3">Hits</th>
              <th className="py-1 pr-3">S/E/F</th>
              <th className="py-1 pr-3">Dmg</th>
              <th className="py-1 pr-3">Meter</th>
              <th className="py-1 pr-3">Tag</th>
              <th className="py-1 pr-3">Assist</th>
              <th className="py-1 pr-3">Cards</th>
              <th className="py-1 pr-3">Answers</th>
              <th className="py-1 pr-3">KO</th>
              <th className="py-1 pr-3">Clock</th>
            </tr>
          </thead>
          <tbody>
            {recording.turns.map((row) => {
              const kind = turnKind(row);
              const rowHits = turnHits(row);
              const rowFighting = row.fighting;
              return (
                <tr key={row.turn} className="border-t border-stone-800/80">
                  <td className="py-1 pr-3 font-mono">
                    {row.turn}{" "}
                    <span
                      className={
                        kind === "idle" ? "text-red-300" : kind === "setup" ? "text-amber-200/80" : "text-stone-500"
                      }
                    >
                      {kind}
                    </span>
                  </td>
                  <td className="py-1 pr-3">{row.playerId}</td>
                  <td className="py-1 pr-3">{rowFighting?.activeFighterName ?? "—"}</td>
                  <td className="py-1 pr-3 font-mono">{rowHits ?? row.attacksDeclared}</td>
                  <td className="py-1 pr-3 font-mono">
                    {rowFighting === undefined
                      ? "—"
                      : `${String(rowFighting.starters)}/${String(rowFighting.extenders)}/${String(rowFighting.finishers)}`}
                  </td>
                  <td className="py-1 pr-3 font-mono">{row.damageDealt}</td>
                  <td className="py-1 pr-3 font-mono">
                    {rowFighting === undefined
                      ? "—"
                      : `+${String(rowFighting.meterGained)}/−${String(rowFighting.meterSpent)}`}
                  </td>
                  <td className="py-1 pr-3 font-mono">{rowFighting?.tags ?? "—"}</td>
                  <td className="py-1 pr-3 font-mono">{rowFighting?.assists ?? "—"}</td>
                  <td className="py-1 pr-3 font-mono">{row.cardsPlayed}</td>
                  <td className="py-1 pr-3 font-mono">
                    {rowFighting === undefined
                      ? row.reactionWindows
                      : `${String(rowFighting.counters + rowFighting.parries + rowFighting.braces + rowFighting.shifts)}/${String(row.reactionWindows)}`}
                  </td>
                  <td className="py-1 pr-3 font-mono">{row.creaturesDefeated}</td>
                  <td className="py-1 pr-3 font-mono">{formatDuration(row.durationMs)}</td>
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
            t{sample.turn} {sample.actionType ?? "tick"} {sample.accepted ? "ok" : sample.errorCode} Δ
            {formatDuration(sample.deltaMs)}
            {sample.eventTypes.length > 0 ? ` · ${sample.eventTypes.join(",")}` : ""}
          </li>
        ))}
      </ul>
    </section>
  );
}
