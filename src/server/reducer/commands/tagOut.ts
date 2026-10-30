import type { GameError } from "../../model/errors.js";
import type { CreatureId, PlayerId } from "../../model/ids.js";
import { isLivingReserve } from "../../rules/fighters.js";
import { opponentOf } from "../../rules/creatures.js";
import { tagInLockUntilTurn } from "../../rules/offensive.js";
import { emit, patchCreature, type Draft } from "../draft.js";
import { syncWaitingHitsToActive } from "../activeHitTarget.js";
import { setActiveFighter } from "../victory.js";
import { resumeAfterEffectPause } from "./priority.js";

/**
 * `[Tag out]` the opponent's Active Fighter (spec `030`).
 * Returns true when the opponent must choose a living Reserve.
 * A Fighter who is no longer Active — including one this hit just KOed —
 * is left to the KO replacement. No living Reserve: nothing happens.
 */
export function beginTagOut(
  draft: Draft,
  controllerId: PlayerId,
  declaredTargetId: CreatureId | null,
  preventTagIn = false,
): boolean {
  if (draft.pendingDecision !== null) return false;
  const opponentId = opponentOf(draft, controllerId);
  const opponent = draft.players[opponentId];
  if (opponent === undefined) return false;
  const activeId = opponent.activeCreatureId;
  const active = draft.creatures[activeId];
  if (active === undefined || active.defeated) return false;
  if (declaredTargetId !== null && declaredTargetId !== activeId) return false;
  const hasReserve = opponent.creatureIds.some((id) => isLivingReserve(draft, opponent, id));
  if (!hasReserve) return false;
  draft.pendingDecision = {
    type: "tag-out-active",
    controllerId: opponentId,
    fromCreatureId: activeId,
    ...(preventTagIn ? { preventTagIn: true } : {}),
  };
  return true;
}

/** Completes `tag-out-active`. Does not spend Tag or Meter. */
export function resolveTagOut(
  draft: Draft,
  playerId: PlayerId,
  creatureId: CreatureId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "tag-out-active") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

  const player = draft.players[playerId];
  if (player === undefined) return "UNKNOWN_ENTITY";
  if (player.activeCreatureId !== pending.fromCreatureId) return "INVALID_TARGET";
  if (!player.creatureIds.includes(creatureId)) return "INVALID_TARGET";
  const chosen = draft.creatures[creatureId];
  if (chosen === undefined) return "UNKNOWN_ENTITY";
  if (chosen.defeated || creatureId === pending.fromCreatureId) return "CREATURE_DEFEATED";
  if (!isLivingReserve(draft, player, creatureId)) return "INVALID_TARGET";

  const fromCreatureId = pending.fromCreatureId;
  draft.pendingDecision = null;
  setActiveFighter(draft, playerId, creatureId);
  syncWaitingHitsToActive(draft, playerId);
  if (pending.preventTagIn === true) {
    patchCreature(draft, fromCreatureId, {
      tagInLockedUntilTurn: tagInLockUntilTurn(draft.turn),
    });
  }
  emit(draft, {
    type: "tag-switched",
    playerId,
    fromCreatureId,
    toCreatureId: creatureId,
  });
  return resumeAfterEffectPause(draft);
}
