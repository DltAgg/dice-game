import type { CreatureId, PlayerId } from "../model/ids.js";
import { opponentOf } from "../rules/creatures.js";
import { patchCreature, patchPlayer, type Draft } from "./draft.js";
import { loseMatch } from "./matchEnd.js";
import { setComboCount } from "./meter.js";
import { returnToOpen } from "./offensive.js";

export function setActiveFighter(
  draft: Draft,
  playerId: PlayerId,
  creatureId: CreatureId,
): void {
  const player = draft.players[playerId];
  const next = draft.creatures[creatureId];
  if (player === undefined || next === undefined || next.defeated) return;
  for (const id of player.creatureIds) {
    const creature = draft.creatures[id];
    if (creature === undefined || creature.defeated) continue;
    patchCreature(draft, id, { position: id === creatureId ? "frontline" : "back" });
  }
  patchPlayer(draft, playerId, { activeCreatureId: creatureId });
}

function hasLivingReserve(draft: Draft, ownerId: PlayerId, defeatedId: CreatureId): boolean {
  const player = draft.players[ownerId];
  if (player === undefined) return false;
  return player.creatureIds.some((id) => {
    if (id === defeatedId) return false;
    const creature = draft.creatures[id];
    return creature !== undefined && !creature.defeated;
  });
}

/**
 * KO (spec `030`). The defeated owner's combo count becomes 0. The sequence
 * returns to Open and initiative passes to the opponent of that owner. A
 * starter or extender that caused the defeat settles after this and keeps
 * the player who hit as the Aggressor, in combo. The turn does not end here.
 * When the defeated Fighter is Active and a living Reserve remains, the owner
 * must choose who becomes Active.
 * A choice already waiting is left alone — there is no second decision queue.
 */
export function promoteOnKo(draft: Draft, defeatedId: CreatureId): void {
  const defeated = draft.creatures[defeatedId];
  if (defeated === undefined) return;
  const ownerId = defeated.ownerId;
  const player = draft.players[ownerId];
  if (player === undefined) return;
  setComboCount(draft, ownerId, 0);
  returnToOpen(draft, opponentOf(draft, ownerId));
  if (draft.status === "finished") return;
  const owner = draft.players[ownerId];
  if (owner === undefined || owner.activeCreatureId !== defeatedId) return;
  // Do not clobber a choice that is already open. No pause-and-resume queue
  // exists for a second pending, so the replacement prompt is skipped.
  if (draft.pendingDecision !== null) return;
  if (!hasLivingReserve(draft, ownerId, defeatedId)) return;
  draft.pendingDecision = {
    type: "replace-ko-active",
    controllerId: ownerId,
    defeatedCreatureId: defeatedId,
  };
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

  const loser = wiped.length === 2 ? draft.activePlayerId : wiped[0];
  if (loser === undefined) return;
  loseMatch(draft, loser);
}
