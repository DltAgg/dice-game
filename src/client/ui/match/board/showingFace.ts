import {
  dieForCreature,
  getFaceCard,
  type CreatureId,
  type GameState,
  type Technique,
} from "@server";

export function showingFaceForCreature(
  state: Pick<GameState, "players" | "dice" | "creatures">,
  creatureId: CreatureId,
): {
  readonly faceName: string;
  readonly technique: Technique | null;
  readonly unrolled: boolean;
} {
  const die = dieForCreature(state, creatureId);
  if (die === undefined) {
    return { faceName: "—", technique: null, unrolled: true };
  }
  if (die.rolledSlotIndex === null) {
    return { faceName: "Unrolled", technique: null, unrolled: true };
  }
  const slot = die.slots[die.rolledSlotIndex];
  if (slot === undefined) {
    return { faceName: "—", technique: null, unrolled: true };
  }
  const face = getFaceCard(slot.faceCardId);
  if (face === undefined) {
    return { faceName: "—", technique: null, unrolled: false };
  }
  return {
    faceName: face.name,
    technique: face.technique ?? null,
    unrolled: false,
  };
}
