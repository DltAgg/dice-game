import {
  attributeLabel,
  getFaceCard,
  isAttribute,
  legalDieSlotsForFilter,
  naturalFaceId,
  type DieId,
  type DieSlotChoiceFilter,
  type GameState,
  type PlayerId,
} from "@server";
import {
  slotStatusLine,
} from "../intents/faceStatus";
import {
  chooseDieSlotFilterHint,
} from "../intents/hintFor";
import {
  CausedByLine,
} from "../tooltips/decisionSource";
import {
  FaceInspectHover,
} from "../tooltips/inspectHovers";

export function ChooseDieSlotModal({
  state,
  filter,
  controllerId,
  optional,
  contextDieId,
  excludedSlotIndex,
  onPick,
}: {
  state: GameState;
  filter: DieSlotChoiceFilter;
  controllerId: PlayerId;
  optional: boolean;
  contextDieId?: DieId;
  excludedSlotIndex?: number;
  onPick: (dieId: DieId | null, slotIndex: number | null) => void;
}) {
  const slots = legalDieSlotsForFilter(state, controllerId, filter, {
    ...(contextDieId !== undefined ? { contextDieId } : {}),
    ...(excludedSlotIndex !== undefined ? { excludedSlotIndex } : {}),
  });

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
          {filter === "any-synthetic" ? "Desynthesize a synthetic face" : "Choose a die face"}
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">{chooseDieSlotFilterHint(filter)}</p>
        <CausedByLine state={state} />
        <ul className="mt-4 space-y-2">
          {slots.map(({ dieId, slotIndex }) => {
            const die = state.dice[dieId];
            const slot = die?.slots[slotIndex];
            const face = slot !== undefined ? getFaceCard(slot.faceCardId) : undefined;
            const counterpartLabel =
              face !== undefined &&
              face.kind === "synthetic" &&
              isAttribute(face.symbol) &&
              getFaceCard(naturalFaceId(face.symbol)) !== undefined
                ? ` · → Natural ${attributeLabel(face.symbol)}`
                : "";
            const status = slot !== undefined ? slotStatusLine(slot, { state, dieId }) : null;
            return (
              <li key={`${dieId}:${String(slotIndex)}`}>
                <button
                  type="button"
                  className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                  onClick={() => onPick(dieId, slotIndex)}
                >
                  <p className="text-sm font-medium text-stone-100">
                    {face !== undefined ? (
                      <FaceInspectHover face={face} placement="below" />
                    ) : (
                      "?"
                    )}
                  </p>
                  <p className="text-xs capitalize text-stone-500">
                    {labelForDie(dieId)} · slot {String(slotIndex + 1)}
                    {face !== undefined ? ` · ${face.kind} · ${face.symbol}` : ""}
                    {counterpartLabel}
                  </p>
                  {status !== null && (
                    <p className="mt-1 text-[0.65rem] text-rose-300/90">{status}</p>
                  )}
                </button>
              </li>
            );
          })}
          {slots.length === 0 && (
            <li className="text-sm text-red-300">No legal die faces to choose.</li>
          )}
        </ul>
        {optional && (
          <button
            type="button"
            className="mt-4 w-full rounded border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:border-[var(--accent)]"
            onClick={() => onPick(null, null)}
          >
            Decline
          </button>
        )}
      </div>
    </div>
  );
}
