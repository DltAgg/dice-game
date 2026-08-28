import {
  isAttributeSymbol,
  usableSymbols,
  type GameState,
  type PlayerId,
  type SymbolInstanceId,
} from "@server";

export function SymbolPool({
  state,
  playerId,
  phase,
  selected,
  onSelect,
}: {
  state: GameState;
  playerId: PlayerId;
  phase: GameState["phase"];
  selected: SymbolInstanceId | null;
  onSelect: (id: SymbolInstanceId) => void;
}) {
  const poolUsable = usableSymbols(state, playerId);
  const poolUnusable = Object.values(state.symbols).filter(
    (symbol) =>
      symbol.ownerId === playerId &&
      (symbol.status === "rolled" || symbol.status === "available") &&
      symbol.usable === false,
  );
  const canPick = phase === "actions";
  const symbols = [...poolUsable, ...poolUnusable];

  if (symbols.length === 0) {
    return (
      <p className="text-center text-xs uppercase tracking-[0.18em] text-stone-600">
        No symbols in the pool · attributes auto-bank into your pile
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="mr-2 text-xs uppercase tracking-[0.18em] text-stone-500">
        Symbol pool
      </span>
      {symbols.map((symbol) => {
        const unusable = symbol.usable === false;
        const pickable = canPick && !unusable;
        const fromDie = symbol.status === "rolled" || symbol.sourceDieId !== null;
        const provenance = fromDie ? "die" : "effect";
        return (
          <button
            key={symbol.id}
            type="button"
            disabled={!pickable}
            title={
              unusable
                ? "Unusable (cannot bank or pay costs)"
                : fromDie
                  ? isAttributeSymbol(symbol.symbol)
                    ? "Rolled attribute (should already be in your pile)"
                    : "Rolled Shield — click, then choose a creature"
                  : isAttributeSymbol(symbol.symbol)
                    ? "Effect attribute — click to bank into your pile"
                    : "Effect Shield — click, then choose a creature"
            }
            className={
              selected === symbol.id
                ? "rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-2 py-1 text-sm capitalize text-[var(--accent)]"
                : unusable
                  ? "rounded border border-stone-800 bg-stone-950 px-2 py-1 text-sm capitalize text-stone-600 line-through opacity-60"
                  : pickable
                    ? "rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm capitalize text-stone-200 hover:border-stone-500"
                    : "rounded border border-stone-800 bg-stone-950 px-2 py-1 text-sm capitalize text-stone-500"
            }
            onClick={() => {
              if (pickable) onSelect(symbol.id);
            }}
          >
            {symbol.symbol}
            {unusable ? " · unusable" : ` · ${provenance}`}
          </button>
        );
      })}
    </div>
  );
}
