import { useState } from "react";
import {
  getCreatureDefinition,
  getFaceCard,
  type DieId,
  type GameState,
  type ModifyPlayChoice,
} from "@server";
import { BoardModal } from "./BoardModal";
import { facesForDie, showingFaceDieIds } from "./chooseShowingFace";

/** Die first, then a face on that die that is not already showing. */
export function ChooseShowingFaceModal({
  state,
  cardName,
  choices,
  onChoose,
  onCancel,
}: {
  state: GameState;
  cardName: string;
  choices: readonly ModifyPlayChoice[];
  onChoose: (choice: ModifyPlayChoice) => void;
  onCancel: () => void;
}) {
  const [dieId, setDieId] = useState<DieId | null>(null);
  const dice = showingFaceDieIds(choices);
  const selected = dieId !== null && dice.includes(dieId) ? dieId : null;
  const faces = selected === null ? [] : facesForDie(choices, selected);

  return (
    <BoardModal
      title={selected === null ? "Choose a die" : "Choose a face"}
      subtitle={cardName}
      onDismiss={onCancel}
    >
      {selected === null ? (
        <ul className="mt-4 space-y-2">
          {dice.map((id) => (
            <li key={id}>
              <button
                type="button"
                className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left hover:border-[var(--accent)]"
                onClick={() => setDieId(id)}
              >
                <p className="text-sm font-medium text-stone-100">{fighterName(state, id)}</p>
                <p className="text-xs text-stone-500">{showingLabel(state, id)}</p>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 space-y-2">
          <button
            type="button"
            className="text-xs text-stone-400 underline hover:text-stone-200"
            onClick={() => setDieId(null)}
          >
            Back
          </button>
          <ul className="space-y-2">
            {faces.map((choice) => (
              <li key={`${choice.dieId ?? ""}:${String(choice.slotIndex)}`}>
                <button
                  type="button"
                  className="w-full rounded border border-stone-700 bg-stone-900 px-3 py-2 text-left text-sm font-medium text-stone-100 hover:border-[var(--accent)]"
                  onClick={() => onChoose(choice)}
                >
                  {faceName(state, choice)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </BoardModal>
  );
}

function fighterName(state: GameState, dieId: DieId): string {
  const bound = state.dice[dieId]?.boundCreatureId;
  if (bound === null || bound === undefined) return "Die";
  const creature = state.creatures[bound];
  if (creature === undefined) return "Die";
  return getCreatureDefinition(creature.definitionId)?.name ?? "Die";
}

function showingLabel(state: GameState, dieId: DieId): string {
  const die = state.dice[dieId];
  const slot =
    die !== undefined && die.rolledSlotIndex !== null
      ? die.slots[die.rolledSlotIndex]
      : undefined;
  const face = slot === undefined ? undefined : getFaceCard(slot.faceCardId);
  return face === undefined ? "Not showing a face" : `Showing ${face.name}`;
}

function faceName(state: GameState, choice: ModifyPlayChoice): string {
  if (choice.dieId === null || choice.slotIndex === null) return choice.label;
  const faceId = state.dice[choice.dieId]?.slots[choice.slotIndex]?.faceCardId;
  if (faceId === undefined) return choice.label;
  return getFaceCard(faceId)?.name ?? choice.label;
}
