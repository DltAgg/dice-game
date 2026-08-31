import {
  diceOf,
  forgeExceedsAttributeLimit,
  getFaceCard,
  slotCannotBeReplacedByForge,
  type Attribute,
  type DieId,
  type DieSlot,
  type DieState,
  type GameState,
  type PlayerId,
} from "@server";
import {
  slotStatusLine,
} from "../intents/faceStatus";
import {
  BoardModal,
} from "./BoardModal";
import {
  btnClass,
} from "../styles";
import {
  CausedByLine,
} from "../tooltips/decisionSource";
import {
  FaceInspectHover,
} from "../tooltips/inspectHovers";

export function DieSlotPickModal({
  state,
  title,
  subtitle,
  dieOwnerId,
  facesNeeded,
  forgeAttribute,
  pickMode = "die-then-slots",
  selectedDieId,
  selectedSlots,
  onSelectDie,
  onPickSingleSlot,
  onClearDie,
  onToggleSlot,
  onCancel,
  onBack,
  backLabel,
  slotBlocked,
}: {
  state: GameState;
  title: string;
  subtitle: string;
  dieOwnerId: PlayerId;
  facesNeeded: number;
  forgeAttribute?: Attribute | undefined;
  pickMode?: "single-slot" | "die-then-slots" | undefined;
  selectedDieId: DieId | undefined;
  selectedSlots: readonly number[];
  onSelectDie: (dieId: DieId) => void;
  onPickSingleSlot?: ((dieId: DieId, slotIndex: number) => void) | undefined;
  onClearDie: () => void;
  onToggleSlot: (slotIndex: number) => void;
  onCancel?: (() => void) | undefined;
  onBack?: (() => void) | undefined;
  backLabel?: string | undefined;
  /** When set, replaces the forge cannot-replace / attribute-cap checks. */
  slotBlocked?: ((die: DieState, slot: DieSlot) => string | null) | undefined;
}) {
  const dice = diceOf(state, dieOwnerId);
  const selectedDie = selectedDieId !== undefined ? state.dice[selectedDieId] : undefined;
  const flatSlots = pickMode === "single-slot" && onPickSingleSlot !== undefined;

  const slotDisabled = (die: (typeof dice)[number], slot: (typeof die.slots)[number]): string | null => {
    if (slotBlocked !== undefined) return slotBlocked(die, slot);
    if (slotCannotBeReplacedByForge(slot)) return slotStatusLine(slot) ?? "Cannot replace";
    if (
      forgeAttribute !== undefined &&
      forgeExceedsAttributeLimit(die, [slot.index], forgeAttribute, 1, state.config)
    ) {
      return "Would exceed attribute cap";
    }
    return null;
  };

  const slotButton = (
    die: (typeof dice)[number],
    slot: (typeof die.slots)[number],
    onPick: () => void,
    picked: boolean,
  ) => {
    const face = getFaceCard(slot.faceCardId);
    const blocked = slotDisabled(die, slot);
    const status = blocked === null ? slotStatusLine(slot) : null;
    return (
      <button
        key={`${die.id}:${String(slot.index)}`}
        type="button"
        disabled={blocked !== null}
        className={
          blocked !== null
            ? "cursor-not-allowed rounded border border-stone-800 bg-stone-950 px-3 py-3 text-left opacity-50"
            : picked
              ? "rounded border-2 border-[var(--accent)] bg-[var(--accent)]/20 px-3 py-3 text-left"
              : "rounded border border-stone-700 bg-stone-900 px-3 py-3 text-left hover:border-[var(--accent)]"
        }
        onClick={() => {
          if (blocked === null) onPick();
        }}
      >
        <p className="text-sm font-medium text-stone-100">
          {face !== undefined ? <FaceInspectHover face={face} placement="below" /> : "?"}
        </p>
        <p className="mt-1 text-[0.65rem] capitalize text-stone-500">
          Slot {slot.index + 1} · {face?.kind ?? "?"} · {face?.symbol ?? "—"}
        </p>
        {blocked !== null && (
          <p className="mt-1 text-[0.65rem] text-rose-300/90">{blocked}</p>
        )}
        {blocked === null && status !== null && (
          <p className="mt-1 text-[0.65rem] text-sky-300/90">{status}</p>
        )}
        {picked && blocked === null && (
          <p className="mt-1 text-[0.65rem] font-medium text-[var(--accent)]">Selected</p>
        )}
      </button>
    );
  };

  return (
    <BoardModal title={title} subtitle={subtitle} causedBy={<CausedByLine state={state} />} onDismiss={onCancel} wide>
      {flatSlots && (
        <div className="mt-4 space-y-4">
          {dice.map((die, index) => {
            const replaceable = die.slots.filter((slot) => slotDisabled(die, slot) === null).length;
            return (
              <div key={die.id}>
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-stone-500">
                  Die {index + 1}
                  {replaceable === 0 ? " · no legal faces" : ""}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {die.slots.map((slot) =>
                    slotButton(
                      die,
                      slot,
                      () => onPickSingleSlot(die.id, slot.index),
                      selectedDieId === die.id && selectedSlots.includes(slot.index),
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!flatSlots && selectedDieId === undefined && (
        <ul className="mt-4 space-y-2">
          {dice.map((die, index) => {
            const replaceable = die.slots.filter((slot) => slotDisabled(die, slot) === null).length;
            const canPickDie = replaceable >= facesNeeded;
            return (
              <li key={die.id}>
                <button
                  type="button"
                  disabled={!canPickDie}
                  className={
                    canPickDie
                      ? "w-full rounded border border-stone-700 bg-stone-900 px-3 py-3 text-left hover:border-[var(--accent)]"
                      : "w-full cursor-not-allowed rounded border border-stone-800 bg-stone-950 px-3 py-3 text-left opacity-50"
                  }
                  onClick={() => {
                    if (canPickDie) onSelectDie(die.id);
                  }}
                >
                  <p className="text-sm font-medium text-stone-100">
                    Die {index + 1}
                    <span className="ml-2 text-xs font-normal text-stone-500">{die.id}</span>
                  </p>
                  <p className="mt-1 text-xs capitalize text-stone-500">
                    {die.slots.map((slot) => getFaceCard(slot.faceCardId)?.name ?? "?").join(" · ")}
                  </p>
                  <p className="mt-1 text-[0.65rem] text-stone-400">
                    {String(replaceable)} legal face{replaceable === 1 ? "" : "s"}
                  </p>
                  {!canPickDie && (
                    <p className="mt-1 text-[0.65rem] text-rose-300/90">
                      Not enough replaceable faces
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!flatSlots && selectedDie !== undefined && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-stone-500">
            Faces on this die · pick {facesNeeded}
            {selectedSlots.length > 0
              ? ` (${String(selectedSlots.length)}/${String(facesNeeded)} selected)`
              : ""}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {selectedDie.slots.map((slot) =>
              slotButton(selectedDie, slot, () => onToggleSlot(slot.index), selectedSlots.includes(slot.index)),
            )}
          </div>
          <button type="button" className={`${btnClass} mt-3`} onClick={onClearDie}>
            Change die
          </button>
        </div>
      )}

      {onBack !== undefined && (
        <button type="button" className={`${btnClass} mt-4`} onClick={onBack}>
          {backLabel ?? "Back"}
        </button>
      )}
      {onCancel !== undefined && (
        <button type="button" className={`${btnClass} mt-4`} onClick={onCancel}>
          Cancel
        </button>
      )}
    </BoardModal>
  );
}
