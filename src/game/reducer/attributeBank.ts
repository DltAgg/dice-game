import { isAttributeSymbol } from "../model/symbols.js";
import type { Attribute } from "../model/attributes.js";
import type { CreatureId, PlayerId, SymbolInstanceId } from "../model/ids.js";
import { addToken } from "../rules/tokens.js";
import { isUnabsorbedPoolSymbol } from "../rules/symbols.js";
import { emit, patchPlayer, type Draft } from "./draft.js";
import { queueAbsorbTriggers } from "./triggers.js";
import { refreshRitualOrientations } from "./zones.js";

/**
 * Bank a usable attribute pip into the owner's pile and queue On absorb.
 * Does not drain the resolution stack (caller drains). Returns false if the
 * pip was not eligible (already gone, Shield, locked, wrong owner).
 *
 * Used by ROLL_DICE auto-bank, effect `createSymbol`, and manual ABSORB_SYMBOL.
 */
export function bankAttributeIntoPile(
  draft: Draft,
  playerId: PlayerId,
  symbolId: SymbolInstanceId,
  creatureId: CreatureId | null = null,
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

  const player = draft.players[playerId];
  if (player === undefined) return false;
  patchPlayer(draft, playerId, {
    attributePool: addToken(player.attributePool, symbol.symbol as Attribute),
  });
  refreshRitualOrientations(draft, playerId);

  emit(draft, {
    type: "symbol-absorbed",
    symbolId,
    playerId,
    creatureId: null,
  });
  emit(draft, {
    type: "attribute-token-gained",
    playerId,
    attribute: symbol.symbol as Attribute,
    amount: 1,
  });

  queueAbsorbTriggers(
    draft,
    playerId,
    creatureId !== null
      ? { kind: "creature", id: creatureId }
      : { kind: "player", id: playerId },
    symbol.symbol,
    symbol.sourceDieId,
    creatureId,
  );
  return true;
}
