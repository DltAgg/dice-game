import {
  useMemo,
  useState,
} from "react";
import {
  getCard,
  playCostTotal,
  searchableInDeck,
  searchableInGraveyard,
  type CardInstanceId,
  type CardType,
  type GameState,
} from "@server";
import {
  formatCardTypeList,
  maxPlayCostPhrase,
} from "../intents/hintFor";
import {
  BoardModal,
  TacticChoiceContent,
} from "./BoardModal";
import {
  btnPrimary,
} from "../styles";
import {
  CausedByLine,
} from "../tooltips/decisionSource";

export function SearchPanel({
  state,
  amount,
  pick,
  mode,
  onToggle,
  onConfirm,
}: {
  state: GameState;
  amount: number;
  pick: readonly CardInstanceId[];
  mode: "deck" | "graveyard";
  onToggle: (id: CardInstanceId) => void;
  onConfirm: () => void;
}) {
  const [sort, setSort] = useState<"name" | "cost" | "type">("cost");
  const [typeFilter, setTypeFilter] = useState<CardType | "all">("all");

  const pending = state.pendingDecision;
  const isDeck = pending?.type === "search-deck";
  const isGy = pending?.type === "search-graveyard";
  const matches = (mode === "deck" && isDeck) || (mode === "graveyard" && isGy);

  const options = useMemo(() => {
    if (!matches || pending === null) return [];
    if (pending.type === "search-deck") {
      return searchableInDeck(state, pending.controllerId, pending.filter);
    }
    if (pending.type === "search-graveyard") {
      return searchableInGraveyard(state, pending.controllerId, pending.maxPlayCost);
    }
    return [];
  }, [matches, pending, state]);

  const defsById = useMemo(() => {
    const map = new Map<CardInstanceId, ReturnType<typeof getCard>>();
    for (const instanceId of options) {
      const instance = state.cards[instanceId];
      map.set(instanceId, instance !== undefined ? getCard(instance.cardId) : undefined);
    }
    return map;
  }, [options, state.cards]);

  const presentTypes = useMemo(() => {
    const types = new Set<CardType>();
    for (const def of defsById.values()) {
      if (def !== undefined) types.add(def.type);
    }
    return [...types];
  }, [defsById]);

  const visible = useMemo(() => {
    const filtered = options.filter((id) => {
      if (typeFilter === "all") return true;
      return defsById.get(id)?.type === typeFilter;
    });
    const ranked = [...filtered];
    ranked.sort((a, b) => {
      const da = defsById.get(a);
      const db = defsById.get(b);
      if (sort === "cost") {
        const ca = da !== undefined ? playCostTotal(da) : 99;
        const cb = db !== undefined ? playCostTotal(db) : 99;
        return ca - cb;
      }
      if (sort === "type") {
        const ta = da?.type ?? "";
        const tb = db?.type ?? "";
        if (ta !== tb) return ta.localeCompare(tb);
      }
      return (da?.name ?? a).localeCompare(db?.name ?? b);
    });
    return ranked;
  }, [options, defsById, sort, typeFilter]);

  if (!matches || pending === null) return null;
  if (pending.type !== "search-deck" && pending.type !== "search-graveyard") return null;

  const exact = mode === "deck";
  const canConfirm = exact
    ? pick.length === Math.min(amount, options.length)
    : pick.length <= amount;
  const emptyOptions = options.length === 0;
  const confirmEmpty = !exact && pick.length === 0;

  const subtitle =
    pending.type === "search-deck"
      ? `Pick ${String(amount)} ${formatCardTypeList(pending.filter)} card${amount === 1 ? "" : "s"} from your deck.`
      : pending.maxPlayCost !== undefined
        ? `Pick up to ${String(amount)} card${amount === 1 ? "" : "s"} that ${maxPlayCostPhrase(pending.maxPlayCost)} from your graveyard to return to hand.`
        : `Pick up to ${String(amount)} card${amount === 1 ? "" : "s"} from your graveyard to return to hand.`;

  const confirmLabel = emptyOptions
    ? "Confirm — none"
    : confirmEmpty
      ? `Confirm none (0/${String(amount)})`
      : `Confirm (${String(pick.length)}/${String(amount)})`;

  return (
    <BoardModal
      title={mode === "deck" ? "Search deck" : "Search graveyard"}
      subtitle={subtitle}
      causedBy={<CausedByLine state={state} />}
      wide={options.length > 4}
      onConfirm={canConfirm ? onConfirm : undefined}
      onDismiss={emptyOptions && canConfirm ? onConfirm : undefined}
    >
      {options.length > 6 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-[0.65rem] uppercase tracking-wide text-stone-500">
            Sort
            <select
              className="ml-2 rounded border border-stone-700 bg-stone-900 px-2 py-1 text-xs text-stone-200"
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as "name" | "cost" | "type")
              }
            >
              <option value="cost">Cost</option>
              <option value="type">Type</option>
              <option value="name">Name</option>
            </select>
          </label>
          {presentTypes.length > 1 && (
            <label className="text-[0.65rem] uppercase tracking-wide text-stone-500">
              Type
              <select
                className="ml-2 rounded border border-stone-700 bg-stone-900 px-2 py-1 text-xs text-stone-200"
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value === "all" ? "all" : (event.target.value as CardType))
                }
              >
                <option value="all">All</option>
                {presentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      <ul
        className={
          visible.length > 4
            ? "mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"
            : "mt-4 space-y-2"
        }
      >
        {visible.map((instanceId) => {
          const def = defsById.get(instanceId);
          const checked = pick.includes(instanceId);
          return (
            <li key={instanceId}>
              <button
                type="button"
                className={
                  checked
                    ? "w-full rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-3 py-2 text-left"
                    : "w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-stone-500"
                }
                disabled={!checked && pick.length >= amount}
                onClick={() => onToggle(instanceId)}
              >
                <TacticChoiceContent def={def} fallbackId={instanceId} />
              </button>
            </li>
          );
        })}
        {emptyOptions && (
          <li className="rounded border border-amber-800/60 bg-amber-950/40 px-3 py-3 text-sm text-amber-100">
            No eligible cards. Confirm to continue with none.
          </li>
        )}
      </ul>
      <button
        type="button"
        className={`${btnPrimary} mt-4 w-full`}
        disabled={!canConfirm}
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
      <p className="mt-2 text-[0.65rem] text-stone-500">
        Enter confirms when legal
        {emptyOptions ? " · Escape also confirms none" : ""}.
      </p>
    </BoardModal>
  );
}
