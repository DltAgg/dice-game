import type { PlayerId, SymbolInstanceId } from "../model/ids.js";
import { bankAttributeIntoPile } from "./attributeBank.js";
import type { Draft } from "./draft.js";
import { drainResolution } from "./resolution.js";
import { queueAbsorbTriggers } from "./triggers.js";

/** Symbol ids banked this roll whose on-absorb triggers wait for on-roll choices. */
export function queueRollBank(draft: Draft, symbolIds: readonly SymbolInstanceId[]): void {
  draft.rollBankQueue = [...symbolIds];
}

export function clearRollBankQueue(draft: Draft): void {
  draft.rollBankQueue = [];
}

/** Fire deferred on-absorb triggers for symbols banked on this roll. */
export function flushRollBankQueue(draft: Draft, playerId: PlayerId): void {
  if (draft.rollBankQueue.length === 0) return;
  for (const symbolId of draft.rollBankQueue) {
    const symbol = draft.symbols[symbolId];
    if (symbol === undefined) continue;
    if (symbol.ownerId !== playerId) continue;
    if (symbol.status !== "absorbed") continue;
    queueAbsorbTriggers(
      draft,
      playerId,
      { kind: "player", id: playerId },
      symbol.symbol,
      symbol.sourceDieId,
      null,
    );
  }
  draft.rollBankQueue = [];
  drainResolution(draft);
}

/**
 * After a choice resolves: if this roll deferred on-absorb, flush once the
 * on-roll resolution stack is clear.
 */
export function tryFlushRollBankQueue(draft: Draft): void {
  if (draft.rollBankQueue.length === 0) return;
  if (draft.pendingDecision !== null) return;
  if (draft.resolutionStack.length > 0) return;
  flushRollBankQueue(draft, draft.activePlayerId);
}

/** Bank rolled attribute pips; defer on-absorb when on-roll still resolving. */
export function bankRolledSymbols(
  draft: Draft,
  playerId: PlayerId,
  symbolIds: readonly SymbolInstanceId[],
  deferAbsorb: boolean,
): void {
  for (const symbolId of symbolIds) {
    bankAttributeIntoPile(draft, playerId, symbolId, { deferAbsorb });
  }
  if (deferAbsorb) {
    queueRollBank(draft, symbolIds);
  }
}
