import type { PlayerId } from "../model/ids.js";
import type { ChainLink } from "../model/state.js";
import { opponentActiveId } from "../rules/fighters.js";
import type { Draft } from "./draft.js";

/** A sequence hit aims at the opponent's Active Fighter unless Redirect pinned it. */
export function hitFollowsActive(link: ChainLink): boolean {
  return (
    link.kind === "combat-action" &&
    link.sequenceRole !== undefined &&
    link.followsActive !== false
  );
}

/** The Fighter a waiting sequence hit damages, read when that hit resolves. */
export function aimedHit(draft: Draft, link: ChainLink): ChainLink {
  if (!hitFollowsActive(link)) return link;
  const active = opponentActiveId(draft, link.controllerId);
  if (active === null || active === link.declaredTargetCreatureId) return link;
  const creature = draft.creatures[active];
  if (creature === undefined || creature.defeated) return link;
  return { ...link, declaredTargetCreatureId: active };
}

/**
 * Tag changed this player's Active Fighter. Waiting hits that still follow
 * Active now aim at that Fighter. A hit Redirect already pinned is left alone.
 */
export function syncWaitingHitsToActive(draft: Draft, playerId: PlayerId): void {
  const active = draft.players[playerId]?.activeCreatureId;
  if (active === undefined) return;
  const current = draft.creatures[active];
  if (current === undefined || current.defeated) return;
  let changed = false;
  const chainStack = draft.chainStack.map((link) => {
    if (!hitFollowsActive(link)) return link;
    const targetId = link.declaredTargetCreatureId;
    if (targetId === null || targetId === active) return link;
    const target = draft.creatures[targetId];
    if (target === undefined || target.ownerId !== playerId) return link;
    changed = true;
    return { ...link, declaredTargetCreatureId: active };
  });
  if (changed) draft.chainStack = chainStack;
}
