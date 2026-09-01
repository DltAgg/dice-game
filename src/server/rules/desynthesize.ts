import { isAttribute } from "../model/attributes.js";
import type { DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { getFaceCard } from "../content/faces.js";
import { FACE_SLOTS_PER_DIE } from "../model/dice.js";

/** True when this physical slot is a legal `[Desynthesize]` target. Spec `024`. */
export function isDesynthesizeLegalSlot(state: GameState, dieId: DieId, slotIndex: number): boolean {
  const slot = state.dice[dieId]?.slots[slotIndex];
  if (slot === undefined) return false;
  const face = getFaceCard(slot.faceCardId);
  if (face === undefined || face.kind !== "synthetic") return false;
  return isAttribute(face.symbol);
}

export function anyDesynthesizeLegalSlot(state: GameState): boolean {
  for (const die of Object.values(state.dice)) {
    for (let slotIndex = 0; slotIndex < FACE_SLOTS_PER_DIE; slotIndex += 1) {
      if (isDesynthesizeLegalSlot(state, die.id, slotIndex)) return true;
    }
  }
  return false;
}
