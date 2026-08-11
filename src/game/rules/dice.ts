import { getFaceCard } from "../content/faces.js";
import type { GameRulesConfig } from "../model/config.js";
import { FACE_SLOTS_PER_DIE, type DieState } from "../model/dice.js";
import type { DieId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import type { SymbolType } from "../model/symbols.js";

/** Bible §22: a stunned die is not rolled and contributes nothing to the roll. */
export const isDieStunned = (die: DieState): boolean => die.stunMarkers > 0;

/** Bible §21: a retained die keeps its previous result instead of rerolling. */
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

/**
 * How many faces of each symbol a die carries. Shield is counted alongside the
 * attributes so the §9.1 cap covers every face rather than leaving one kind
 * silently unbounded.
 */
export const symbolCountsOn = (die: DieState): Readonly<Partial<Record<SymbolType, number>>> =>
  countSymbols(die, null);

/**
 * Bible §9.1: a die may hold at most four faces sharing one attribute. The
 * check is expressed against a hypothetical post-install composition so that
 * forging can validate before mutating anything.
 */
export function exceedsAttributeLimit(
  die: DieState,
  slotIndex: number,
  incoming: SymbolType,
  config: GameRulesConfig,
): boolean {
  const counts = countSymbols(die, slotIndex);
  const projected = (counts[incoming] ?? 0) + 1;
  return projected > config.maxFacesOfSameAttributePerDie;
}

/** Counts a die's faces by symbol, optionally ignoring one slot being replaced. */
function countSymbols(
  die: DieState,
  ignoredSlotIndex: number | null,
): Partial<Record<SymbolType, number>> {
  const counts: Partial<Record<SymbolType, number>> = {};
  for (const slot of die.slots) {
    if (slot.index === ignoredSlotIndex) continue;
    const face = getFaceCard(slot.faceCardId);
    if (face === undefined) continue;
    counts[face.symbol] = (counts[face.symbol] ?? 0) + 1;
  }
  return counts;
}

/** Structural invariant from bible §9, asserted by the die invariant tests. */
export const hasSixPhysicalFaces = (die: DieState): boolean =>
  die.slots.length === FACE_SLOTS_PER_DIE &&
  die.slots.every((slot, index) => slot.index === index);

export const stunnedDiceCount = (state: GameState, playerId: PlayerId): number =>
  diceOf(state, playerId).filter(isDieStunned).length;
