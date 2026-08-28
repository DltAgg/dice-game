import {
  currentLife,
  getCreatureDefinition,
  legalCreaturesForFilter,
  type CreatureChoiceFilter,
  type CreatureId,
  type CreatureState,
  type GameState,
  type PlayerId,
} from "@server";
import {
  CausedByLine,
} from "../tooltips/decisionSource";

export function ChooseCreatureModal({
  state,
  filter,
  controllerId,
  sourceCreatureId,
  optional,
  onPick,
}: {
  state: GameState;
  filter: CreatureChoiceFilter;
  controllerId: PlayerId;
  sourceCreatureId: CreatureId | null;
  optional: boolean;
  onPick: (creatureId: CreatureId | null) => void;
}) {
  const creatures = legalCreaturesForFilter(state, controllerId, filter, sourceCreatureId)
    .map((id) => state.creatures[id])
    .filter((creature): creature is CreatureState => creature !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Choose a creature
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Pick a legal creature below or on the board.
          {optional ? " You may Decline." : ""}
        </p>
        <CausedByLine state={state} />
        <ul className="mt-4 space-y-2">
          {creatures.map((creature) => {
            const def = getCreatureDefinition(creature.definitionId);
            return (
              <li key={creature.id}>
                <button
                  type="button"
                  className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                  onClick={() => onPick(creature.id)}
                >
                  <p className="text-sm font-medium text-stone-100">
                    {def?.name ?? creature.definitionId}
                  </p>
                  <p className="text-xs text-stone-500">
                    HP {currentLife(creature)}/{def?.life ?? "?"} · Shield {creature.shields} ·
                    damage {creature.damage}
                  </p>
                </button>
              </li>
            );
          })}
          {creatures.length === 0 && (
            <li className="text-sm text-red-300">No legal creatures to choose.</li>
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
