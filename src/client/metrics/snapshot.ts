import {
  currentLife,
  getCard,
  getCreatureDefinition,
  maxLife,
  type CardId,
  type GameEvent,
  type GameState,
  type LoggedEvent,
  type PlayerId,
} from "@server";
import type { CreatureHpSnapshot, ZoneSnapshot } from "./types.js";

export function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

export function eventsSince(prev: GameState | null, next: GameState): readonly LoggedEvent[] {
  if (prev === null) return next.log;
  if (next.log === prev.log) return [];
  const start = prev.log.length;
  return next.log.slice(start);
}

export function countByType(events: readonly GameEvent[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event.type] = (counts[event.type] ?? 0) + 1;
  }
  return counts;
}

export function mergeCounts(
  base: Readonly<Record<string, number>>,
  extra: Readonly<Record<string, number>>,
): Record<string, number> {
  const merged: Record<string, number> = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    merged[key] = (merged[key] ?? 0) + value;
  }
  return merged;
}

export function creatureHpSnapshots(state: GameState): CreatureHpSnapshot[] {
  return Object.values(state.creatures).map((creature) => {
    const definition = getCreatureDefinition(creature.definitionId);
    return {
      creatureId: creature.id,
      definitionId: creature.definitionId,
      name: definition?.name ?? creature.definitionId,
      ownerId: creature.ownerId,
      position: creature.position,
      life: maxLife(creature),
      damage: creature.damage,
      remaining: currentLife(creature),
      defeated: creature.defeated,
    };
  });
}

export function zoneSnapshot(state: GameState, playerId: PlayerId): ZoneSnapshot {
  const player = state.players[playerId];
  if (player === undefined) {
    return { hand: 0, deck: 0, graveyard: 0, ritual: 0, equipment: 0, overload: 0 };
  }
  return {
    hand: player.hand.length,
    deck: player.deck.length,
    graveyard: player.graveyard.length,
    ritual: player.ritual.length,
    equipment: player.equipment.length,
    overload: player.overload.length,
  };
}

export function zonesByPlayer(state: GameState): Record<string, ZoneSnapshot> {
  const result: Record<string, ZoneSnapshot> = {};
  for (const playerId of state.playerOrder) {
    result[playerId] = zoneSnapshot(state, playerId);
  }
  return result;
}

export function livingAndHpByPlayer(state: GameState): {
  readonly living: Record<string, number>;
  readonly hp: Record<string, number>;
} {
  const living: Record<string, number> = {};
  const hp: Record<string, number> = {};
  for (const playerId of state.playerOrder) {
    living[playerId] = 0;
    hp[playerId] = 0;
  }
  for (const snapshot of creatureHpSnapshots(state)) {
    if (!snapshot.defeated) {
      living[snapshot.ownerId] = (living[snapshot.ownerId] ?? 0) + 1;
    }
    hp[snapshot.ownerId] = (hp[snapshot.ownerId] ?? 0) + snapshot.remaining;
  }
  return { living, hp };
}

export function incrementCardPlays(
  base: Readonly<Record<string, number>>,
  events: readonly GameEvent[],
): Record<string, number> {
  const next: Record<string, number> = { ...base };
  for (const event of events) {
    if (event.type !== "card-played") continue;
    next[cardLabel(event.cardId)] = (next[cardLabel(event.cardId)] ?? 0) + 1;
  }
  return next;
}

function cardLabel(cardId: CardId): string {
  const card = getCard(cardId);
  return card !== undefined ? `${card.name} (${cardId})` : cardId;
}

/** Tactic cards spent on FORGE_CARD. Several face-forged events can share one card. */
export function uniqueForgeCardInstanceIds(events: readonly GameEvent[]): readonly string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    if (event.type !== "face-forged" || event.cardInstanceId === null) continue;
    if (seen.has(event.cardInstanceId)) continue;
    seen.add(event.cardInstanceId);
    ids.push(event.cardInstanceId);
  }
  return ids;
}

