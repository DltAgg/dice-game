import { getFaceCard } from "../../content/faces.js";
import { inherentPipsOf, type FaceCardDefinition } from "../../model/dice.js";
import type { DieId, FaceCardId, PlayerId, SymbolInstanceId } from "../../model/ids.js";
import { symbolTokenEntries, type SymbolType } from "../../model/symbols.js";
import type { Draft } from "../draft.js";
import { isSlotSilenced } from "../../rules/silence.js";
import { createRolledDieSymbol } from "./shownFace.js";

/**
 * `[Convert roll]` payoff can fire: not silenced, not suppress-inherent.
 * When this is true, that die’s pips this roll do not bank.
 */
export function isConvertingShownFace(
  face: Pick<FaceCardDefinition, "convertRoll">,
  silenced: boolean,
  suppressInherent = false,
): boolean {
  return face.convertRoll === true && !silenced && !suppressInherent;
}

/** Skip forge-yield / Overcharge `createSymbol` (auto-bank) for silence or convert. */
export function skipRollYieldAndOvercharge(
  face: Pick<FaceCardDefinition, "convertRoll">,
  silenced: boolean,
): boolean {
  return silenced || face.convertRoll === true;
}

function expireUnabsorbedDieResults(draft: Draft, dieId: DieId): void {
  for (const symbol of Object.values(draft.symbols)) {
    if (symbol.sourceDieId !== dieId) continue;
    if (symbol.status !== "rolled" && symbol.status !== "available") continue;
    delete draft.symbols[symbol.id];
  }
}

function createFacePips(
  draft: Draft,
  ownerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
  face: FaceCardDefinition,
): SymbolInstanceId[] {
  const ids: SymbolInstanceId[] = [];
  for (const [symbol, amount] of symbolTokenEntries(inherentPipsOf(face))) {
    for (let i = 0; i < amount; i += 1) {
      ids.push(createRolledDieSymbol(draft, ownerId, dieId, slotIndex, symbol));
    }
  }
  return ids;
}

/**
 * Create inherent showing pips attributed to this die.
 * Not a `generate-symbol` opcode — caller banks via `bankRolledSymbols` unless convert.
 */
export function createShowingFacePips(
  draft: Draft,
  ownerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
  face: FaceCardDefinition,
): readonly SymbolInstanceId[] {
  return createFacePips(draft, ownerId, dieId, slotIndex, face);
}

/**
 * `[Reroll]`: drop this die’s previous unabsorbed leftover, then mint the new
 * showing pips (convert applies to this new roll only).
 */
export function replaceShowingFacePips(
  draft: Draft,
  ownerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
  face: FaceCardDefinition,
): readonly SymbolInstanceId[] {
  expireUnabsorbedDieResults(draft, dieId);
  return createFacePips(draft, ownerId, dieId, slotIndex, face);
}

/** Forfeit converting-die pips so they never enter `attributePool`. */
export function forfeitRolledPips(
  draft: Draft,
  symbolIds: readonly SymbolInstanceId[],
): void {
  for (const symbolId of symbolIds) {
    const symbol = draft.symbols[symbolId];
    if (symbol === undefined) continue;
    if (symbol.status !== "rolled" && symbol.status !== "available") continue;
    draft.symbols[symbolId] = { ...symbol, status: "consumed", usable: false };
  }
}

export function convertingFromSlot(
  draft: Draft,
  dieId: DieId,
  slotIndex: number,
  suppressInherent = false,
): boolean {
  const faceCardId = draft.dice[dieId]?.slots[slotIndex]?.faceCardId;
  if (faceCardId === undefined) return false;
  const face = getFaceCard(faceCardId);
  if (face === undefined) return false;
  const silenced = isSlotSilenced(draft, dieId, slotIndex);
  return isConvertingShownFace(face, silenced, suppressInherent);
}

export type ShownFaceRollEntry = {
  readonly dieId: DieId;
  readonly slotIndex: number;
  readonly faceCardId: FaceCardId;
  readonly symbol: SymbolType;
  readonly suppressInherent: boolean;
  readonly symbolIds: readonly SymbolInstanceId[];
  readonly converting: boolean;
};

export function bankableShownFaceIds(
  entries: readonly ShownFaceRollEntry[],
): readonly SymbolInstanceId[] {
  return entries.flatMap((entry) =>
    entry.converting || entry.suppressInherent ? [] : [...entry.symbolIds],
  );
}
