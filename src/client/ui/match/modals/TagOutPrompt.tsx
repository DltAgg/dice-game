import {
  currentLife,
  getCreatureDefinition,
  isLivingReserve,
  type CreatureId,
  type GameState,
} from "@server";
import { BoardModal } from "./BoardModal";
import { WaitingBanner } from "./WaitingBanner";

type TagOutPending = Extract<
  NonNullable<GameState["pendingDecision"]>,
  { type: "tag-out-active" }
>;

/**
 * Mandatory Reserve picker after `[Tag out]`.
 * Buttons dispatch `RESOLVE_TAG_OUT`. The engine accepts or rejects.
 */
export function TagOutPrompt({
  state,
  pending,
  isChooser,
  onPick,
}: {
  state: GameState;
  pending: TagOutPending;
  isChooser: boolean;
  onPick: (creatureId: CreatureId) => void;
}) {
  if (!isChooser) {
    return (
      <WaitingBanner>
        Waiting for a living Reserve to replace the tagged-out Active Fighter.
      </WaitingBanner>
    );
  }

  const player = state.players[pending.controllerId];
  const reserves =
    player === undefined
      ? []
      : player.creatureIds.filter((creatureId) => isLivingReserve(state, player, creatureId));

  return (
    <BoardModal
      title="Tag out the Active Fighter"
      subtitle="Choose a living Reserve to become Active. The Fighter who leaves stays on the team."
    >
      <ul className="mt-4 space-y-2">
        {reserves.map((creatureId) => {
          const creature = state.creatures[creatureId];
          if (creature === undefined) return null;
          const def = getCreatureDefinition(creature.definitionId);
          const name = def?.name ?? creature.definitionId;
          return (
            <li key={creatureId}>
              <button
                type="button"
                className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                onClick={() => onPick(creatureId)}
              >
                <p className="text-sm font-medium text-stone-100">{name}</p>
                <p className="text-xs text-stone-500">
                  HP {currentLife(creature)}/{def?.life ?? "?"} · Reserve
                </p>
              </button>
            </li>
          );
        })}
        {reserves.length === 0 && (
          <li className="text-sm text-red-300">No living Reserve to choose.</li>
        )}
      </ul>
    </BoardModal>
  );
}
