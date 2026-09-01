import {
  getCard,
  opponentOf,
  overloadsOf,
  type CardInstanceId,
  type GameState,
  type PlayerId,
} from "@server";
import {
  CausedByLine,
} from "../tooltips/decisionSource";
import {
  TacticInspectHover,
} from "../tooltips/inspectHovers";

export function ChooseOverloadModal({
  state,
  filter,
  controllerId,
  onPick,
}: {
  state: GameState;
  filter: "opponent";
  controllerId: PlayerId;
  onPick: (cardInstanceId: CardInstanceId) => void;
}) {
  const ownerId = filter === "opponent" ? opponentOf(state, controllerId) : controllerId;
  const overloads = overloadsOf(state, ownerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Choose an opposing overload
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Pick one overload the opponent controls to send to their graveyard.
        </p>
        <CausedByLine state={state} />
        <ul className="mt-4 space-y-2">
          {overloads.map((card) => {
            const def = getCard(card.cardId);
            return (
              <li key={card.id}>
                <button
                  type="button"
                  className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                  onClick={() => onPick(card.id)}
                >
                  <p className="text-sm font-medium text-stone-100">
                    {def !== undefined ? (
                      <TacticInspectHover def={def} placement="below" />
                    ) : (
                      card.cardId
                    )}
                  </p>
                </button>
              </li>
            );
          })}
          {overloads.length === 0 && (
            <li className="text-sm text-red-300">No opposing overloads on the field.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
