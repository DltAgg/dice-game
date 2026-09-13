import {
  attackIsFuelled,
  basicAttackOf,
  currentLife,
  formatAttackFuel,
  formatAttackLine,
  getCreatureDefinition,
  legalTargetsFor,
  type AttackId,
  type CreatureId,
  type CreatureState,
  type GameState,
} from "@server";
import {
  btnClass,
} from "../styles";

export function OptionalBonusAttackModal({
  state,
  creatureId,
  onDecline,
  onAttack,
}: {
  state: GameState;
  creatureId: CreatureId;
  onDecline: () => void;
  onAttack: (attackId: AttackId, targetId: CreatureId) => void;
}) {
  const creature = state.creatures[creatureId];
  const def = creature !== undefined ? getCreatureDefinition(creature.definitionId) : undefined;
  const basic = def !== undefined ? basicAttackOf(def) : undefined;
  const fuelled =
    creature !== undefined &&
    basic !== undefined &&
    attackIsFuelled(state.players[creature.ownerId]?.attributePool ?? {}, basic);
  const targets =
    basic !== undefined && fuelled
      ? legalTargetsFor(state, creatureId, basic)
          .map((id) => state.creatures[id])
          .filter((entry): entry is CreatureState => entry !== undefined)
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Bonus basic attack
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          {def?.name ?? "Creature"} may declare its basic attack during this turn's actions
          {basic !== undefined ? ` (${basic.name})` : ""}. Pick a target below or on the board,
          or Decline.
        </p>
        {basic !== undefined && (
          <p className="mt-2 text-xs text-stone-500">
            {formatAttackLine(basic)} · {formatAttackFuel(basic)}
            {!fuelled ? " · not fuelled" : ""}
          </p>
        )}
        <ul className="mt-4 space-y-2">
          {targets.map((target) => {
            const targetDef = getCreatureDefinition(target.definitionId);
            return (
              <li key={target.id}>
                <button
                  type="button"
                  className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                  disabled={basic === undefined}
                  onClick={() => {
                    if (basic === undefined) return;
                    onAttack(basic.id, target.id);
                  }}
                >
                  <p className="text-sm font-medium text-stone-100">
                    {targetDef?.name ?? target.definitionId}
                  </p>
                  <p className="text-xs text-stone-500">
                    HP {currentLife(target)}/{targetDef?.life ?? "?"} · {target.position}
                  </p>
                </button>
              </li>
            );
          })}
          {basic !== undefined && fuelled && targets.length === 0 && (
            <li className="text-sm text-red-300">No legal targets for the basic attack.</li>
          )}
          {basic !== undefined && !fuelled && (
            <li className="text-sm text-red-300">Basic attack is not fuelled.</li>
          )}
          {basic === undefined && (
            <li className="text-sm text-red-300">No basic attack on this creature.</li>
          )}
        </ul>
        <button type="button" className={`${btnClass} mt-4 w-full`} onClick={onDecline}>
          Decline
        </button>
      </div>
    </div>
  );
}
