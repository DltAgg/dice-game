import { getFaceCard } from "../content/faces.js";
import type { Attribute } from "../model/attributes.js";
import type { AttackDefinition } from "../model/creatures.js";
import type { PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import {
  genericCount,
  isAttributeSymbol,
  requirementEntries,
  type AttributeTokens,
} from "../model/symbols.js";
import { diceOf } from "./dice.js";
import { isNonEmptyRequirement } from "./tokens.js";

/**
 * +1 per owned die whose showing face `symbol` is an Attribute.
 * Shield / untyped / missing slot / `rolledSlotIndex === null` count nothing.
 * Faces, not pips: extra yield on the face does not add extra unlock counts.
 */
export function showingAttributeCounts(state: GameState, playerId: PlayerId): AttributeTokens {
  const counts: Partial<Record<Attribute, number>> = {};
  for (const die of diceOf(state, playerId)) {
    const slotIndex = die.rolledSlotIndex;
    if (slotIndex === null) continue;
    const faceCardId = die.slots[slotIndex]?.faceCardId;
    if (faceCardId === undefined) continue;
    const face = getFaceCard(faceCardId);
    if (face === undefined || !isAttributeSymbol(face.symbol)) continue;
    counts[face.symbol] = (counts[face.symbol] ?? 0) + 1;
  }
  return counts;
}

/**
 * True when the owner's showing-attribute counts meet every named count in
 * `unlock` (AND). Empty unlock cannot be declared. `[Resonance]` wildcards
 * and `[Discount]` do not apply. `any` pips do not apply.
 */
export function attackIsUnlocked(
  state: GameState,
  playerId: PlayerId,
  attack: Pick<AttackDefinition, "unlock">,
): boolean {
  if (!isNonEmptyRequirement(attack.unlock)) return false;
  if (genericCount(attack.unlock) > 0) return false;
  const showing = showingAttributeCounts(state, playerId);
  for (const [attribute, need] of requirementEntries(attack.unlock)) {
    if ((showing[attribute] ?? 0) < need) return false;
  }
  return true;
}
