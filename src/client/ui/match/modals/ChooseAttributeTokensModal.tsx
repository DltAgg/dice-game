import {
  useState,
} from "react";
import {
  attributeLabel,
  ATTRIBUTES,
  requirementTotal,
  type Attribute,
  type GameState,
  type SymbolRequirement,
} from "@server";
import {
  btnPrimary,
} from "../styles";
import {
  CausedByLine,
} from "../tooltips/decisionSource";

export function ChooseAttributeTokensModal({
  state,
  pending,
  onConfirm,
}: {
  state: GameState;
  pending: Extract<NonNullable<GameState["pendingDecision"]>, { type: "choose-attribute-tokens" }>;
  onConfirm: (discarded: SymbolRequirement) => void;
}) {
  const tokenOwnerId = state.creatures[pending.creatureId]?.ownerId;
  const tokens = (tokenOwnerId === undefined ? {} : state.players[tokenOwnerId]?.attributePool) ?? {};
  const [pick, setPick] = useState<Readonly<Partial<Record<Attribute, number>>>>({});
  const assigned = requirementTotal(pick);
  const ready = assigned === pending.amount;

  const setAmount = (attribute: Attribute, next: number) => {
    const max = tokens[attribute] ?? 0;
    const clamped = Math.max(0, Math.min(max, Math.floor(next)));
    setPick((prev) => {
      const copy: Partial<Record<Attribute, number>> = { ...prev };
      if (clamped <= 0) delete copy[attribute];
      else copy[attribute] = clamped;
      return copy;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Discard from attribute pile
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Name {String(pending.amount)} pip(s) from that creature owner&apos;s attribute pile.
          Assigned: {String(assigned)}/{String(pending.amount)}.
        </p>
        <CausedByLine state={state} />
        <ul className="mt-4 space-y-2">
          {ATTRIBUTES.filter((attribute) => (tokens[attribute] ?? 0) > 0).map((attribute) => {
            const held = tokens[attribute] ?? 0;
            const value = pick[attribute] ?? 0;
            return (
              <li
                key={attribute}
                className="flex items-center justify-between rounded border border-stone-700 bg-stone-900 px-3 py-2"
              >
                <p className="text-sm text-stone-100">
                  {attributeLabel(attribute)}{" "}
                  <span className="text-xs text-stone-500">({String(held)} in pile)</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded border border-stone-600 px-2 py-0.5 text-sm text-stone-200"
                    onClick={() => setAmount(attribute, value - 1)}
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm text-stone-100">{String(value)}</span>
                  <button
                    type="button"
                    className="rounded border border-stone-600 px-2 py-0.5 text-sm text-stone-200"
                    disabled={value >= held || assigned >= pending.amount}
                    onClick={() => setAmount(attribute, value + 1)}
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className={`${btnPrimary} mt-4 w-full`}
          disabled={!ready}
          onClick={() => onConfirm(pick)}
        >
          Confirm discard
        </button>
      </div>
    </div>
  );
}
