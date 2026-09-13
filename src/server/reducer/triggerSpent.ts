import type { CreatureId, PlayerId } from "../model/ids.js";
import { patchCreature, patchPlayer, type Draft } from "./draft.js";

/** Minimal host identity for once-per-turn keys (creature, equipment, ritual). */
export type OncePerTurnHost = {
  readonly keyPrefix: string;
  readonly hostCreatureId: CreatureId | null;
  readonly filterOwnerId: PlayerId;
};

export function onceKey(prefix: string, triggerType: string): string {
  return `${prefix}:${triggerType}`;
}

export function isSpent(draft: Draft, creatureId: CreatureId | null, key: string): boolean {
  if (creatureId === null) return false;
  return draft.creatures[creatureId]?.spentOncePerTurnTriggers.includes(key) ?? false;
}

export function markSpent(draft: Draft, creatureId: CreatureId | null, key: string): void {
  if (creatureId === null) return;
  const creature = draft.creatures[creatureId];
  if (creature === undefined) return;
  if (creature.spentOncePerTurnTriggers.includes(key)) return;
  patchCreature(draft, creatureId, {
    spentOncePerTurnTriggers: [...creature.spentOncePerTurnTriggers, key],
  });
}

export function isPlayerSpent(draft: Draft, playerId: PlayerId, key: string): boolean {
  return draft.players[playerId]?.spentOncePerTurnKeys.includes(key) ?? false;
}

export function markPlayerSpent(draft: Draft, playerId: PlayerId, key: string): void {
  const player = draft.players[playerId];
  if (player === undefined) return;
  if (player.spentOncePerTurnKeys.includes(key)) return;
  patchPlayer(draft, playerId, {
    spentOncePerTurnKeys: [...player.spentOncePerTurnKeys, key],
  });
}

export function isHostSpent(draft: Draft, host: OncePerTurnHost, triggerType: string): boolean {
  const key = onceKey(host.keyPrefix, triggerType);
  if (host.hostCreatureId !== null) {
    return isSpent(draft, host.hostCreatureId, key);
  }
  return isPlayerSpent(draft, host.filterOwnerId, key);
}

export function markHostSpent(draft: Draft, host: OncePerTurnHost, triggerType: string): void {
  const key = onceKey(host.keyPrefix, triggerType);
  if (host.hostCreatureId !== null) {
    markSpent(draft, host.hostCreatureId, key);
    return;
  }
  markPlayerSpent(draft, host.filterOwnerId, key);
}
