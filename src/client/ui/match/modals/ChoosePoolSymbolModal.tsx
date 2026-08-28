import {
  type GameState,
  type SymbolInstanceId,
} from "@server";
import {
  CausedByLine,
} from "../tooltips/decisionSource";

export function ChoosePoolSymbolModal({
  state,
  eligibleSymbolIds,
  onPick,
}: {
  state: GameState;
  eligibleSymbolIds: readonly SymbolInstanceId[];
  onPick: (symbolId: SymbolInstanceId) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Choose a pool symbol
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Pick a synthetic symbol from your pool to arm as a requirement wildcard.
        </p>
        <CausedByLine state={state} />
        <ul className="mt-4 space-y-2">
          {eligibleSymbolIds.map((symbolId) => {
            const symbol = state.symbols[symbolId];
            return (
              <li key={symbolId}>
                <button
                  type="button"
                  className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left capitalize hover:border-[var(--accent)]"
                  onClick={() => onPick(symbolId)}
                >
                  <p className="text-sm font-medium text-stone-100">
                    {symbol?.symbol ?? symbolId}
                  </p>
                  <p className="text-xs text-stone-500">
                    {symbol?.status ?? "?"}
                    {symbol?.usable === false ? " · unusable" : ""}
                  </p>
                </button>
              </li>
            );
          })}
          {eligibleSymbolIds.length === 0 && (
            <li className="text-sm text-red-300">No eligible pool symbols.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
