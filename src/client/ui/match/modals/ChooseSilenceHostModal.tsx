import {
  collectLegalSilenceHosts,
  getCard,
  getCreatureDefinition,
  getFaceCard,
  type DieId,
  type GameState,
  type PlayerId,
  type SilenceHost,
  type SilenceHostChoice,
} from "@server";
import {
  slotStatusLine,
} from "../intents/faceStatus";
import {
  CausedByLine,
} from "../tooltips/decisionSource";
import {
  FaceInspectHover,
  TacticInspectHover,
} from "../tooltips/inspectHovers";

export function ChooseSilenceHostModal({
  state,
  controllerId,
  hosts,
  onPick,
}: {
  state: GameState;
  controllerId: PlayerId;
  hosts: readonly SilenceHost[];
  onPick: (choice: SilenceHostChoice) => void;
}) {
  const legal = collectLegalSilenceHosts(state, controllerId, hosts);
  const creatures = legal.filter(
    (entry): entry is Extract<SilenceHostChoice, { host: "creature" }> =>
      entry.host === "creature",
  );
  const rituals = legal.filter(
    (entry): entry is Extract<SilenceHostChoice, { host: "ritual" }> =>
      entry.host === "ritual",
  );
  const faces = legal.filter(
    (entry): entry is Extract<SilenceHostChoice, { host: "face" }> =>
      entry.host === "face",
  );

  const labelForDie = (dieId: DieId): string => {
    for (const player of Object.values(state.players)) {
      const index = player.dieIds.indexOf(dieId);
      if (index < 0) continue;
      const whose = player.id === controllerId ? "Your" : "Opponent";
      return `${whose} die ${String(index + 1)}`;
    }
    return dieId;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Silence a host
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Pick one opposing creature, field ritual, or die face. That host cannot fire effects
          (including equipment / overloads) until the start of your next turn.
        </p>
        <CausedByLine state={state} />
        <div className="mt-4 space-y-4">
          {creatures.length > 0 && (
            <section>
              <h3 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Creature
              </h3>
              <ul className="space-y-2">
                {creatures.map((choice) => {
                  const creature = state.creatures[choice.creatureId];
                  const def =
                    creature !== undefined
                      ? getCreatureDefinition(creature.definitionId)
                      : undefined;
                  return (
                    <li key={choice.creatureId}>
                      <button
                        type="button"
                        className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                        onClick={() => onPick(choice)}
                      >
                        <p className="text-sm font-medium text-stone-100">
                          {def?.name ?? creature?.definitionId ?? choice.creatureId}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
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
          {faces.length > 0 && (
            <section>
              <h3 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Face
              </h3>
              <ul className="space-y-2">
                {faces.map((choice) => {
                  const slot = state.dice[choice.dieId]?.slots[choice.slotIndex];
                  const face = slot !== undefined ? getFaceCard(slot.faceCardId) : undefined;
                  const status =
                    slot !== undefined
                      ? slotStatusLine(slot, { state, dieId: choice.dieId })
                      : null;
                  return (
                    <li key={`${choice.dieId}:${String(choice.slotIndex)}`}>
                      <button
                        type="button"
                        className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                        onClick={() => onPick(choice)}
                      >
                        <p className="text-sm font-medium text-stone-100">
                          {face !== undefined ? (
                            <FaceInspectHover face={face} placement="below" />
                          ) : (
                            "?"
                          )}
                        </p>
                        <p className="text-xs capitalize text-stone-500">
                          {labelForDie(choice.dieId)} · slot {String(choice.slotIndex + 1)}
                        </p>
                        {status !== null && (
                          <p className="mt-1 text-[0.65rem] text-rose-300/90">{status}</p>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {legal.length === 0 && (
            <p className="text-sm text-red-300">No legal hosts to Silence.</p>
          )}
        </div>
      </div>
    </div>
  );
}
