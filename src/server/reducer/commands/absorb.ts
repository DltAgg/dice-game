import type { GameError } from "../../model/errors.js";
import type { CreatureId, PlayerId, SymbolInstanceId } from "../../model/ids.js";
import { isAttributeSymbol } from "../../model/symbols.js";
import { isUnabsorbedPoolSymbol } from "../../rules/symbols.js";
import { bankAttributeIntoPile } from "../attributeBank.js";
import { emit, patchDie, type Draft } from "../draft.js";
import { drainResolution, grantShield } from "../resolution.js";
import { queueAbsorbTriggers } from "../triggers.js";

/**
 * Spec `016`: attribute pips bank into the player's pile immediately (no
 * creature target). Rolled attributes auto-bank at the end of ROLL_DICE;
 * effect-generated attributes auto-bank in `createSymbol`. Manual absorb
 * remains for any leftover pool attributes and for Shield (creature target).
 */
export function absorbSymbol(
  draft: Draft,
  playerId: PlayerId,
  symbolId: SymbolInstanceId,
  creatureId: CreatureId | undefined,
): GameError | null {
  if (draft.phase !== "actions") return "INVALID_PHASE";

  const symbol = draft.symbols[symbolId];
  if (symbol === undefined) return "UNKNOWN_ENTITY";
  if (symbol.ownerId !== playerId) return "INVALID_TARGET";
  if (!isUnabsorbedPoolSymbol(symbol)) return "SYMBOL_UNAVAILABLE";

  if (isAttributeSymbol(symbol.symbol)) {
    if (!bankAttributeIntoPile(draft, playerId, symbolId)) {
      return "SYMBOL_UNAVAILABLE";
    }
    drainResolution(draft);
    return null;
  }

  // Shield: creature target required.
  if (creatureId === undefined) return "INVALID_TARGET";
  const creature = draft.creatures[creatureId];
  if (creature === undefined) return "UNKNOWN_ENTITY";
  if (creature.ownerId !== playerId) return "INVALID_TARGET";
  if (creature.defeated) return "CREATURE_DEFEATED";

  draft.symbols[symbolId] = {
    ...symbol,
    status: "absorbed",
    absorbedByCreatureId: creatureId,
  };

  if (symbol.sourceDieId !== null) {
    patchDie(draft, symbol.sourceDieId, { attachedToCreatureId: creatureId });
  }

  emit(draft, {
    type: "symbol-absorbed",
    symbolId,
    playerId,
    creatureId,
  });

  grantShield(draft, creatureId, 1);

  queueAbsorbTriggers(
    draft,
    playerId,
    { kind: "creature", id: creatureId },
    symbol.symbol,
    symbol.sourceDieId,
  );
  drainResolution(draft);
  return null;
}
