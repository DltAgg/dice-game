import { getFaceCard } from "../../content/faces.js";
import type { DieId, PlayerId, SymbolInstanceId } from "../../model/ids.js";
import { isSlotSilenced } from "../../rules/silence.js";
import type { Draft } from "../draft.js";
import { bankRolledSymbols } from "../rollBank.js";
import { fireEquipmentOnRollSymbol } from "../triggers.js";
import {
  applyForgeYieldGenerate,
  applyOverchargeGenerate,
  fireOverloadsForShownFace,
} from "./shownFace.js";
import { forfeitRolledPips } from "./rollPips.js";

function unabsorbedFromDie(draft: Draft, dieId: DieId): readonly SymbolInstanceId[] {
  const ids: SymbolInstanceId[] = [];
  for (const symbol of Object.values(draft.symbols)) {
    if (symbol.sourceDieId !== dieId) continue;
    if (symbol.status !== "rolled" && symbol.status !== "available") continue;
    ids.push(symbol.id);
  }
  return ids;
}

/** Apply pip bank vs forfeit after the convert Choose one. */
export function applyConvertRollPips(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
  bank: boolean,
): void {
  const die = draft.dice[dieId];
  const slot = die?.slots[slotIndex];
  const face = slot === undefined ? undefined : getFaceCard(slot.faceCardId);
  if (die === undefined || slot === undefined || face === undefined) return;

  const symbolIds = unabsorbedFromDie(draft, dieId);
  if (bank) {
    if (!isSlotSilenced(draft, dieId, slotIndex)) {
      applyForgeYieldGenerate(draft, playerId, slot, face.symbol);
      applyOverchargeGenerate(draft, die.ownerId, slot.faceCardId);
    }
    const deferAbsorb = draft.pendingDecision !== null || draft.resolutionStack.length > 0;
    bankRolledSymbols(draft, playerId, symbolIds, deferAbsorb);
    return;
  }
  forfeitRolledPips(draft, symbolIds);
}

/** Overloads only on the payoff; equipment on-roll-symbol on either path. */
export function fireConvertRollExtras(
  draft: Draft,
  playerId: PlayerId,
  dieId: DieId,
  slotIndex: number,
  bank: boolean,
): void {
  const die = draft.dice[dieId];
  const slot = die?.slots[slotIndex];
  const face = slot === undefined ? undefined : getFaceCard(slot.faceCardId);
  if (die === undefined || slot === undefined || face === undefined) return;
  if (isSlotSilenced(draft, dieId, slotIndex)) return;
  if (!bank) {
    fireOverloadsForShownFace(draft, playerId, slot.faceCardId, dieId, slotIndex);
  }
  fireEquipmentOnRollSymbol(draft, playerId, face.symbol);
}
