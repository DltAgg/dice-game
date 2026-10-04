import { getFaceCard } from "../content/faces.js";
import { FACE_SLOTS_PER_DIE, inherentPipsOf, type DieState } from "../model/dice.js";
import type { DieId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { symbolTokenEntries, type SymbolType } from "../model/symbols.js";

/** Bible §22: a stunned die is not rolled and contributes nothing to the roll. */
export const isDieStunned = (die: DieState): boolean => die.stunMarkers > 0;

/** Bible §21: a retained die keeps its previous result instead of rerolling.
 * Shared `ROLL_DICE` still keeps the face; spend is in `rollDice` when the
 * owner is the active player. */
export const keepsPreviousResult = (die: DieState): boolean =>
  die.retained && die.rolledSlotIndex !== null;

export const diceOf = (state: GameState, playerId: PlayerId): readonly DieState[] => {
  const player = state.players[playerId];
  if (player === undefined) return [];
  return player.dieIds.flatMap((id) => {
    const die = state.dice[id];
    return die === undefined ? [] : [die];
  });
};

export const findDie = (state: GameState, id: DieId): DieState | undefined => state.dice[id];

/** Sum of inherent pips on a die, by symbol. Faces with no `pips` add nothing. */
export const symbolCountsOn = (die: DieState): Readonly<Partial<Record<SymbolType, number>>> => {
  const counts: Partial<Record<SymbolType, number>> = {};
  for (const slot of die.slots) {
    const face = getFaceCard(slot.faceCardId);
    if (face === undefined) continue;
    for (const [symbol, amount] of symbolTokenEntries(inherentPipsOf(face))) {
      counts[symbol] = (counts[symbol] ?? 0) + amount;
    }
  }
  return counts;
};

/** Structural invariant from bible §9, asserted by the die invariant tests. */
export const hasSixPhysicalFaces = (die: DieState): boolean =>
  die.slots.length === FACE_SLOTS_PER_DIE &&
  die.slots.every((slot, index) => slot.index === index);

export const stunnedDiceCount = (state: GameState, playerId: PlayerId): number =>
  diceOf(state, playerId).filter(isDieStunned).length;
