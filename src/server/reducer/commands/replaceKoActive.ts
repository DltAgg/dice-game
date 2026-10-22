import type { GameError } from "../../model/errors.js";
import type { CreatureId, PlayerId } from "../../model/ids.js";
import { isLivingReserve } from "../../rules/fighters.js";
import { emit, type Draft } from "../draft.js";
import { setActiveFighter } from "../victory.js";
import { resumeAfterEffectPause } from "./priority.js";

/**
 * Completes `replace-ko-active` (spec `030`). The owner names a living
 * Reserve. The KOed Fighter stays defeated. This does not spend Tag or
 * Meter, does not call `returnToOpen`, and is not a Chain object.
 */
export function resolveReplaceKoActive(
  draft: Draft,
  playerId: PlayerId,
  creatureId: CreatureId,
): GameError | null {
  const pending = draft.pendingDecision;
  if (pending === null || pending.type !== "replace-ko-active") return "INVALID_PHASE";
  if (pending.controllerId !== playerId) return "PENDING_DECISION";

  const player = draft.players[playerId];
  if (player === undefined) return "UNKNOWN_ENTITY";
  if (!player.creatureIds.includes(creatureId)) return "INVALID_TARGET";
  const chosen = draft.creatures[creatureId];
  if (chosen === undefined) return "UNKNOWN_ENTITY";
  if (chosen.defeated || creatureId === pending.defeatedCreatureId) return "CREATURE_DEFEATED";
  if (!isLivingReserve(draft, player, creatureId)) return "INVALID_TARGET";

  const fromCreatureId = pending.defeatedCreatureId;
  draft.pendingDecision = null;
  setActiveFighter(draft, playerId, creatureId);
  emit(draft, {
    type: "tag-switched",
    playerId,
    fromCreatureId,
    toCreatureId: creatureId,
  });
  return resumeAfterEffectPause(draft);
}
