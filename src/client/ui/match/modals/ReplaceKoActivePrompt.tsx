import {
  currentLife,
  getCreatureDefinition,
  isLivingReserve,
  type CreatureId,
  type GameState,
} from "@server";
import { BoardModal } from "./BoardModal";
import { WaitingBanner } from "./WaitingBanner";

type ReplaceKoPending = Extract<
  NonNullable<GameState["pendingDecision"]>,
  { type: "replace-ko-active" }
>;

/**
 * Mandatory Reserve picker after the Active Fighter is KOed.
 * Buttons dispatch `RESOLVE_REPLACE_KO_ACTIVE`. The engine accepts or rejects.
 */
export function ReplaceKoActivePrompt({
  state,
  pending,
  isChooser,
  onPick,
}: {
  state: GameState;
  pending: ReplaceKoPending;
  isChooser: boolean;
  onPick: (creatureId: CreatureId) => void;
}) {
  if (!isChooser) {
    return (
      <WaitingBanner>
        Waiting for a living Reserve to replace the KOed Active Fighter.
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
      title="Replace the KOed Fighter"
      subtitle="Choose a living Reserve to replace the KOed Active Fighter."
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
