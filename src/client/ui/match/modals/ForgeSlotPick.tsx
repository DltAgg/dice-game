import { useEffect } from "react";
import {
  diceOf,
  formatForgeLine,
  getCard,
  opponentOf,
  slotCannotBeReplacedByForge,
  type GameState,
  type PlayerId,
} from "@server";
import { type Intent } from "../intents/types";
import { DieSlotPickModal } from "./DieSlotPickModal";

type ForgeIntent = Extract<Intent, { kind: "forge" }>;

export function ForgeSlotPick({
  state,
  activeId,
  intent,
  onUpdate,
  onCancel,
}: {
  state: GameState;
  activeId: PlayerId;
  intent: ForgeIntent;
  onUpdate: (next: ForgeIntent) => void;
  onCancel: () => void;
}) {
  const instance = state.cards[intent.cardInstanceId];
  const forgeDef = instance !== undefined ? getCard(instance.cardId) : undefined;
  const forgeFacesNeeded = forgeDef?.forge.faces ?? 1;
  const forgeTarget = forgeDef?.forge.target ?? null;

  useEffect(() => {
    if (intent.dieId !== undefined || forgeDef === undefined) return;
    const ownerId =
      forgeDef.forge.target === "own-die" ? activeId : opponentOf(state, activeId);
    const needed = forgeDef.forge.faces;
    const legal = diceOf(state, ownerId).filter((die) => {
      const replaceable = die.slots.filter((slot) => !slotCannotBeReplacedByForge(slot));
      return replaceable.length >= needed;
    });
    if (legal.length !== 1) return;
    const die = legal[0];
    if (die === undefined) return;
    const replaceable = die.slots.filter((slot) => !slotCannotBeReplacedByForge(slot));
    if (needed === 1 && replaceable.length === 1 && replaceable[0] !== undefined) {
      onUpdate({
        kind: "forge",
        cardInstanceId: intent.cardInstanceId,
        dieId: die.id,
        slotIndexes: [replaceable[0].index],
      });
      return;
    }
    onUpdate({
      kind: "forge",
      cardInstanceId: intent.cardInstanceId,
      dieId: die.id,
      slotIndexes: [],
    });
  }, [intent, forgeDef, activeId, state, onUpdate]);

  const needsDieOrSlots =
    intent.dieId === undefined || (intent.slotIndexes?.length ?? 0) < forgeFacesNeeded;
  if (!needsDieOrSlots || forgeTarget === null) return null;

  return (
    <DieSlotPickModal
      state={state}
      title={
        forgeFacesNeeded === 1
          ? "Forge — pick one face to overwrite"
          : `Forge — pick ${String(forgeFacesNeeded)} faces on one die`
      }
      subtitle={
        forgeDef !== undefined
          ? `${forgeDef.name} forges ${formatForgeLine(forgeDef.forge)}. ${
              forgeFacesNeeded === 1
                ? "Click a legal face; then choose what it becomes from your pool."
                : `Choose a die, then exactly ${String(forgeFacesNeeded)} faces to overwrite.`
            }`
          : "Pick which physical die and faces to overwrite."
      }
      dieOwnerId={forgeTarget === "own-die" ? activeId : opponentOf(state, activeId)}
      facesNeeded={forgeFacesNeeded}
      forgeAttribute={forgeDef?.forge.attribute}
      pickMode={forgeFacesNeeded === 1 ? "single-slot" : "die-then-slots"}
      selectedDieId={intent.dieId}
      selectedSlots={intent.slotIndexes ?? []}
      onSelectDie={(dieId) =>
        onUpdate({
          kind: "forge",
          cardInstanceId: intent.cardInstanceId,
          dieId,
          slotIndexes: [],
        })
      }
      onPickSingleSlot={(dieId, slotIndex) =>
        onUpdate({
          kind: "forge",
          cardInstanceId: intent.cardInstanceId,
          dieId,
          slotIndexes: [slotIndex],
        })
      }
      onClearDie={() => onUpdate({ kind: "forge", cardInstanceId: intent.cardInstanceId })}
      onToggleSlot={(slotIndex) => {
        if (intent.dieId === undefined) return;
        const slot = state.dice[intent.dieId]?.slots[slotIndex];
        if (slot !== undefined && slotCannotBeReplacedByForge(slot)) return;
        const current = intent.slotIndexes ?? [];
        const next = current.includes(slotIndex)
          ? current.filter((index) => index !== slotIndex)
          : current.length < forgeFacesNeeded
            ? [...current, slotIndex]
            : current;
        onUpdate({
          kind: "forge",
          cardInstanceId: intent.cardInstanceId,
          dieId: intent.dieId,
          slotIndexes: next,
        });
      }}
      onCancel={onCancel}
    />
  );
}
