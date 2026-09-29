import { isAttributeSymbol } from "../model/symbols.js";
import type { PlayerId, SymbolInstanceId } from "../model/ids.js";
import { isUnabsorbedPoolSymbol } from "../rules/symbols.js";
import { emit, type Draft } from "./draft.js";
import { queueAbsorbTriggers } from "./triggers.js";

/**
 * Mark a usable attribute pip absorbed and queue On absorb.
 * Does not drain the resolution stack (caller drains). Returns false if the
 * pip was not eligible (already gone, Shield, locked, wrong owner).
 *
 * Used by ROLL_DICE auto-absorb, effect `createSymbol`, and manual ABSORB_SYMBOL.
 * Persistent pile banking was removed; absorb still fires face On absorb hooks.
 */
export function bankAttributeIntoPile(
  draft: Draft,
  playerId: PlayerId,
  symbolId: SymbolInstanceId,
  options?: { readonly deferAbsorb?: boolean },
): boolean {
  const symbol = draft.symbols[symbolId];
  if (symbol === undefined) return false;
  if (symbol.ownerId !== playerId) return false;
  if (!isUnabsorbedPoolSymbol(symbol)) return false;
  if (!isAttributeSymbol(symbol.symbol)) return false;
  if (symbol.usable === false) return false;

  draft.symbols[symbolId] = {
    ...symbol,
    status: "absorbed",
    absorbedByCreatureId: null,
  };

  emit(draft, {
    type: "symbol-absorbed",
    symbolId,
    playerId,
    creatureId: null,
  });

  if (options?.deferAbsorb !== true) {
    queueAbsorbTriggers(
      draft,
      playerId,
      { kind: "player", id: playerId },
      symbol.symbol,
      symbol.sourceDieId,
      null,
    );
  }
  return true;
}
