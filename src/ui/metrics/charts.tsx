import { linearRegression } from "@/metrics";

const ACCENT = "#c4a574";
const MUTED = "#a89f91";
const STALL = "#b4533a";
const OK = "#6b8f71";

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${String(Math.round(ms))}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${String(minutes)}m ${String(seconds)}s`;
}

export function formatPct(value: number | null, digits = 0): string {
  if (value === null) return "—";
  return `${value.toFixed(digits)}%`;
}

export function StatCard({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded border border-stone-800 bg-black/20 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/70">{label}</p>
      <p className={`mt-1 font-mono text-2xl ${warn === true ? "text-red-300" : "text-[var(--ink)]"}`}>
        {value}
      </p>
      {hint !== undefined ? <p className="mt-1 text-xs text-[var(--ink-muted)]">{hint}</p> : null}
    </div>
  );
}

export function BarList({
  items,
  maxItems = 10,
  warnKeys,
}: {
  items: Readonly<Record<string, number>>;
  maxItems?: number;
  warnKeys?: ReadonlySet<string>;
}) {
  const rows = Object.entries(items)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems);
  const max = Math.max(1, ...rows.map(([, value]) => value));
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--ink-muted)]">No data yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map(([label, value]) => (
        <li key={label} className="grid grid-cols-[minmax(0,7rem)_1fr_2.5rem] items-center gap-2 text-xs">
          <span className="truncate text-[var(--ink-muted)]" title={label}>
            {label}
          </span>
          <div className="h-2 overflow-hidden rounded bg-stone-900">
            <div
              className="h-full rounded"
              style={{
                width: `${(value / max) * 100}%`,
                background: warnKeys?.has(label) === true ? STALL : ACCENT,
              }}
            />
          </div>
          <span className="text-right font-mono text-stone-300">{value}</span>
        </li>
      ))}
    </ul>
  );
}

export function TurnHistogram({
  turns,
  baselineAt,
}: {
  turns: readonly number[];
  baselineAt: number;
}) {
  const maxTurn = Math.max(baselineAt + 8, ...turns, 1);
  const buckets = Array.from({ length: maxTurn }, (_, index) => index + 1);
  const counts = new Map<number, number>();
  for (const turn of turns) {
    const key = Math.min(turn, maxTurn);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const peak = Math.max(1, ...counts.values());
  const width = 520;
  const height = 140;
  const barW = width / buckets.length;

  return (
    <svg viewBox={`0 0 ${String(width)} ${String(height + 24)}`} className="w-full" role="img">
      <title>Finished match length in turns</title>
      {buckets.map((turn, index) => {
        const count = counts.get(turn) ?? 0;
        const h = (count / peak) * height;
        const fill = turn > baselineAt ? STALL : OK;
        return (
          <g key={turn}>
            <rect
              x={index * barW + 1}
              y={height - h}
              width={Math.max(1, barW - 2)}
              height={h}
              fill={fill}
              opacity={count === 0 ? 0.15 : 0.9}
            />
          </g>
        );
      })}
      <line
        x1={baselineAt * barW}
        y1={0}
        x2={baselineAt * barW}
        y2={height}
        stroke={STALL}
        strokeDasharray="3 3"
        opacity={0.9}
      />
      <text x={baselineAt * barW + 4} y={12} fill={STALL} fontSize={10}>
        {baselineAt}+ overtime
      </text>
      <text x={0} y={height + 16} fill={MUTED} fontSize={10}>
        1
      </text>
      <text x={width - 24} y={height + 16} fill={MUTED} fontSize={10}>
        {maxTurn}+
      </text>
    </svg>
  );
}

export function SparkBars({
  values,
  tones,
}: {
  values: readonly number[];
  tones?: readonly ("combat" | "setup" | "idle")[];
}) {
  const max = Math.max(1, ...values);
  const width = 520;
  const height = 80;
  const barW = values.length === 0 ? 1 : width / values.length;
  return (
    <svg viewBox={`0 0 ${String(width)} ${String(height)}`} className="w-full" role="img">
      <title>Per-turn values</title>
      {values.map((value, index) => {
        const h = (value / max) * (height - 4);
        const tone = tones?.[index];
        const fill = tone === "idle" ? STALL : tone === "setup" ? ACCENT : OK;
        return (
          <rect
            key={index}
            x={index * barW + 0.5}
            y={height - h}
            width={Math.max(1, barW - 1)}
            height={Math.max(h, tone === "combat" || tone === undefined ? 0 : 3)}
            fill={fill}
            opacity={0.9}
          />
        );
      })}
    </svg>
  );
}

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const padded = value * 1.15;
  const pow = 10 ** Math.floor(Math.log10(padded));
  const unit = padded / pow;
  const nice = unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 5 ? 5 : 10;
  return nice * pow;
}

function fmtAxis(value: number): string {
  if (value >= 10) return value.toFixed(0);
  if (value >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

export function ScatterPlot({
  points,
  xLabel,
  yLabel,
  title,
}: {
  points: readonly { readonly x: number; readonly y: number; readonly label?: string }[];
  xLabel: string;
  yLabel: string;
  title: string;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-[var(--ink-muted)]">No data yet.</p>;
  }

  const width = 520;
  const height = 220;
  const padL = 44;
  const padR = 14;
  const padT = 12;
  const padB = 36;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const xMax = niceMax(Math.max(0, ...points.map((point) => point.x)));
  const yMax = niceMax(Math.max(0, ...points.map((point) => point.y)));
  const toX = (value: number) => padL + (value / xMax) * plotW;
  const toY = (value: number) => padT + plotH - (value / yMax) * plotH;
  const fit = linearRegression(
    points.map((point) => point.x),
    points.map((point) => point.y),
  );
  const yTicks = [0, yMax / 2, yMax];
  const xTicks = [0, xMax / 2, xMax];

  return (
    <svg viewBox={`0 0 ${String(width)} ${String(height)}`} className="w-full" role="img">
      <title>{title}</title>
      <defs>
        <clipPath id="metrics-scatter-clip">
          <rect x={padL} y={padT} width={plotW} height={plotH} />
        </clipPath>
      </defs>
      <rect x={padL} y={padT} width={plotW} height={plotH} fill="#0c0a09" opacity={0.35} />
      {yTicks.map((tick) => (
        <g key={`y-${String(tick)}`}>
          <line
            x1={padL}
            y1={toY(tick)}
            x2={padL + plotW}
            y2={toY(tick)}
            stroke={MUTED}
            strokeOpacity={0.18}
          />
          <text x={padL - 6} y={toY(tick) + 3} textAnchor="end" fill={MUTED} fontSize={10}>
            {fmtAxis(tick)}
          </text>
        </g>
      ))}
      {xTicks.map((tick) => (
        <text key={`x-${String(tick)}`} x={toX(tick)} y={height - 18} textAnchor="middle" fill={MUTED} fontSize={10}>
          {fmtAxis(tick)}
        </text>
      ))}
      <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke={MUTED} strokeOpacity={0.5} />
      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke={MUTED} strokeOpacity={0.5} />
      {fit !== null ? (
        <line
          clipPath="url(#metrics-scatter-clip)"
          x1={toX(0)}
          y1={toY(fit.intercept)}
          x2={toX(xMax)}
          y2={toY(fit.slope * xMax + fit.intercept)}
          stroke={OK}
          strokeDasharray="4 3"
          strokeOpacity={0.85}
        />
      ) : null}
      {points.map((point, index) => (
        <circle
          key={`${point.label ?? "p"}-${String(index)}`}
          cx={toX(point.x)}
          cy={toY(point.y)}
          r={5}
          fill={ACCENT}
          stroke="#1c1917"
          strokeWidth={1}
        >
          <title>
            {point.label ?? "match"}: effect {point.x.toFixed(2)}/turn, forge {point.y.toFixed(2)}/turn
          </title>
        </circle>
      ))}
      <text x={padL + plotW / 2} y={height - 4} textAnchor="middle" fill={MUTED} fontSize={10}>
        {xLabel}
      </text>
      <text
        x={12}
        y={padT + plotH / 2}
        textAnchor="middle"
        fill={MUTED}
        fontSize={10}
        transform={`rotate(-90 12 ${String(padT + plotH / 2)})`}
      >
        {yLabel}
      </text>
    </svg>
  );
}
