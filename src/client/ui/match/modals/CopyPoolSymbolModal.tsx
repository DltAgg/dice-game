import {
  type GameState,
  type PlayerId,
  type SymbolType,
} from "@server";
import {
  CausedByLine,
} from "../tooltips/decisionSource";

export function CopyPoolSymbolModal({
  state,
  controllerId,
  onPick,
}: {
  state: GameState;
  controllerId: PlayerId;
  onPick: (symbol: SymbolType) => void;
}) {
  const types = new Set<SymbolType>();
  for (const symbol of Object.values(state.symbols)) {
    if (symbol.ownerId !== controllerId) continue;
    if (symbol.status !== "rolled" && symbol.status !== "available") continue;
    types.add(symbol.symbol);
  }
  const options = [...types];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Copy a pool symbol
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Choose a symbol type already in your rolled / available pool to copy.
        </p>
        <CausedByLine state={state} />
        <ul className="mt-4 space-y-2">
          {options.map((symbol) => (
            <li key={symbol}>
              <button
                type="button"
                className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left capitalize hover:border-[var(--accent)]"
                onClick={() => onPick(symbol)}
              >
                {symbol}
              </button>
            </li>
          ))}
          {options.length === 0 && (
            <li className="text-sm text-red-300">No pool symbols available to copy.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
