import type { CreatureId, GameState, PlayerId } from "@server";
import { btnHand } from "../styles";
import { assistControlEnabled, canDeclareTag } from "./tagAssistLegality";

/** Tag / Assist on a Reserve card. `locked` keeps both controls disabled. */
export function ReserveTagAssist({
  state,
  playerId,
  reserveId,
  label,
  canAct,
  mayTag = true,
  locked = false,
  onTag,
  onAssist,
}: {
  state: GameState;
  playerId: PlayerId;
  reserveId: CreatureId;
  label: string;
  canAct: boolean;
  /** Row seat may press Tag. Independent of the shared `canAct` gate. */
  mayTag?: boolean;
  /** KOed Reserve: same buttons, neither can be pressed. */
  locked?: boolean;
  onTag: (reserveCreatureId: CreatureId) => void;
  onAssist: (reserveCreatureId: CreatureId) => void;
}) {
  const tagOk = !locked && mayTag && canDeclareTag(state, playerId, reserveId);
  const assistOk = !locked && assistControlEnabled(state, playerId, reserveId, canAct);

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
