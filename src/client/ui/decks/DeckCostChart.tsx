import { useMemo, useState, type KeyboardEvent } from "react";
import type { CardId, CardType } from "@server";
import {
  CARD_TYPE_LABELS,
  COST_CURVE_CAP,
  deckCostTypeOrder,
  summarizeDeckCosts,
  type DeckCostBucket,
} from "./deckCostStats";

const TYPE_COLORS: Record<CardType, string> = {
  instant: "#94a3b8",
  reaction: "#7dd3fc",
  equipment: "#c4a574",
  overload: "#c084fc",
  ritual: "#86efac",
};

const CHART = {
  width: 520,
  height: 200,
  padLeft: 36,
  padRight: 12,
  padTop: 12,
  padBottom: 32,
} as const;

function barGeometry(
  summary: ReturnType<typeof summarizeDeckCosts>,
): {
  readonly plotWidth: number;
  readonly plotHeight: number;
  readonly barWidth: number;
  readonly maxCount: number;
} {
  const plotWidth = CHART.width - CHART.padLeft - CHART.padRight;
  const plotHeight = CHART.height - CHART.padTop - CHART.padBottom;
  const barWidth = plotWidth / (COST_CURVE_CAP + 1) - 8;
  const maxCount = Math.max(1, ...summary.buckets.map((row) => row.total));
  return { plotWidth, plotHeight, barWidth, maxCount };
}

function BucketDetail({ bucket }: { readonly bucket: DeckCostBucket }) {
  if (bucket.total === 0) {
    return <p className="text-xs text-stone-600">No cards at this cost.</p>;
  }
  return (
    <ul className="space-y-1 text-xs text-stone-300">
      {bucket.cards.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium text-stone-100">{entry.name}</span>
          <span className="text-stone-500">
            ×{entry.copies} · {CARD_TYPE_LABELS[entry.type]} · {entry.attribute} · cost{" "}
            {entry.cost}
          </span>
        </li>
      ))}
    </ul>
  );
}

function selectBucketFromKey(
  event: KeyboardEvent<SVGGElement>,
  bucket: number,
  onSelect: (bucket: number) => void,
): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelect(bucket);
  }
}

export function DeckCostChart({ deck }: { readonly deck: readonly CardId[] }) {
  const summary = useMemo(() => summarizeDeckCosts(deck), [deck]);
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const { plotHeight, barWidth, maxCount } = barGeometry(summary);

  const resolvedBucket = selectedBucket ?? summary.peakBucket;
  const activeBucket = summary.buckets.find((row) => row.bucket === resolvedBucket);

  if (summary.cardCount === 0) {
    return (
      <p className="rounded-lg border border-dashed border-stone-800 px-4 py-6 text-center text-sm text-stone-600">
        Add tactics to see the cost curve.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-stone-400">
        <span>
          Cards: <span className="text-stone-200">{summary.cardCount}</span>
        </span>
        <span>
          Unique: <span className="text-stone-200">{summary.uniqueCards}</span>
        </span>
        <span>
          Avg cost: <span className="text-stone-200">{summary.averageCost.toFixed(2)}</span>
        </span>
        <span>
          Peak:{" "}
          <span className="text-stone-200">
            {summary.peakCount} @ {bucketLabel(summary.peakBucket)}
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${String(CHART.width)} ${String(CHART.height)}`}
              className="w-full min-w-[280px]"
              role="img"
              aria-label="Deck cost curve by total header cost"
            >
              <title>Deck cost curve — copies per total header cost bucket</title>
              {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
                const y = CHART.padTop + plotHeight * (1 - tick);
                const value = Math.round(maxCount * tick);
                return (
                  <g key={tick}>
                    <line
                      x1={CHART.padLeft}
                      x2={CHART.width - CHART.padRight}
                      y1={y}
                      y2={y}
                      stroke="#292524"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={CHART.padLeft - 6}
                      y={y + 4}
                      textAnchor="end"
                      fill="#78716c"
                      fontSize="10"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              {summary.buckets.map((row) => {
                const x = CHART.padLeft + row.bucket * (barWidth + 8) + 4;
                let yCursor = CHART.padTop + plotHeight;
                const selected = row.bucket === resolvedBucket;

                return (
                  <g
                    key={row.bucket}
                    onClick={() => setSelectedBucket(row.bucket)}
                    onKeyDown={(event) =>
                      selectBucketFromKey(event, row.bucket, setSelectedBucket)
                    }
                    tabIndex={0}
                    role="button"
                    aria-pressed={selected}
                    aria-label={`Cost ${row.label}: ${String(row.total)} cards`}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      x={x - 2}
                      y={CHART.padTop}
                      width={barWidth + 4}
                      height={plotHeight + 22}
                      fill="transparent"
                    />
                    {deckCostTypeOrder().map((type) => {
                      const count = row.byType[type];
                      if (count <= 0) return null;
                      const segmentHeight = (count / maxCount) * plotHeight;
                      yCursor -= segmentHeight;
                      return (
                        <rect
                          key={type}
                          x={x}
                          y={yCursor}
                          width={barWidth}
                          height={segmentHeight}
                          fill={TYPE_COLORS[type]}
                          opacity={selected ? 1 : 0.4}
                        />
                      );
                    })}
                    {row.total > 0 && (
                      <text
                        x={x + barWidth / 2}
                        y={CHART.padTop + plotHeight - (row.total / maxCount) * plotHeight - 4}
                        textAnchor="middle"
                        fill="#e7e5e4"
                        fontSize="10"
                      >
                        {row.total}
                      </text>
                    )}
                    <text
                      x={x + barWidth / 2}
                      y={CHART.height - 10}
                      textAnchor="middle"
                      fill={selected ? "#e7e5e4" : "#a8a29e"}
                      fontSize="11"
                      fontWeight={selected ? 700 : 400}
                    >
                      {row.label}
                    </text>
                  </g>
                );
              })}

              <text
                x={CHART.width / 2}
                y={CHART.height - 2}
                textAnchor="middle"
                fill="#78716c"
                fontSize="10"
              >
                Total header cost (pile tokens)
              </text>
              <text
                x={12}
                y={CHART.padTop + plotHeight / 2}
                textAnchor="middle"
                fill="#78716c"
                fontSize="10"
                transform={`rotate(-90 12 ${String(CHART.padTop + plotHeight / 2)})`}
              >
                Copies
              </text>
            </svg>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-stone-400">
            {deckCostTypeOrder().map((type) => (
              <span key={type} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: TYPE_COLORS[type] }}
                />
                {CARD_TYPE_LABELS[type]}
              </span>
            ))}
          </div>
        </div>

        <aside
          className="flex min-h-[10rem] w-full shrink-0 flex-col rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 md:w-64 lg:w-72"
          aria-live="polite"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
            {activeBucket === undefined
              ? "Bucket detail"
              : `Cost ${activeBucket.label} · ${String(activeBucket.total)} copies`}
          </p>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
            {activeBucket !== undefined ? (
              <BucketDetail bucket={activeBucket} />
            ) : (
              <p className="text-xs text-stone-600">Click a bar to inspect cards.</p>
            )}
          </div>
        </aside>
      </div>

      <p className="text-[11px] leading-relaxed text-stone-600">
        Header cost = sum of printed pile tokens. Natural forges are free; synthetic forges still
        pay header cost unless discounted.
      </p>
    </div>
  );
}

function bucketLabel(bucket: number): string {
  return bucket >= COST_CURVE_CAP ? `${String(COST_CURVE_CAP)}+` : String(bucket);
}
