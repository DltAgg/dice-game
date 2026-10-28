import { useState } from "react";
import {
  canRerollDice,
  diceOf,
  getFaceCard,
  TURN_REROLL_KEY,
  type DieId,
  type GameState,
  type PlayerId,
} from "@server";
import { btnClass, btnPrimary } from "../styles";

/**
 * Roll-phase reroll and the continue into actions. The board auto-rolls;
 * this does not dispatch `ADVANCE_PHASE` on its own.
 */
export function RollPhaseControls({
  state,
  activePlayerId,
  canAct,
  onReroll,
  onContinue,
}: {
  state: GameState;
  activePlayerId: PlayerId;
  canAct: boolean;
  onReroll: (dieIds: readonly DieId[]) => void;
  onContinue: () => void;
}) {
  const [selected, setSelected] = useState<readonly DieId[]>([]);
  const spentReroll =
    state.players[activePlayerId]?.spentOncePerTurnKeys.includes(TURN_REROLL_KEY) ?? false;
  const openingRollDone = state.phase === "roll" && (state.rerollAvailable || spentReroll);
  const showReroll = canAct && canRerollDice(state, activePlayerId);
  const showContinue = canAct && openingRollDone;
  if (!showReroll && !showContinue) return null;

  const dice = diceOf(state, activePlayerId);
  const chosen = selected.filter((dieId) => dice.some((die) => die.id === dieId));

  const toggle = (dieId: DieId) => {
    setSelected((current) =>
      current.includes(dieId) ? current.filter((id) => id !== dieId) : [...current, dieId],
    );
  };

  return (
    <div className="mx-auto mb-3 flex max-w-5xl flex-col gap-2 rounded-lg border border-stone-700 bg-stone-950/80 px-4 py-3 text-sm">
      {showReroll && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-stone-300">Reroll your dice once</span>
          {dice.map((die, index) => {
            const slot =
              die.rolledSlotIndex === null ? undefined : die.slots[die.rolledSlotIndex];
            const face = slot === undefined ? undefined : getFaceCard(slot.faceCardId);
            const label = `Die ${String(index + 1)}: ${face?.name ?? "unrolled"}`;
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
      )}
      {showContinue && (
        <div>
          <button type="button" className={btnClass} onClick={onContinue}>
            Continue to actions
          </button>
        </div>
      )}
    </div>
  );
}
