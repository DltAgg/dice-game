import {
  getCard,
  type CardInstanceId,
  type GameState,
} from "@server";
import {
  TacticChoiceContent,
} from "./BoardModal";
import {
  CausedByLine,
} from "../tooltips/decisionSource";

export function LookTopDeckModal({
  state,
  cardInstanceIds,
  onKeep,
}: {
  state: GameState;
  cardInstanceIds: readonly CardInstanceId[];
  onKeep: (keepId: CardInstanceId) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Look at top of deck
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Pick one card to keep in hand. The other goes to the bottom of your deck.
        </p>
        <CausedByLine state={state} />
        <ul className="mt-4 space-y-2">
          {cardInstanceIds.map((id) => {
            const card = state.cards[id];
            const def = card !== undefined ? getCard(card.cardId) : undefined;
            return (
              <li key={id}>
                  <button
                    type="button"
                    className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                    onClick={() => onKeep(id)}
                  >
                    <TacticChoiceContent def={def} fallbackId={id} />
                  </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
