import {
  getCard,
  getCreatureDefinition,
  type CardInstanceId,
  type CreatureId,
  type GameState,
} from "@server";
import {
  CausedByLine,
} from "../tooltips/decisionSource";
import {
  TacticInspectHover,
} from "../tooltips/inspectHovers";

export function ChooseEquipmentModal({
  state,
  creatureId,
  onPick,
}: {
  state: GameState;
  creatureId: CreatureId;
  onPick: (cardInstanceId: CardInstanceId) => void;
}) {
  const creature = state.creatures[creatureId];
  const equipmentIds = creature?.equipmentIds ?? [];
  const hostDef =
    creature !== undefined ? getCreatureDefinition(creature.definitionId) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Choose equipment to destroy
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Pick 1 Equipment on {hostDef?.name ?? "the chosen creature"}.
        </p>
        <CausedByLine state={state} />
        <ul className="mt-4 space-y-2">
          {equipmentIds.map((id) => {
            const card = state.cards[id];
            const def = card !== undefined ? getCard(card.cardId) : undefined;
            return (
              <li key={id}>
                <button
                  type="button"
                  className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                  onClick={() => onPick(id)}
                >
                  <p className="text-sm font-medium text-stone-100">
                    {def !== undefined ? (
                      <TacticInspectHover def={def} placement="below" />
                    ) : (
                      (card?.cardId ?? id)
                    )}
                  </p>
                </button>
              </li>
            );
          })}
          {equipmentIds.length === 0 && (
            <li className="text-sm text-red-300">No equipment on that creature.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
