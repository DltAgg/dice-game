import {
  getCard,
  type CardInstanceId,
  type GameState,
} from "@server";
import {
  TacticChoiceContent,
} from "./BoardModal";
import {
  btnClass,
  btnPrimary,
} from "../styles";
import {
  CausedByLine,
} from "../tooltips/decisionSource";

export function PeekDeckModal({
  state,
  cardInstanceId,
  onResolve,
}: {
  state: GameState;
  cardInstanceId: CardInstanceId;
  onResolve: (putOnBottom: boolean) => void;
}) {
  const card = state.cards[cardInstanceId];
  const def = card !== undefined ? getCard(card.cardId) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Peek at deck
        </h2>
        <CausedByLine state={state} />
        <div className="mt-2">
          <TacticChoiceContent def={def} fallbackId={cardInstanceId} />
        </div>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Keep this card on top, or put it on the bottom of your deck.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button type="button" className={btnPrimary} onClick={() => onResolve(false)}>
            Keep on top
          </button>
          <button type="button" className={btnClass} onClick={() => onResolve(true)}>
            Put on bottom
          </button>
        </div>
      </div>
    </div>
  );
}
