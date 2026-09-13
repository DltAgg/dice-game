import {
  collectLegalBounceCards,
  getCard,
  getCreatureDefinition,
  getFaceCard,
  type BounceHost,
  type BounceHostChoice,
  type GameState,
  type PlayerId,
} from "@server";
import {
  CausedByLine,
} from "../tooltips/decisionSource";
import {
  TacticInspectHover,
} from "../tooltips/inspectHovers";

export function ChooseBounceCardModal({
  state,
  controllerId,
  hosts,
  onPick,
}: {
  state: GameState;
  controllerId: PlayerId;
  hosts: readonly BounceHost[];
  onPick: (choice: BounceHostChoice) => void;
}) {
  const legal = collectLegalBounceCards(state, controllerId, hosts);
  const rituals = legal.filter(
    (entry): entry is Extract<BounceHostChoice, { host: "ritual" }> =>
      entry.host === "ritual",
  );
  const equipment = legal.filter(
    (entry): entry is Extract<BounceHostChoice, { host: "equipment" }> =>
      entry.host === "equipment",
  );
  const overloads = legal.filter(
    (entry): entry is Extract<BounceHostChoice, { host: "overload" }> =>
      entry.host === "overload",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Bounce a card
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Pick an opposing ritual, equipment, or overload. It returns to its owner's hand
          (not the graveyard).
        </p>
        <CausedByLine state={state} />
        <div className="mt-4 space-y-4">
          {rituals.length > 0 && (
            <section>
              <h3 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Ritual
              </h3>
              <ul className="space-y-2">
                {rituals.map((choice) => {
                  const card = state.cards[choice.cardInstanceId];
                  const def = card !== undefined ? getCard(card.cardId) : undefined;
                  const orientation = card?.ritualOrientation ?? "—";
                  return (
                    <li key={choice.cardInstanceId}>
                      <button
                        type="button"
                        className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                        onClick={() => onPick(choice)}
                      >
                        <p className="text-sm font-medium text-stone-100">
                          {def !== undefined ? (
                            <TacticInspectHover def={def} placement="below" />
                          ) : (
                            (card?.cardId ?? choice.cardInstanceId)
                          )}
                        </p>
                        <p className="text-xs capitalize text-stone-500">{orientation}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {equipment.length > 0 && (
            <section>
              <h3 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Equipment
              </h3>
              <ul className="space-y-2">
                {equipment.map((choice) => {
                  const card = state.cards[choice.cardInstanceId];
                  const def = card !== undefined ? getCard(card.cardId) : undefined;
                  const hostCreature =
                    card?.attachedToCreatureId !== null && card?.attachedToCreatureId !== undefined
                      ? state.creatures[card.attachedToCreatureId]
                      : undefined;
                  const hostDef =
                    hostCreature !== undefined
                      ? getCreatureDefinition(hostCreature.definitionId)
                      : undefined;
                  return (
                    <li key={choice.cardInstanceId}>
                      <button
                        type="button"
                        className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                        onClick={() => onPick(choice)}
                      >
                        <p className="text-sm font-medium text-stone-100">
                          {def !== undefined ? (
                            <TacticInspectHover def={def} placement="below" />
                          ) : (
                            (card?.cardId ?? choice.cardInstanceId)
                          )}
                        </p>
                        <p className="text-xs text-stone-500">
                          {hostDef?.name ?? "—"}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {overloads.length > 0 && (
            <section>
              <h3 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Overload
              </h3>
              <ul className="space-y-2">
                {overloads.map((choice) => {
                  const card = state.cards[choice.cardInstanceId];
                  const def = card !== undefined ? getCard(card.cardId) : undefined;
                  const face =
                    card?.attachedToFaceCardId !== null && card?.attachedToFaceCardId !== undefined
                      ? getFaceCard(card.attachedToFaceCardId)
                      : undefined;
                  return (
                    <li key={choice.cardInstanceId}>
                      <button
                        type="button"
                        className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                        onClick={() => onPick(choice)}
                      >
                        <p className="text-sm font-medium text-stone-100">
                          {def !== undefined ? (
                            <TacticInspectHover def={def} placement="below" />
                          ) : (
                            (card?.cardId ?? choice.cardInstanceId)
                          )}
                        </p>
                        <p className="text-xs text-stone-500">{face?.name ?? "—"}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {legal.length === 0 && (
            <p className="text-sm text-red-300">No legal cards to Bounce.</p>
          )}
        </div>
      </div>
    </div>
  );
}
