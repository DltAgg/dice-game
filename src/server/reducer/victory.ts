import type { CreatureId, PlayerId } from "../model/ids.js";
import { emit, patchCreature, patchPlayer, type Draft } from "./draft.js";
import { setComboCount } from "./meter.js";

export function setActiveFighter(
  draft: Draft,
  playerId: PlayerId,
  creatureId: CreatureId,
): void {
  const player = draft.players[playerId];
  if (player === undefined) return;
  for (const id of player.creatureIds) {
    const creature = draft.creatures[id];
    if (creature === undefined || creature.defeated) continue;
    patchCreature(draft, id, { position: id === creatureId ? "frontline" : "back" });
  }
  patchPlayer(draft, playerId, { activeCreatureId: creatureId });
}

export function promoteOnKo(draft: Draft, defeatedId: CreatureId): void {
  const defeated = draft.creatures[defeatedId];
  if (defeated === undefined) return;
  const player = draft.players[defeated.ownerId];
  if (player === undefined || player.activeCreatureId !== defeatedId) return;
  const next = player.creatureIds.find((id) => {
    const creature = draft.creatures[id];
    return creature !== undefined && !creature.defeated;
  });
  if (next === undefined) return;
  setActiveFighter(draft, player.id, next);
  setComboCount(draft, player.id, 0);
  emit(draft, {
    type: "tag-switched",
    playerId: player.id,
    fromCreatureId: defeatedId,
    toCreatureId: next,
  });
}

/**
 * Wipe victory (spec `028`). Simultaneous full wipe: the active player loses.
 */
export function checkVictory(draft: Draft): void {
  if (draft.status === "finished" || !draft.config.wipeVictory) return;

  const wiped = draft.playerOrder.filter((playerId) => {
    const player = draft.players[playerId];
    if (player === undefined) return false;
    return player.creatureIds.every((id) => draft.creatures[id]?.defeated === true);
  });
  if (wiped.length === 0) return;

  const loser =
    wiped.length === 2
      ? draft.activePlayerId
      : wiped[0];
  if (loser === undefined) return;
  const winner = draft.playerOrder.find((id) => id !== loser) ?? null;
  draft.status = "finished";
  draft.winner = winner;
  if (winner !== null) {
    emit(draft, { type: "match-finished", winnerId: winner });
  }
}
