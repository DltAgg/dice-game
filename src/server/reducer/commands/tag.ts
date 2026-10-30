import type { GameError } from "../../model/errors.js";
import type { CreatureId, PlayerId } from "../../model/ids.js";
import type { ChainLink } from "../../model/state.js";
import { opponentOf } from "../../rules/creatures.js";
import { isLivingReserve } from "../../rules/fighters.js";
import { TAG_TURN_KEY, tagInLocked, tagWindow } from "../../rules/offensive.js";
import { syncWaitingHitsToActive } from "../activeHitTarget.js";
import { buildEffectLink, openReactionWindow, pushChainLink } from "../chain.js";
import { emit, type Draft } from "../draft.js";
import { setComboCount } from "../meter.js";
import { markPlayerSpent } from "../triggerSpent.js";
import { setActiveFighter } from "../victory.js";
import { endTurn } from "./turn.js";

export function tag(
  draft: Draft,
  playerId: PlayerId,
  reserveCreatureId: CreatureId,
): GameError | null {
  const player = draft.players[playerId];
  if (player === undefined) return "UNKNOWN_ENTITY";
  const active = draft.creatures[player.activeCreatureId];
  if (active === undefined) return "UNKNOWN_ENTITY";
  if (active.defeated) return "CREATURE_DEFEATED";
  if (!isLivingReserve(draft, player, reserveCreatureId)) return "INVALID_TARGET";
  if (tagInLocked(draft, reserveCreatureId)) return "INVALID_TARGET";
  if (player.spentOncePerTurnKeys.includes(TAG_TURN_KEY)) return "ALREADY_USED";

  const tagMoment = tagWindow(draft, playerId);
  if (tagMoment === null) return "INVALID_PHASE";

  markPlayerSpent(draft, playerId, TAG_TURN_KEY);

  const base = buildEffectLink({
    kind: "tactic-effect",
    controllerId: playerId,
    cardInstanceId: null,
    effects: [],
    sourceCreatureId: player.activeCreatureId,
    declaredTargetCreatureId: reserveCreatureId,
  });
  pushChainLink(draft, {
    ...base,
    kind: "combat-action",
    tagReserveId: reserveCreatureId,
    endsSequence: tagMoment === "closing",
  });
  openReactionWindow(draft, playerId, "same");
  return null;
}

/** Swap Active to a living reserve. Does not spend Meter. */
export function performTagSwitch(
  draft: Draft,
  playerId: PlayerId,
  reserveCreatureId: CreatureId,
): GameError | null {
  const player = draft.players[playerId];
  if (player === undefined) return "UNKNOWN_ENTITY";
  if (!isLivingReserve(draft, player, reserveCreatureId)) return "INVALID_TARGET";
  if (tagInLocked(draft, reserveCreatureId)) return "INVALID_TARGET";

  const fromCreatureId = player.activeCreatureId;
  setActiveFighter(draft, playerId, reserveCreatureId);
  syncWaitingHitsToActive(draft, playerId);
  setComboCount(draft, playerId, 0);
  emit(draft, {
    type: "tag-switched",
    playerId,
    fromCreatureId,
    toCreatureId: reserveCreatureId,
  });
  return null;
}

export function conductTag(draft: Draft, link: ChainLink): void {
  if (link.negated || link.tagReserveId === null || link.tagReserveId === undefined) return;
  const reserve = draft.creatures[link.tagReserveId];
  if (reserve === undefined || reserve.defeated) return;
  const switched = performTagSwitch(draft, link.controllerId, link.tagReserveId);
  if (switched !== null) return;
  if (link.endsSequence === true) {
    endTurn(draft, link.controllerId);
    return;
  }
  if (link.passesInitiative === true) {
    draft.aggressorPlayerId = opponentOf(draft, link.controllerId);
  }
}
