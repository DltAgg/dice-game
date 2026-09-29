import type { GameError } from "../../model/errors.js";
import type { CreatureId, PlayerId } from "../../model/ids.js";
import {
  isLivingReserve,
  showingTechnique,
} from "../../rules/fighters.js";
import { emit, type Draft } from "../draft.js";
import { spendMeter, setComboCount } from "../meter.js";
import { setActiveFighter } from "../victory.js";

export function tag(
  draft: Draft,
  playerId: PlayerId,
  reserveCreatureId: CreatureId,
): GameError | null {
  if (draft.phase !== "actions") return "INVALID_PHASE";
  const player = draft.players[playerId];
  if (player === undefined) return "UNKNOWN_ENTITY";
  if (!isLivingReserve(draft, player, reserveCreatureId)) return "INVALID_TARGET";

  const showingTag = showingTechnique(draft, player.activeCreatureId) === "tag";
  if (!showingTag) {
    const paid = spendMeter(draft, playerId, draft.config.tagCancelMeterCost);
    if (paid !== null) return paid;
  }

  const fromCreatureId = player.activeCreatureId;
  setActiveFighter(draft, playerId, reserveCreatureId);
  setComboCount(draft, playerId, 0);
  emit(draft, {
    type: "tag-switched",
    playerId,
    fromCreatureId,
    toCreatureId: reserveCreatureId,
  });
  return null;
}
