import {
  useState,
} from "react";
import {
  currentLife,
  getCreatureDefinition,
  type CreatureId,
  type GameState,
} from "@server";
import {
  legalSplitDamageTargets,
} from "../intents/legalChoices";
import {
  btnClass,
  btnPrimary,
} from "../styles";

export function SplitDamageModal({
  state,
  pending,
  onConfirm,
}: {
  state: GameState;
  pending: Extract<NonNullable<GameState["pendingDecision"]>, { type: "split-damage" }>;
  onConfirm: (
    assignments: readonly { readonly creatureId: CreatureId; readonly amount: number }[],
  ) => void;
}) {
  const targets = legalSplitDamageTargets(state, pending);
  const [amounts, setAmounts] = useState<Readonly<Partial<Record<CreatureId, number>>>>({});

  const assigned = targets.reduce((sum, id) => sum + (amounts[id] ?? 0), 0);
  const positiveCount = targets.filter((id) => (amounts[id] ?? 0) > 0).length;
  const ready =
    assigned === pending.amount &&
    positiveCount > 0 &&
    positiveCount <= pending.maxTargets &&
    targets.every((id) => (amounts[id] ?? 0) >= 0);

  const setAmount = (creatureId: CreatureId, next: number) => {
    const clamped = Math.max(0, Math.min(pending.amount, Math.floor(next)));
    setAmounts((prev) => ({ ...prev, [creatureId]: clamped }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Split damage
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Assign {String(pending.amount)} damage across up to {String(pending.maxTargets)}{" "}
          creature(s). Assigned: {String(assigned)}/{String(pending.amount)}.
        </p>
        <ul className="mt-4 space-y-2">
          {targets.map((creatureId) => {
            const creature = state.creatures[creatureId];
            if (creature === undefined) return null;
            const def = getCreatureDefinition(creature.definitionId);
            const value = amounts[creatureId] ?? 0;
            return (
              <li
                key={creatureId}
                className="flex items-center justify-between gap-3 rounded border border-stone-700 bg-stone-900 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-stone-100">
                    {def?.name ?? creature.definitionId}
                  </p>
                  <p className="text-xs text-stone-500">
                    HP {currentLife(creature)}/{def?.life ?? "?"} · {creature.position}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={btnClass}
                    onClick={() => setAmount(creatureId, value - 1)}
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm text-stone-100">{String(value)}</span>
                  <button
                    type="button"
                    className={btnClass}
                    onClick={() => setAmount(creatureId, value + 1)}
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
          {targets.length === 0 && (
            <li className="text-sm text-red-300">No legal targets for this damage.</li>
          )}
        </ul>
        <button
          type="button"
          className={`${btnPrimary} mt-4`}
          disabled={!ready}
          onClick={() =>
            onConfirm(
              targets
                .map((creatureId) => ({
                  creatureId,
                  amount: amounts[creatureId] ?? 0,
                }))
                .filter((entry) => entry.amount > 0),
            )
          }
        >
          Confirm assignments
        </button>
      </div>
    </div>
  );
}
