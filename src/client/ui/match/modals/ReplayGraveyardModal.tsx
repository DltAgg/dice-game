import {
  getCard,
  type CardInstanceId,
  type GameState,
  type PlayerId,
} from "@server";
import {
  replayableGyCards,
} from "../intents/legalChoices";
import {
  TacticChoiceContent,
} from "./BoardModal";
import {
  CausedByLine,
} from "../tooltips/decisionSource";

export function ReplayGraveyardModal({
  state,
  controllerId,
  onPick,
}: {
  state: GameState;
  controllerId: PlayerId;
  onPick: (cardInstanceId: CardInstanceId) => void;
}) {
  const cards = replayableGyCards(state, controllerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Replay from graveyard
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Choose an Instant or Ritual with playable effects. It stays in the graveyard; no pile cost
          or Requires gate.
        </p>
        <CausedByLine state={state} />
        <ul className="mt-4 space-y-2">
          {cards.map((card) => {
            const def = getCard(card.cardId);
            return (
              <li key={card.id}>
                  <button
                    type="button"
                    className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                    onClick={() => onPick(card.id)}
                  >
                    <TacticChoiceContent def={def} fallbackId={card.cardId} />
                  </button>
              </li>
            );
          })}
          {cards.length === 0 && (
            <li className="text-sm text-red-300">No replayable Instant or Ritual in your graveyard.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
