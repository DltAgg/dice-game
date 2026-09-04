import { getFaceCard } from "../content/faces.js";
import type { WhileShowingModifier } from "../model/dice.js";
import type { PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import type { Draft } from "../reducer/draft.js";
import { diceOf } from "./dice.js";
import { isSlotSilenced } from "./silence.js";

export type WhileShowingTotals = {
  readonly pierce: number;
  readonly empower: number;
  readonly playDiscount: number;
  readonly forgeDiscount: number;
  readonly reduce: number;
};

const EMPTY: WhileShowingTotals = {
  pierce: 0,
  empower: 0,
  playDiscount: 0,
  forgeDiscount: 0,
  reduce: 0,
};

/** Sum a closed list of stance modifiers (two showing copies stack). */
export function sumWhileShowingModifiers(
  modifiers: readonly WhileShowingModifier[],
): WhileShowingTotals {
  let pierce = 0;
  let empower = 0;
  let playDiscount = 0;
  let forgeDiscount = 0;
  let reduce = 0;
  for (const modifier of modifiers) {
    switch (modifier.type) {
      case "pierce":
        pierce += modifier.amount;
        break;
      case "empower":
        empower += modifier.amount;
        break;
      case "play-discount":
        playDiscount += modifier.amount;
        break;
      case "forge-discount":
        forgeDiscount += modifier.amount;
        break;
      case "reduce":
        reduce += modifier.amount;
        break;
    }
  }
  return { pierce, empower, playDiscount, forgeDiscount, reduce };
}

/**
 * Continuous stance from currently showing faces (`rolledSlotIndex`).
 * Holder voice: modifiers apply to the **die owner**. Silenced slots skip.
 * Not a StandingTrigger event.
 */
export function whileShowingTotals(
  state: GameState | Draft,
  playerId: PlayerId,
): WhileShowingTotals {
  const collected: WhileShowingModifier[] = [];
  for (const die of diceOf(state as GameState, playerId)) {
    const slotIndex = die.rolledSlotIndex;
    if (slotIndex === null) continue;
    if (isSlotSilenced(state as GameState, die.id, slotIndex)) continue;
    const faceCardId = die.slots[slotIndex]?.faceCardId;
    if (faceCardId === undefined) continue;
    const face = getFaceCard(faceCardId);
    if (face === undefined || face.whileShowing === undefined) continue;
    collected.push(...face.whileShowing);
  }
  if (collected.length === 0) return EMPTY;
  return sumWhileShowingModifiers(collected);
}
