import {
  eligiblePoolFacesForReplace,
  formatFaceKind,
  getFaceCard,
  legalSlotsForReplaceSyntheticFace,
  type DieId,
  type FaceCardId,
  type GameState,
} from "@server";
import {
  slotStatusLine,
} from "../intents/faceStatus";
import {
  FacePickModal,
} from "./FacePickModal";
import {
  CausedByLine,
} from "../tooltips/decisionSource";
import {
  FaceInspectHover,
} from "../tooltips/inspectHovers";

export function ReplaceSyntheticFacePrompt({
  state,
  pending,
  selectedSlot,
  onPickSlot,
  onClearSlot,
  onPickFace,
}: {
  state: GameState;
  pending: Extract<NonNullable<GameState["pendingDecision"]>, { type: "replace-synthetic-face" }>;
  selectedSlot: { readonly dieId: DieId; readonly slotIndex: number } | undefined;
  onPickSlot: (slot: { readonly dieId: DieId; readonly slotIndex: number }) => void;
  onClearSlot: () => void;
  onPickFace: (faceCardId: FaceCardId) => void;
}) {
  const kindLabel = formatFaceKind(pending.kind);
  const legalSlots = legalSlotsForReplaceSyntheticFace(
    state,
    pending.controllerId,
    pending.kind,
    pending.attribute,
  );

  const labelForDie = (dieId: DieId): string => {
    const player = state.players[pending.controllerId];
    if (player === undefined) return dieId;
    const index = player.dieIds.indexOf(dieId);
    return index >= 0 ? `Your die ${String(index + 1)}` : dieId;
  };

  if (selectedSlot === undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border border-stone-600 bg-stone-950 p-5 shadow-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            Replace a face
          </h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Choose a {kindLabel} {pending.attribute} face on your die to uninstall. You will
            install a different matching face from your pool (no forge-draw).
          </p>
          <CausedByLine state={state} />
          <ul className="mt-4 space-y-2">
            {legalSlots.map(({ dieId, slotIndex }) => {
              const die = state.dice[dieId];
              const slot = die?.slots[slotIndex];
              const face = slot !== undefined ? getFaceCard(slot.faceCardId) : undefined;
              const status = slot !== undefined ? slotStatusLine(slot, { state, dieId }) : null;
              return (
                <li key={`${dieId}:${String(slotIndex)}`}>
                  <button
                    type="button"
                    className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                    onClick={() => onPickSlot({ dieId, slotIndex })}
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
                    </p>
                    {status !== null && (
                      <p className="mt-1 text-[0.65rem] text-rose-300/90">{status}</p>
                    )}
                  </button>
                </li>
              );
            })}
            {legalSlots.length === 0 && (
              <li className="text-sm text-red-300">No eligible faces to replace.</li>
            )}
          </ul>
        </div>
      </div>
    );
  }

  const removedFaceCardId =
    state.dice[selectedSlot.dieId]?.slots[selectedSlot.slotIndex]?.faceCardId;
  const removedFace =
    removedFaceCardId !== undefined ? getFaceCard(removedFaceCardId) : undefined;
  const eligible =
    removedFaceCardId !== undefined
      ? eligiblePoolFacesForReplace(
          state,
          pending.controllerId,
          pending.kind,
          pending.attribute,
          removedFaceCardId,
        )
      : [];

  return (
    <FacePickModal
      state={state}
      playerId={pending.controllerId}
      kind={pending.kind}
      attribute={pending.attribute}
      eligibleIds={eligible}
      subtitle={`Install a different ${kindLabel} ${pending.attribute} face from your pool onto ${labelForDie(selectedSlot.dieId)} slot ${String(selectedSlot.slotIndex + 1)} (replacing ${removedFace?.name ?? removedFaceCardId ?? "?"}).`}
      onPick={onPickFace}
      onBack={onClearSlot}
      backLabel="Change face"
    />
  );
}
