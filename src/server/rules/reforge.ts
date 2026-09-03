import type { Attribute } from "../model/attributes.js";
import type { DieSlot } from "../model/dice.js";
import type { FaceCardId, DieId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import type { Draft } from "../reducer/draft.js";
import { getFaceCard } from "../content/faces.js";
import { forgeExceedsAttributeLimit } from "./cards.js";
import {
  matchingFacesInPool,
  slotCannotBeReplacedByForge,
} from "./faces.js";

export interface ReforgeSpec {
  readonly faces: number;
  readonly attribute: Attribute;
  readonly fromAttribute?: Attribute;
}

function combinations(values: readonly number[], n: number): readonly (readonly number[])[] {
  const out: number[][] = [];
  const walk = (start: number, acc: number[]): void => {
    if (acc.length === n) {
      out.push([...acc]);
      return;
    }
    for (let i = start; i < values.length; i++) {
      const next = values[i];
      if (next === undefined) continue;
      acc.push(next);
      walk(i + 1, acc);
      acc.pop();
    }
  };
  walk(0, []);
  return out;
}

/** Synthetic faces of the destination attribute still in the controller's pool. */
export function eligiblePoolFacesForReforge(
  state: GameState | Draft,
  playerId: PlayerId,
  attribute: Attribute,
): readonly FaceCardId[] {
  return matchingFacesInPool(state, playerId, "synthetic", attribute);
}

export function slotMatchesReforgeFilter(
  slot: DieSlot,
  fromAttribute: Attribute | undefined,
): boolean {
  if (slotCannotBeReplacedByForge(slot)) return false;
  if (fromAttribute === undefined) return true;
  const face = getFaceCard(slot.faceCardId);
  return face !== undefined && face.symbol === fromAttribute;
}

/**
 * Replaceable slots on one owned die. Reforge (`fromAttribute` omitted) accepts
 * any face. Cross forge requires the showing symbol to be `fromAttribute`.
 */
export function legalSlotsForReplaceSyntheticFace(
  state: GameState | Draft,
  controllerId: PlayerId,
  spec: ReforgeSpec,
): ReadonlyArray<{ readonly dieId: DieId; readonly slotIndex: number }> {
  const player = state.players[controllerId];
  if (player === undefined) return [];
  if (eligiblePoolFacesForReforge(state, controllerId, spec.attribute).length < spec.faces) {
    return [];
  }

  const results: Array<{ readonly dieId: DieId; readonly slotIndex: number }> = [];
  for (const dieId of player.dieIds) {
    const die = state.dice[dieId];
    if (die === undefined) continue;
    const candidates = die.slots
      .filter((slot) => slotMatchesReforgeFilter(slot, spec.fromAttribute))
      .map((slot) => slot.index);
    if (candidates.length < spec.faces) continue;
    const legalCombo = combinations(candidates, spec.faces).some(
      (pick) =>
        !forgeExceedsAttributeLimit(die, pick, spec.attribute, spec.faces, state.config),
    );
    if (!legalCombo) continue;
    for (const slotIndex of candidates) {
      results.push({ dieId, slotIndex });
    }
  }
  return results;
}

export function hasLegalReplaceSyntheticFaceChoice(
  state: GameState | Draft,
  controllerId: PlayerId,
  spec: ReforgeSpec,
): boolean {
  return legalSlotsForReplaceSyntheticFace(state, controllerId, spec).length > 0;
}

export function isLegalReforgeAssignment(
  state: GameState | Draft,
  controllerId: PlayerId,
  spec: ReforgeSpec,
  dieId: DieId,
  slotIndexes: readonly number[],
  faceCardIds: readonly FaceCardId[],
): boolean {
  if (slotIndexes.length !== spec.faces || faceCardIds.length !== spec.faces) return false;
  if (new Set(slotIndexes).size !== spec.faces) return false;
  if (new Set(faceCardIds).size !== spec.faces) return false;

  const die = state.dice[dieId];
  if (die === undefined || die.ownerId !== controllerId) return false;

  const pool = new Set(eligiblePoolFacesForReforge(state, controllerId, spec.attribute));
  for (const id of faceCardIds) {
    if (!pool.has(id)) return false;
  }

  for (const slotIndex of slotIndexes) {
    const slot = die.slots[slotIndex];
    if (slot === undefined || !slotMatchesReforgeFilter(slot, spec.fromAttribute)) return false;
  }

  return !forgeExceedsAttributeLimit(die, slotIndexes, spec.attribute, spec.faces, state.config);
}