export function incrementCardForges(
  base: Readonly<Record<string, number>>,
  events: readonly GameEvent[],
  state: GameState,
): Record<string, number> {
  const next: Record<string, number> = { ...base };
  for (const instanceId of uniqueForgeCardInstanceIds(events)) {
    const instance = state.cards[instanceId];
    const key = instance === undefined ? `forged (${instanceId})` : cardLabel(instance.cardId);
    next[key] = (next[key] ?? 0) + 1;
  }
  return next;
}

export function forgeCardsOnTurn(
  turn: { readonly turn: number; readonly cardsForged?: number },
  recording: {
    readonly actions: readonly {
      readonly accepted: boolean;
      readonly actionType: string | null;
      readonly turn: number;
    }[];
  },
): number {
  const fromField = turn.cardsForged ?? 0;
  const fromActions = recording.actions.filter(
    (sample) => sample.accepted && sample.actionType === "FORGE_CARD" && sample.turn === turn.turn,
  ).length;
  return Math.max(fromField, fromActions);
}

export function forgeCardCountOf(recording: {
  readonly totalCardsForged?: number;
  readonly cardForgeCounts?: Readonly<Record<string, number>>;
  readonly actions: readonly { readonly accepted: boolean; readonly actionType: string | null }[];
}): number {
  if (typeof recording.totalCardsForged === "number" && recording.totalCardsForged > 0) {
    return recording.totalCardsForged;
  }
  const named = Object.values(recording.cardForgeCounts ?? {}).reduce((sum, count) => sum + count, 0);
  if (named > 0) return named;
  return recording.actions.filter(
    (sample) => sample.accepted && sample.actionType === "FORGE_CARD",
  ).length;
}

export function sumDamage(events: readonly GameEvent[]): number {
  let total = 0;
  for (const event of events) {
    if (event.type === "damage-dealt") total += event.amount;
  }
  return total;
}

export function sumField(events: readonly GameEvent[], type: GameEvent["type"], field: "amount"): number {
  let total = 0;
  for (const event of events) {
    if (event.type !== type) continue;
    if (field in event && typeof (event as { amount?: unknown }).amount === "number") {
      total += (event as { amount: number }).amount;
    }
  }
  return total;
}

export function energyPassCause(
  events: readonly GameEvent[],
): "overshoot" | "voluntary-pass" | null {
  void events;
  return null;
}

export function firstPlayerFromLog(state: GameState): string | null {
  for (const entry of state.log) {
    if (entry.event.type === "match-started") return entry.event.firstPlayerId;
    if (entry.event.type === "turn-started") return entry.event.playerId;
  }
  return state.playerOrder[0] ?? null;
}

export function percentile(sorted: readonly number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index] ?? null;
}

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Pearson r. Null when n < 2 or a series has no variance. */
export function pearsonCorrelation(xs: readonly number[], ys: readonly number[]): number | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const meanX = mean(xs);
  const meanY = mean(ys);
  if (meanX === null || meanY === null) return null;
  let numerator = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const dx = (xs[i] ?? 0) - meanX;
    const dy = (ys[i] ?? 0) - meanY;
    numerator += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const denominator = Math.sqrt(denX * denY);
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function linearRegression(
  xs: readonly number[],
  ys: readonly number[],
): { readonly slope: number; readonly intercept: number } | null {
  if (xs.length !== ys.length || xs.length < 2) return null;
  const meanX = mean(xs);
  const meanY = mean(ys);
  if (meanX === null || meanY === null) return null;
  let numerator = 0;
  let denX = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const dx = (xs[i] ?? 0) - meanX;
    numerator += dx * ((ys[i] ?? 0) - meanY);
    denX += dx * dx;
  }
  if (denX === 0) return null;
  const slope = numerator / denX;
  return { slope, intercept: meanY - slope * meanX };
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const high = sorted[mid];
  if (high === undefined) return null;
  if (sorted.length % 2 === 1) return high;
  const low = sorted[mid - 1];
  if (low === undefined) return null;
  return (low + high) / 2;
}
