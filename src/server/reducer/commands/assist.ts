import { getCreatureDefinition } from "../../content/creatures.js";
import type { GameError } from "../../model/errors.js";
import type { CreatureId, PlayerId } from "../../model/ids.js";
import { assistKey, isLivingReserve, showingTechnique } from "../../rules/fighters.js";
import { emit, type Draft } from "../draft.js";
import { spendMeter } from "../meter.js";
import { drainResolution, pushEffect } from "../resolution.js";
import { markPlayerSpent } from "../triggerSpent.js";

export function assist(
  draft: Draft,
  playerId: PlayerId,
  reserveCreatureId: CreatureId,
): GameError | null {
  if (draft.phase !== "actions") return "INVALID_PHASE";
  const player = draft.players[playerId];
  if (player === undefined) return "UNKNOWN_ENTITY";
  if (!isLivingReserve(draft, player, reserveCreatureId)) return "INVALID_TARGET";

  const creature = draft.creatures[reserveCreatureId];
  if (creature === undefined) return "UNKNOWN_ENTITY";
  const definition = getCreatureDefinition(creature.definitionId);
  const effects = definition?.assistEffects ?? [];
  if (effects.length === 0) return "CARD_HAS_NO_EFFECT";

  if (player.spentOncePerTurnKeys.includes(assistKey(reserveCreatureId))) {
    return "ALREADY_USED";
  }

  const showingAssist = showingTechnique(draft, reserveCreatureId) === "assist";
  if (!showingAssist) {
    const paid = spendMeter(draft, playerId, draft.config.assistMeterCost);
    if (paid !== null) return paid;
  }

  markPlayerSpent(draft, playerId, assistKey(reserveCreatureId));
  emit(draft, { type: "assist-declared", playerId, reserveCreatureId });

  const activeId = player.activeCreatureId;
  for (const effect of [...effects].reverse()) {
    pushEffect(draft, playerId, effect, reserveCreatureId, activeId);
  }
  drainResolution(draft);
  return null;
}
