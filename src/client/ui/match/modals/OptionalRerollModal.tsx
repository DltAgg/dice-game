import {
  diceOf,
  getFaceCard,
  type DieId,
  type FaceCardId,
  type GameState,
} from "@server";
import {
  btnClass,
  btnPrimary,
} from "../styles";
import {
  CausedByLine,
} from "../tooltips/decisionSource";

export function OptionalRerollModal({
  state,
  dieId,
  faceCardId,
  onResolve,
}: {
  state: GameState;
  dieId: DieId;
  faceCardId: FaceCardId;
  onResolve: (accept: boolean) => void;
}) {
  const face = getFaceCard(faceCardId);
  const die = state.dice[dieId];
  const ownerDice = die !== undefined ? diceOf(state, die.ownerId) : [];
  const dieIndex = ownerDice.findIndex((entry) => entry.id === dieId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Optional reroll
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Reroll {dieIndex >= 0 ? `die ${String(dieIndex + 1)}` : "this die"} (currently{" "}
          {face?.name ?? faceCardId})?
        </p>
        <CausedByLine state={state} />
        <div className="mt-4 flex flex-col gap-2">
          <button type="button" className={btnPrimary} onClick={() => onResolve(true)}>
            Accept reroll
          </button>
          <button type="button" className={btnClass} onClick={() => onResolve(false)}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
