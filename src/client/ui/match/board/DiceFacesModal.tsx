import type {
  GameState,
  PlayerId,
} from "@server";
import {
  BoardModal,
  FaceChoiceContent,
} from "../modals/BoardModal";
import {
  btnClass,
} from "../styles";
import {
  diceCountForPlayer,
  diceFaceGroupsForPlayer,
  type DieFaceGroup,
} from "./diceFaceGroups";

function DieFaceGroupSection({ group }: { group: DieFaceGroup }) {
  const heading =
    group.fighterName !== null ? group.fighterName : "Unbound die";

  return (
    <section className="rounded border border-stone-700 bg-stone-900/80 p-3">
      <h3 className="text-sm font-semibold text-amber-200/90">{heading}</h3>
      <ul className="mt-3 space-y-2">
        {group.slots.map((slot) => (
          <li
            key={`${group.dieId}:${String(slot.slotIndex)}`}
            className={
              slot.showing
                ? "rounded border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-3 py-2"
                : "rounded border border-stone-800 bg-stone-950/60 px-3 py-2"
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-stone-500">
                Face {String(slot.slotIndex + 1)}
              </span>
              {slot.showing && (
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  Showing
                </span>
              )}
            </div>
            <div className="mt-2">
              <FaceChoiceContent faceCardId={slot.faceCardId} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DiceFacesModal({
  state,
  playerId,
  onDismiss,
}: {
  state: GameState;
  playerId: PlayerId;
  onDismiss: () => void;
}) {
  const groups = diceFaceGroupsForPlayer(state, playerId);
  const diceCount = diceCountForPlayer(state, playerId);
  const slotTotal = groups.reduce((sum, group) => sum + group.slots.length, 0);

  return (
    <BoardModal
      wide
      title="Dice"
      subtitle={`${String(diceCount)} die${diceCount === 1 ? "" : "s"} · ${String(slotTotal)} face slot${slotTotal === 1 ? "" : "s"}.`}
      onDismiss={onDismiss}
    >
      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <DieFaceGroupSection key={group.dieId} group={group} />
        ))}
        {groups.length === 0 && (
          <p className="text-sm text-stone-500">No dice for this player.</p>
        )}
      </div>
      <button type="button" className={`${btnClass} mt-4`} onClick={onDismiss}>
        Close
      </button>
    </BoardModal>
  );
}
