import { getCreatureDefinition } from "../../content/creatures.js";
import type { GameError } from "../../model/errors.js";
import type { CreatureId, PlayerId } from "../../model/ids.js";
import type { ChainLink } from "../../model/state.js";
import { assistDeclarationError, assistHitEffect, assistKey, opponentActiveId } from "../../rules/fighters.js";
import { buildEffectLink, openReactionWindow, pushChainLink } from "../chain.js";
import { emit, type Draft } from "../draft.js";
import { attackBanError } from "../exCard.js";
import { spendMeter } from "../meter.js";
import { openCombatAction } from "../offensive.js";
import { drainResolution, pushEffect } from "../resolution.js";
import { markPlayerSpent } from "../triggerSpent.js";

export function assist(
  draft: Draft,
  playerId: PlayerId,
  reserveCreatureId: CreatureId,
): GameError | null {
  const declared = assistDeclarationError(draft, playerId, reserveCreatureId);
  if (declared !== null) return declared;

  const player = draft.players[playerId];
  if (player === undefined) return "UNKNOWN_ENTITY";
  const creature = draft.creatures[reserveCreatureId];
  if (creature === undefined) return "UNKNOWN_ENTITY";
  const definition = getCreatureDefinition(creature.definitionId);
  const effects = definition?.assistEffects ?? [];
  if (definition === undefined || effects.length === 0) return "CARD_HAS_NO_EFFECT";
  const hit = assistHitEffect(effects);
  if (hit === "many") return "INVALID_TARGET";
  if (hit !== null) {
    const banned = attackBanError(creature, draft.turn);
    if (banned !== null) return banned;
  }

  const cost = definition.exceptionalAssistMeter ?? 0;
  if (cost > 0) {
    const paid = spendMeter(draft, playerId, cost);
    if (paid !== null) return paid;
  }

  markPlayerSpent(draft, playerId, assistKey(reserveCreatureId));
  emit(draft, { type: "assist-declared", playerId, reserveCreatureId });

  if (hit !== null) {
    const targetId = opponentActiveId(draft, playerId);
    openCombatAction(draft, {
      playerId,
      sourceCreatureId: reserveCreatureId,
      declaredTargetCreatureId: targetId,
      effects,
      sequenceRole: hit.sequenceRole,
      meterCost: 0,
      meterGain: 0,
      hitStrength: hit.hitStrength,
      hitType: hit.hitType,
      assistReserveId: reserveCreatureId,
      sequenceActionId: assistKey(reserveCreatureId),
    });
    return null;
  }

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
