import type { DieId, ModifyPlayChoice } from "@server";

/** A Modify play that changes which face of a die is showing. */
export function isShowingFaceChoice(choices: readonly ModifyPlayChoice[]): boolean {
  return (
    choices.length > 0 &&
    choices.every(
      (choice) => choice.dieId !== null && choice.slotIndex !== null && choice.faceCardId === null,
    )
  );
}

/** Dice that have a legal face, in the order the plays were offered. */
export function showingFaceDieIds(choices: readonly ModifyPlayChoice[]): DieId[] {
  const ids: DieId[] = [];
  for (const choice of choices) {
    if (choice.dieId === null || ids.includes(choice.dieId)) continue;
    ids.push(choice.dieId);
  }
  return ids;
}

/** Face choices for one die, in slot order. */
export function facesForDie(
  choices: readonly ModifyPlayChoice[],
  dieId: DieId,
): readonly ModifyPlayChoice[] {
  return choices
    .filter((choice) => choice.dieId === dieId)
    .sort((left, right) => (left.slotIndex ?? 0) - (right.slotIndex ?? 0));
}
