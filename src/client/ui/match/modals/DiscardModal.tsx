import {
  getCard,
  handOf,
  type CardInstanceId,
  type GameState,
} from "@server";
import {
  formatPlayCostCompact,
} from "../intents/format";
import {
  btnPrimary,
} from "../styles";
import {
  CausedByLine,
} from "../tooltips/decisionSource";
import {
  TacticInspectHover,
} from "../tooltips/inspectHovers";

export function DiscardModal({
  state,
  amount,
  pick,
  onToggle,
  onConfirm,
}: {
  state: GameState;
  amount: number;
  pick: readonly CardInstanceId[];
  onToggle: (id: CardInstanceId) => void;
  onConfirm: () => void;
}) {
  const pending = state.pendingDecision;
  if (pending === null || pending.type !== "discard-cards") return null;
  const hand = handOf(state, pending.controllerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Discard from hand
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Choose {amount} card{amount === 1 ? "" : "s"} from your hand to discard.
        </p>
        <CausedByLine state={state} />
        <ul className="mt-4 space-y-2">
          {hand.map((card) => {
            const def = getCard(card.cardId);
            const checked = pick.includes(card.id);
            return (
              <li key={card.id}>
                <button
                  type="button"
                  className={
                    checked
                      ? "w-full rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-3 py-2 text-left"
                      : "w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-stone-500"
                  }
                  disabled={!checked && pick.length >= amount}
                  onClick={() => onToggle(card.id)}
                >
                  <p className="text-sm font-medium text-stone-100">
                    {def !== undefined ? (
                      <TacticInspectHover def={def} placement="below" />
                    ) : (
                      card.cardId
                    )}
                  </p>
                  <p className="text-xs text-stone-500">
                    {def !== undefined
                      ? `${formatPlayCostCompact(def)} · ${def.subtypes.join("/")}`
                      : ""}
                  </p>
                </button>
              </li>
            );
          })}
          {hand.length === 0 && (
            <li className="text-sm text-red-300">Hand is empty — nothing to discard.</li>
          )}
        </ul>
        <button
          type="button"
          className={`${btnPrimary} mt-4`}
          disabled={pick.length !== amount}
          onClick={onConfirm}
        >
          Confirm discard ({String(pick.length)}/{String(amount)})
        </button>
      </div>
    </div>
  );
}
