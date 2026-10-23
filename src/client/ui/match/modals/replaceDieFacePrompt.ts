import type { DieId, FaceCardId, ModifyPlayChoice } from "@server";

/** A Modify play that overwrites one die slot with a named face. */
export function isDieSlotReplacement(choices: readonly ModifyPlayChoice[]): boolean {
  return (
    choices.length > 0 &&
    choices.every(
      (choice) => choice.dieId !== null && choice.slotIndex !== null && choice.faceCardId !== null,
    )
  );
}

/** Incoming faces, once each, in the order the plays were offered. */
export function incomingReplacementFaces(choices: readonly ModifyPlayChoice[]): FaceCardId[] {
  const ids: FaceCardId[] = [];
  for (const choice of choices) {
    if (choice.faceCardId === null || ids.includes(choice.faceCardId)) continue;
    ids.push(choice.faceCardId);
  }
  return ids;
}

export interface DieSlotGroup {
  readonly dieId: DieId;
  readonly choices: readonly ModifyPlayChoice[];
}

/** Plays that install one face, grouped by die and ordered along that die. */
export function slotGroupsForFace(
  choices: readonly ModifyPlayChoice[],
  faceCardId: FaceCardId,
): readonly DieSlotGroup[] {
  const groups: { dieId: DieId; choices: ModifyPlayChoice[] }[] = [];
  for (const choice of choices) {
    if (choice.faceCardId !== faceCardId || choice.dieId === null || choice.slotIndex === null) {
      continue;
    }
    const existing = groups.find((group) => group.dieId === choice.dieId);
    if (existing === undefined) groups.push({ dieId: choice.dieId, choices: [choice] });
    else existing.choices.push(choice);
  }
  return groups.map((group) => ({
    dieId: group.dieId,
    choices: [...group.choices].sort(
      (left, right) => (left.slotIndex ?? 0) - (right.slotIndex ?? 0),
    ),
  }));
}
