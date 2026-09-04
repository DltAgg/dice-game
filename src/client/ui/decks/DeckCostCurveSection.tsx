import type { CardId } from "@server";
import { DeckCostChart } from "./DeckCostChart";

export function DeckCostCurveSection({ deck }: { deck: readonly CardId[] }) {
  return (
    <section className="rounded-xl border border-stone-800/80 bg-stone-950/40 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Cost curve
      </h2>
      <p className="mt-1 text-xs text-stone-500">
        Copies at each header cost, split Natural / Synthetic and stacked by type. Labels show
        quantity × cost. Click a bar for the mix at that cost.
      </p>
      <div className="mt-3">
        <DeckCostChart deck={deck} />
      </div>
    </section>
  );
}
