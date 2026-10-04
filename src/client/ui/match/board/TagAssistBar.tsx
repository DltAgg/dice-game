import type { CreatureId, GameState, PlayerId } from "@server";
import { btnHand } from "../styles";
import { canDeclareAssist, canDeclareTag } from "./tagAssistLegality";

/** Tag / Assist for one living reserve, shown on that fighter’s card. */
export function ReserveTagAssist({
  state,
  playerId,
  reserveId,
  label,
  canAct,
  onTag,
  onAssist,
}: {
  state: GameState;
  playerId: PlayerId;
  reserveId: CreatureId;
  label: string;
  canAct: boolean;
  onTag: (reserveCreatureId: CreatureId) => void;
  onAssist: (reserveCreatureId: CreatureId) => void;
}) {
  const tagOk = canAct && canDeclareTag(state, playerId, reserveId);
  const assistOk = canAct && canDeclareAssist(state, playerId, reserveId);

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      <button
        type="button"
        className={tagOk ? btnHand : `${btnHand} opacity-40`}
        disabled={!tagOk}
        title={tagOk ? `Tag in ${label}` : "Tag not available"}
        onClick={() => onTag(reserveId)}
      >
        Tag
      </button>
      <button
        type="button"
        className={assistOk ? btnHand : `${btnHand} opacity-40`}
        disabled={!assistOk}
        title={assistOk ? `Assist from ${label}` : "Assist not available"}
        onClick={() => onAssist(reserveId)}
      >
        Assist
      </button>
    </div>
  );
}
