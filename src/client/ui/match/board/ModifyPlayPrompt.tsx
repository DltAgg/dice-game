import type { GameState, ModifyPlayChoice } from "@server";
import { ReplaceDieFaceModal } from "../modals/ReplaceDieFaceModal";
import { isDieSlotReplacement } from "../modals/replaceDieFacePrompt";
import { ModifyPlayBar } from "./ModifyPlayBar";

/** Inline choices for most Modifies. Die-slot replacement opens a modal. */
export function ModifyPlayPrompt({
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
  if (isDieSlotReplacement(choices)) {
    return (
      <ReplaceDieFaceModal
        state={state}
        cardName={cardName}
        choices={choices}
        onChoose={onChoose}
        onCancel={onCancel}
      />
    );
  }
  return (
    <ModifyPlayBar cardName={cardName} choices={choices} onChoose={onChoose} onCancel={onCancel} />
  );
}
