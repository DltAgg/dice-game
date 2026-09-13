import {
  useState,
} from "react";
import {
  attributeLabel,
  NATURAL_CONVERT_SYMBOLS,
  type DualKindAttribute,
  type GameState,
  type SymbolInstanceId,
} from "@server";
import {
  btnPrimary,
} from "../styles";

export function ConvertSymbolsModal({
  state,
  amount,
  eligibleSymbolIds,
  onConfirm,
}: {
  state: GameState;
  amount: number;
  eligibleSymbolIds: readonly SymbolInstanceId[];
  onConfirm: (
    replacements: readonly {
      readonly symbolId: SymbolInstanceId;
      readonly into: DualKindAttribute;
    }[],
  ) => void;
}) {
  const [selected, setSelected] = useState<readonly SymbolInstanceId[]>([]);
  const [intoById, setIntoById] = useState<Readonly<Partial<Record<SymbolInstanceId, DualKindAttribute>>>>(
    {},
  );

  const toggle = (id: SymbolInstanceId) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        setIntoById((map) => {
          const next = { ...map };
          delete next[id];
          return next;
        });
        return prev.filter((entry) => entry !== id);
      }
      if (prev.length >= amount) return prev;
      setIntoById((map) => ({ ...map, [id]: map[id] ?? "martial" }));
      return [...prev, id];
    });
  };

  const replacements = selected.flatMap((symbolId) => {
    const into = intoById[symbolId];
    return into === undefined ? [] : [{ symbolId, into }];
  });
  const ready = replacements.length === selected.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Convert symbols
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Pick up to {String(amount)} eligible symbol(s) and a Natural attribute for each. You may
          confirm with fewer or none.
        </p>
        <ul className="mt-4 space-y-2">
          {eligibleSymbolIds.map((symbolId) => {
            const symbol = state.symbols[symbolId];
            const checked = selected.includes(symbolId);
            return (
              <li key={symbolId} className="rounded border border-stone-700 bg-stone-900 p-3">
                <button
                  type="button"
                  className={
                    checked
                      ? "w-full text-left text-sm font-medium text-[var(--accent)]"
                      : "w-full text-left text-sm font-medium text-stone-100"
                  }
                  disabled={!checked && selected.length >= amount}
                  onClick={() => toggle(symbolId)}
                >
                  {symbol?.symbol ?? symbolId}
                  <span className="ml-2 text-xs font-normal capitalize text-stone-500">
                    {symbol?.status ?? "?"}
                  </span>
                </button>
                {checked && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {NATURAL_CONVERT_SYMBOLS.map((attr) => (
                      <button
                        key={attr}
                        type="button"
                        className={
                          intoById[symbolId] === attr
                            ? "rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-2 py-1 text-xs capitalize text-[var(--accent)]"
                            : "rounded border border-stone-700 px-2 py-1 text-xs capitalize text-stone-300 hover:border-stone-500"
                        }
                        onClick={() => setIntoById((map) => ({ ...map, [symbolId]: attr }))}
                      >
                        {attributeLabel(attr)}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
          {eligibleSymbolIds.length === 0 && (
            <li className="text-sm text-red-300">No eligible symbols.</li>
          )}
        </ul>
        <button
          type="button"
          className={`${btnPrimary} mt-4`}
          disabled={!ready}
          onClick={() => onConfirm(replacements)}
        >
          Confirm ({String(replacements.length)}/{String(amount)})
        </button>
      </div>
    </div>
  );
}
