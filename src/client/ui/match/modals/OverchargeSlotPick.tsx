import { useMemo } from "react";
import {
  attributeLabel,
  getCard,
  legalOverchargeSlots,
  type CardInstanceId,
  type DieId,
  type GameState,
  type PlayerId,
} from "@server";
import { slotStatusLine } from "../intents/faceStatus";
import { DieSlotPickModal } from "./DieSlotPickModal";

export function OverchargeSlotPick({
  state,
  playerId,
  cardInstanceId,
  onPick,
  onCancel,
}: {
  state: GameState;
  playerId: PlayerId;
  cardInstanceId: CardInstanceId;
  onPick: (dieId: DieId, slotIndex: number) => void;
  onCancel: () => void;
}) {
  const instance = state.cards[cardInstanceId];
  const definition = instance !== undefined ? getCard(instance.cardId) : undefined;
  const legal = useMemo(
    () => legalOverchargeSlots(state, playerId),
    [state, playerId],
  );
  const legalKeys = useMemo(
    () => new Set(legal.map((slot) => `${slot.dieId}:${String(slot.slotIndex)}`)),
    [legal],
  );
  const attribute =
    definition !== undefined ? attributeLabel(definition.forge.attribute) : "attribute";

  return (
    <DieSlotPickModal
      state={state}
      title="Overcharge — pick one face"
      subtitle={
        definition !== undefined
          ? `${definition.name}: choose a face on your die to Overcharge (+1 ${attribute} on roll).`
          : "Choose a face on your die to Overcharge."
      }
      dieOwnerId={playerId}
      facesNeeded={1}
      pickMode="single-slot"
      selectedDieId={undefined}
      selectedSlots={[]}
      onSelectDie={() => undefined}
      onPickSingleSlot={onPick}
      onClearDie={() => undefined}
      onToggleSlot={() => undefined}
      onCancel={onCancel}
      slotBlocked={(die, slot) =>
        legalKeys.has(`${die.id}:${String(slot.index)}`)
          ? null
          : (slotStatusLine(slot) ?? "Illegal target")
      }
    />
  );
}
