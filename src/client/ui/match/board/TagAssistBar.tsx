import type { CreatureId, GameState, PlayerId } from "@server";
import { btnClass, btnHand } from "../styles";
import { canDeclareAssist, canDeclareTag } from "./tagAssistLegality";

export function TagAssistBar({
  state,
  playerId,
  reserves,
  canAct,
  onTag,
  onAssist,
}: {
  state: GameState;
  playerId: PlayerId;
  reserves: readonly { readonly id: CreatureId; readonly label: string }[];
  canAct: boolean;
  onTag: (reserveCreatureId: CreatureId) => void;
  onAssist: (reserveCreatureId: CreatureId) => void;
}) {
  if (reserves.length === 0) return null;
  const show =
    canAct &&
    state.activePlayerId === playerId &&
    state.phase === "actions" &&
    state.pendingDecision === null;

  if (!show) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-800/80 pt-3">
      {reserves.map(({ id: reserveId, label }) => {
        const tagOk = canDeclareTag(state, playerId, reserveId);
        const assistOk = canDeclareAssist(state, playerId, reserveId);
        return (
          <div key={reserveId} className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              className={btnHand}
              disabled={!tagOk}
              title={tagOk ? `Tag in ${label}` : "Tag not available"}
              onClick={() => onTag(reserveId)}
            >
              Tag {label}
            </button>
            <button
              type="button"
              className={btnClass}
              disabled={!assistOk}
              title={assistOk ? `Assist from ${label}` : "Assist not available"}
              onClick={() => onAssist(reserveId)}
            >
              Assist {label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
