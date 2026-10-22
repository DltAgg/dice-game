import type { ModifyPlayChoice } from "@server";
import { btnClass, btnHandPrimary } from "../styles";

/** Choices for a Modify that names a subject. Each button is one legal play. */
export function ModifyPlayBar({
  cardName,
  choices,
  onChoose,
  onCancel,
}: {
  cardName: string;
  choices: readonly ModifyPlayChoice[];
  onChoose: (choice: ModifyPlayChoice) => void;
  onCancel: () => void;
}) {
  if (choices.length === 0) return null;
  return (
    <div className="mb-2 rounded border border-stone-700 bg-black/40 p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-amber-100/90">{cardName}</p>
        <button type="button" className={btnClass} onClick={onCancel}>
          Cancel
        </button>
      </div>
      <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
        {choices.map((choice) => (
          <button
            key={`${choice.label}:${choice.dieId ?? ""}:${String(choice.slotIndex)}:${choice.faceCardId ?? ""}:${choice.techniqueId ?? ""}:${choice.targetCreatureId ?? ""}`}
            type="button"
            className={btnHandPrimary}
            onClick={() => onChoose(choice)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}
