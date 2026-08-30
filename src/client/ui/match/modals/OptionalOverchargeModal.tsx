import {
  getFaceCard,
  type DieId,
  type GameState,
} from "@server";
import {
  btnClass,
  btnPrimary,
} from "../styles";
import {
  CausedByLine,
} from "../tooltips/decisionSource";

export function OptionalOverchargeModal({
  state,
  amount,
  dieId,
  slotIndex,
  onResolve,
}: {
  state: GameState;
  amount: number;
  dieId: DieId;
  slotIndex: number;
  onResolve: (accept: boolean) => void;
}) {
  const die = state.dice[dieId];
  const slot = die?.slots[slotIndex];
  const face = slot !== undefined ? getFaceCard(slot.faceCardId) : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Overcharge
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Generate +{String(amount)} pool symbol from {face?.name ?? "this face"}? Accepting
          suppresses that face&apos;s inherent effect on the next roll.
        </p>
        <CausedByLine state={state} />
        <div className="mt-4 flex flex-col gap-2">
          <button type="button" className={btnPrimary} onClick={() => onResolve(true)}>
            Accept
          </button>
          <button type="button" className={btnClass} onClick={() => onResolve(false)}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
