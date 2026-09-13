import {
  diceOf,
  getFaceCard,
  legalDiceForFilter,
  opponentOf,
  type DieChoiceFilter,
  type DieId,
  type GameState,
  type PlayerId,
} from "@server";
import {
  chooseDieFilterHint,
} from "../intents/hintFor";
import {
  CausedByLine,
} from "../tooltips/decisionSource";

export function ChooseDieModal({
  state,
  filter,
  controllerId,
  optional,
  onPick,
}: {
  state: GameState;
  filter: DieChoiceFilter;
  controllerId: PlayerId;
  optional: boolean;
  onPick: (dieId: DieId | null) => void;
}) {
  const dieIds = legalDiceForFilter(state, controllerId, filter);
  const ownDice = diceOf(state, controllerId);
  const oppDice = diceOf(state, opponentOf(state, controllerId));
  const labelFor = (dieId: DieId): string => {
    const ownIndex = ownDice.findIndex((die) => die.id === dieId);
    if (ownIndex >= 0) return `Your die ${String(ownIndex + 1)}`;
    const oppIndex = oppDice.findIndex((die) => die.id === dieId);
    if (oppIndex >= 0) return `Opponent die ${String(oppIndex + 1)}`;
    return dieId;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Choose a die
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">{chooseDieFilterHint(filter)}</p>
        <CausedByLine state={state} />
        <ul className="mt-4 space-y-2">
          {dieIds.map((dieId) => {
            const die = state.dice[dieId];
            const showingSlot =
              die !== undefined && die.rolledSlotIndex !== null
                ? die.slots[die.rolledSlotIndex]
                : undefined;
            const showing =
              showingSlot !== undefined ? getFaceCard(showingSlot.faceCardId) : undefined;
            return (
              <li key={dieId}>
                <button
                  type="button"
                  className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                  onClick={() => onPick(dieId)}
                >
                  <p className="text-sm font-medium text-stone-100">{labelFor(dieId)}</p>
                  <p className="text-xs capitalize text-stone-500">
                    {showing !== undefined
                      ? `Showing ${showing.name}`
                      : die?.retained === true
                        ? "Retained"
                        : "Not rolled"}
                    {die?.stunMarkers !== undefined && die.stunMarkers > 0
                      ? ` · stun ${String(die.stunMarkers)}`
                      : ""}
                  </p>
                </button>
              </li>
            );
          })}
          {dieIds.length === 0 && (
            <li className="text-sm text-red-300">No legal dice to choose.</li>
          )}
        </ul>
        {optional && (
          <button
            type="button"
            className="mt-4 w-full rounded border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:border-[var(--accent)]"
            onClick={() => onPick(null)}
          >
            Decline
          </button>
        )}
      </div>
    </div>
  );
}
