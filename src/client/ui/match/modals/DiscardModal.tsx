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
  btnClass,
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
  optional,
  onToggle,
  onConfirm,
  onDecline,
}: {
  state: GameState;
  amount: number;
  pick: readonly CardInstanceId[];
  optional: boolean;
  onToggle: (id: CardInstanceId) => void;
  onConfirm: () => void;
  onDecline?: () => void;
}) {
  const pending = state.pendingDecision;
  if (pending === null || pending.type !== "discard-cards") return null;
  const hand = handOf(state, pending.controllerId);
  const canConfirm = optional ? pick.length <= amount : pick.length === amount;
  const confirmNone = optional && pick.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Discard from hand
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          {optional
            ? `You may discard up to ${String(amount)} card${amount === 1 ? "" : "s"} from your hand. You may Decline.`
            : `Choose ${String(amount)} card${amount === 1 ? "" : "s"} from your hand to discard.`}
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
          className={`${btnPrimary} mt-4 w-full`}
          disabled={!canConfirm}
          onClick={onConfirm}
        >
          {confirmNone
            ? `Confirm none (0/${String(amount)})`
            : `Confirm discard (${String(pick.length)}/${String(amount)})`}
        </button>
        {optional && onDecline !== undefined && (
          <button type="button" className={`${btnClass} mt-2 w-full`} onClick={onDecline}>
            Decline
          </button>
        )}
      </div>
    </div>
  );
}
