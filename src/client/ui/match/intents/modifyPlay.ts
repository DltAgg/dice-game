import type {
  CardDefinition,
  CardInstanceId,
  GameAction,
  ModifyPlayChoice,
  PlayerId,
} from "@server";

/**
 * A moveset Modify with one technique and one legal Fighter has nothing to choose.
 * A face replacement, or more than one Fighter, still needs a prompt.
 */
export function immediateMovesetChoice(
  definition: CardDefinition,
  choices: readonly ModifyPlayChoice[],
): ModifyPlayChoice | null {
  if (definition.modifySubject !== "moveset") return null;
  if (definition.replaceFaceId !== undefined) return null;
  if (choices.length !== 1) return null;
  return choices[0] ?? null;
}

export function playActionFromModifyChoice(
  playerId: PlayerId,
  cardInstanceId: CardInstanceId,
  choice: ModifyPlayChoice,
): GameAction {
  return {
    type: "PLAY_CARD",
    playerId,
    cardInstanceId,
    mode: choice.mode,
    ...(choice.dieId !== null ? { dieId: choice.dieId } : {}),
    ...(choice.slotIndex !== null ? { slotIndex: choice.slotIndex } : {}),
    ...(choice.faceCardId !== null ? { declaredFaceCardId: choice.faceCardId } : {}),
    ...(choice.techniqueId !== null ? { techniqueId: choice.techniqueId } : {}),
    ...(choice.targetCreatureId !== null
      ? { declaredTargetCreatureId: choice.targetCreatureId }
      : {}),
  };
}
