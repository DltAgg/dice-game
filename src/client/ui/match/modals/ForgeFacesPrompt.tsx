import {
  formatFaceKind,
  getFaceCard,
  opponentOf,
  type DieId,
  type FaceCardId,
  type GameState,
} from "@server";
import {
  DieSlotPickModal,
} from "./DieSlotPickModal";
import {
  FacePickModal,
} from "./FacePickModal";

export function ForgeFacesPrompt({
  state,
  pending,
  selectedFaceCardId,
  selectedDieId,
  selectedSlots,
  onPickFace,
  onClearFace,
  onSelectDie,
  onClearDie,
  onToggleSlot,
  onPickSingleSlot,
}: {
  state: GameState;
  pending: Extract<NonNullable<GameState["pendingDecision"]>, { type: "forge-faces" }>;
  selectedFaceCardId: FaceCardId | undefined;
  selectedDieId: DieId | undefined;
  selectedSlots: readonly number[];
  onPickFace: (faceCardId: FaceCardId) => void;
  onClearFace: () => void;
  onSelectDie: (dieId: DieId) => void;
  onClearDie: () => void;
  onToggleSlot: (slotIndex: number) => void;
  onPickSingleSlot?: (dieId: DieId, slotIndex: number) => void;
}) {
  const dieOwnerId =
    pending.target === "own-die"
      ? pending.controllerId
      : opponentOf(state, pending.controllerId);
  const kindLabel = formatFaceKind(pending.kind);
  const where =
    pending.target === "own-die" ? "one of your dice" : "one of the opponent's dice";
  const chosenFace = selectedFaceCardId !== undefined ? getFaceCard(selectedFaceCardId) : undefined;

  if (selectedFaceCardId === undefined) {
    return (
      <FacePickModal
        state={state}
        playerId={pending.controllerId}
        kind={pending.kind}
        attribute={pending.attribute}
        subtitle={`Choose a ${kindLabel} ${pending.attribute} face from your face pool. You will install it on ${where}; the card stays yours.`}
        onPick={onPickFace}
      />
    );
  }

  return (
    <DieSlotPickModal
      state={state}
      title={pending.target === "own-die" ? "Install on your die" : "Install on their die"}
      subtitle={`Install ${chosenFace?.name ?? selectedFaceCardId} from your pool (${String(pending.faces)} ${pending.faces === 1 ? "copy" : "copies"}) onto ${where}. Choose which of their faces to replace.`}
      dieOwnerId={dieOwnerId}
      facesNeeded={pending.faces}
      forgeAttribute={pending.attribute}
      pickMode={pending.faces === 1 ? "single-slot" : "die-then-slots"}
      selectedDieId={selectedDieId}
      selectedSlots={selectedSlots}
      onSelectDie={onSelectDie}
      onPickSingleSlot={onPickSingleSlot}
      onClearDie={onClearDie}
      onToggleSlot={onToggleSlot}
      onBack={onClearFace}
      backLabel="Change face"
    />
  );
}
