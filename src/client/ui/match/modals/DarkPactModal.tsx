import {
  useState,
} from "react";
import {
  attributeLabel,
  getCard,
  searchableInDeck,
  type CardInstanceId,
  type GameState,
  type PlayerId,
} from "@server";
import {
  btnPrimary,
} from "../styles";
import {
  CausedByLine,
} from "../tooltips/decisionSource";

export function DarkPactModal({
  state,
  controllerId,
  onConfirm,
}: {
  state: GameState;
  controllerId: PlayerId;
  onConfirm: (cardInstanceIds: readonly [CardInstanceId, CardInstanceId]) => void;
}) {
  const [pick, setPick] = useState<readonly CardInstanceId[]>([]);
  const ritualIds = searchableInDeck(state, controllerId, ["ritual"]);

  const toggle = (id: CardInstanceId) => {
    setPick((prev) => {
      if (prev.includes(id)) return prev.filter((entry) => entry !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const attrs = pick.map((id) => {
    const card = state.cards[id];
    return card !== undefined ? getCard(card.cardId)?.attribute : undefined;
  });
  const different =
    pick.length === 2 && attrs[0] !== undefined && attrs[1] !== undefined && attrs[0] !== attrs[1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Dark Pact
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Choose exactly two Rituals from your deck with different attributes. They go to the
          graveyard.
        </p>
        <CausedByLine state={state} />
        <ul className="mt-4 space-y-2">
          {ritualIds.map((id) => {
            const card = state.cards[id];
            const def = card !== undefined ? getCard(card.cardId) : undefined;
            const checked = pick.includes(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  className={
                    checked
                      ? "w-full rounded border border-[var(--accent)] bg-[var(--accent)]/20 px-3 py-2 text-left"
                      : "w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-stone-500"
                  }
                  disabled={!checked && pick.length >= 2}
                  onClick={() => toggle(id)}
                >
                  <p className="text-sm font-medium text-stone-100">{def?.name ?? card?.cardId ?? id}</p>
                  <p className="text-xs capitalize text-stone-500">
                    {def !== undefined ? attributeLabel(def.attribute) : ""}
                  </p>
                </button>
              </li>
            );
          })}
          {ritualIds.length === 0 && (
            <li className="text-sm text-red-300">No Rituals in your deck.</li>
          )}
        </ul>
        {pick.length === 2 && !different && (
          <p className="mt-2 text-sm text-red-300">Those Rituals share an attribute — pick different ones.</p>
        )}
        <button
          type="button"
          className={`${btnPrimary} mt-4`}
          disabled={!different || pick[0] === undefined || pick[1] === undefined}
          onClick={() => {
            if (pick[0] === undefined || pick[1] === undefined) return;
            onConfirm([pick[0], pick[1]]);
          }}
        >
          Confirm Dark Pact
        </button>
      </div>
    </div>
  );
}
