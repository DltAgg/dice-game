import { useState } from "react";
import {
  canRerollDice,
  diceOf,
  getCreatureDefinition,
  getFaceCard,
  type DieId,
  type GameState,
  type PlayerId,
} from "@server";
import { btnPrimary } from "../styles";

/**
 * Once-per-turn die picker for the roll phase. Leaving the roll is the
 * Actions control on the phase bar, not a second button here.
 */
export function RollPhaseControls({
  state,
  activePlayerId,
  canAct,
  onReroll,
}: {
  state: GameState;
  activePlayerId: PlayerId;
  canAct: boolean;
  onReroll: (dieIds: readonly DieId[]) => void;
}) {
  const [selected, setSelected] = useState<readonly DieId[]>([]);
  if (!canAct || !canRerollDice(state, activePlayerId)) return null;

  const dice = diceOf(state, activePlayerId);
  const chosen = selected.filter((dieId) => dice.some((die) => die.id === dieId));

  const toggle = (dieId: DieId) => {
    setSelected((current) =>
      current.includes(dieId) ? current.filter((id) => id !== dieId) : [...current, dieId],
    );
  };

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-stone-800 pt-3 text-sm">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
        Reroll your dice once
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {dice.map((die) => {
          const slot =
            die.rolledSlotIndex === null ? undefined : die.slots[die.rolledSlotIndex];
          const face = slot === undefined ? undefined : getFaceCard(slot.faceCardId);
          const creature =
            die.boundCreatureId === null ? undefined : state.creatures[die.boundCreatureId];
          const fighter =
            creature === undefined ? undefined : getCreatureDefinition(creature.definitionId);
          const label = `${fighter?.name ?? "Die"} · ${face?.name ?? "unrolled"}`;
          const checked = chosen.includes(die.id);
          return (
            <label
              key={die.id}
              className={
                checked
                  ? "flex items-center gap-1.5 rounded border border-[var(--accent)] bg-[var(--accent)]/15 px-2 py-1 text-xs text-[var(--accent)]"
                  : "flex items-center gap-1.5 rounded border border-stone-600 bg-stone-900/80 px-2 py-1 text-xs text-stone-200"
              }
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(die.id)}
              />
              {label}
            </label>
          );
        })}
        <button
          type="button"
          className={btnPrimary}
          disabled={chosen.length === 0}
          onClick={() => {
            if (chosen.length === 0) return;
            onReroll(chosen);
            setSelected([]);
          }}
        >
          Reroll selected
        </button>
      </div>
    </div>
  );
}
