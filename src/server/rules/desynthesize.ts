import type { DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";

/** There is no Shield face, so no slot is a legal peel target. */
export function isDesynthesizeLegalSlot(
  _state: GameState,
  _dieId: DieId,
  _slotIndex: number,
): boolean {
  return false;
}

export function anyDesynthesizeLegalSlot(_state: GameState): boolean {
  return false;
}
