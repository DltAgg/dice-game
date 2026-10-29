import type { GameState, ModifyPlayChoice } from "@server";
import { ChooseShowingFaceModal } from "../modals/ChooseShowingFaceModal";
import { isShowingFaceChoice } from "../modals/chooseShowingFace";
import { ReplaceDieFaceModal } from "../modals/ReplaceDieFaceModal";
import { isDieSlotReplacement } from "../modals/replaceDieFacePrompt";
import { ModifyPlayBar } from "./ModifyPlayBar";

/** Inline choices for most Modifies. A showing-face play asks for the die, then the face. */
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
  if (isShowingFaceChoice(choices)) {
    return (
      <ChooseShowingFaceModal
        state={state}
        cardName={cardName}
        choices={choices}
        onChoose={onChoose}
        onCancel={onCancel}
      />
    );
  }
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
