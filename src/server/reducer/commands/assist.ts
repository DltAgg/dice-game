import { getCreatureDefinition } from "../../content/creatures.js";
import type { GameError } from "../../model/errors.js";
import type { CreatureId, PlayerId } from "../../model/ids.js";
import type { ChainLink } from "../../model/state.js";
import { assistKey, showingTechnique } from "../../rules/fighters.js";
import { buildEffectLink, openReactionWindow, pushChainLink } from "../chain.js";
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
  if (player.activeCreatureId === reserveCreatureId) return "INVALID_TARGET";
  if (!player.creatureIds.includes(reserveCreatureId)) return "INVALID_TARGET";

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
    const cost = definition?.exceptionalAssistMeter ?? draft.config.assistMeterCost;
    const paid = spendMeter(draft, playerId, cost);
    if (paid !== null) return paid;
  }

  markPlayerSpent(draft, playerId, assistKey(reserveCreatureId));
  emit(draft, { type: "assist-declared", playerId, reserveCreatureId });

  const base = buildEffectLink({
    kind: "tactic-effect",
    controllerId: playerId,
    cardInstanceId: null,
    effects,
    sourceCreatureId: reserveCreatureId,
    declaredTargetCreatureId: player.activeCreatureId,
  });
  pushChainLink(draft, {
    ...base,
    kind: "combat-action",
    assistReserveId: reserveCreatureId,
  });
  openReactionWindow(draft, playerId, "same");
  return null;
}

export function conductAssist(draft: Draft, link: ChainLink): void {
  if (link.negated || link.assistReserveId === null || link.assistReserveId === undefined) return;
  const reserve = draft.creatures[link.assistReserveId];
  if (reserve === undefined) return;
  for (const effect of [...link.effects].reverse()) {
    pushEffect(
      draft,
      link.controllerId,
      effect,
      link.assistReserveId,
      link.declaredTargetCreatureId,
    );
  }
  drainResolution(draft);
}
