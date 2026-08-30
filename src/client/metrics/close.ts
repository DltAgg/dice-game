import type { MatchRecording, TurnRecord } from "./types.js";

export function firstTurnWhere(
  turns: readonly TurnRecord[],
  matches: (turn: TurnRecord) => boolean,
): number | null {
  const found = [...turns].sort((left, right) => left.turn - right.turn).find(matches);
  return found === undefined ? null : found.turn;
}

export function firstDamageTurn(recording: MatchRecording): number | null {
  return firstTurnWhere(recording.turns, (turn) => turn.damageDealt > 0);
}

export function firstAttackTurn(recording: MatchRecording): number | null {
  return firstTurnWhere(recording.turns, (turn) => turn.attacksDeclared > 0);
}

export function firstDefeatTurn(recording: MatchRecording): number | null {
  return firstTurnWhere(recording.turns, (turn) => turn.creaturesDefeated > 0);
}

/** True when a creature left the board even if turn rows omitted the death event. */
export function matchEndedWithDefeat(recording: MatchRecording): boolean {
  if (firstDefeatTurn(recording) !== null) return true;
  return Object.values(recording.livingCreaturesAtEnd).some((count) => count === 0);
}

export type DefeatCloseKind = "logged" | "unlogged" | "never";

export function defeatCloseKind(recording: MatchRecording): DefeatCloseKind {
  if (firstDefeatTurn(recording) !== null) return "logged";
  if (matchEndedWithDefeat(recording)) return "unlogged";
  return "never";
}

export function firstPlayerWon(recording: MatchRecording): boolean | null {
  if (recording.status !== "finished") return null;
  if (recording.winnerId === null || recording.firstPlayerId === null) return null;
  return recording.winnerId === recording.firstPlayerId;
}

export interface CloseTurnPoint {
  readonly turn: number;
  readonly meanDamage: number;
  readonly meanDeaths: number;
  readonly matchCount: number;
}

export function closeByTurn(recordings: readonly MatchRecording[]): CloseTurnPoint[] {
  const byTurn = new Map<number, { damage: number; deaths: number; n: number }>();
  for (const recording of recordings) {
    for (const row of recording.turns) {
      const bucket = byTurn.get(row.turn) ?? { damage: 0, deaths: 0, n: 0 };
      bucket.damage += row.damageDealt;
      bucket.deaths += row.creaturesDefeated;
      bucket.n += 1;
      byTurn.set(row.turn, bucket);
    }
  }
  return [...byTurn.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([turn, bucket]) => ({
      turn,
      meanDamage: bucket.damage / bucket.n,
      meanDeaths: bucket.deaths / bucket.n,
      matchCount: bucket.n,
    }));
}

export interface DeckPairRecord {
  readonly pair: string;
  readonly matches: number;
  readonly p1Wins: number;
  readonly p2Wins: number;
}

export function deckPairKey(recording: MatchRecording): string {
  const left = recording.p1DeckName.trim() || recording.p1DeckId;
  const right = recording.p2DeckName.trim() || recording.p2DeckId;
  return `${left} vs ${right}`;
}

export function deckPairRecords(recordings: readonly MatchRecording[]): DeckPairRecord[] {
  const byPair = new Map<string, DeckPairRecord>();
  for (const recording of recordings) {
    const pair = deckPairKey(recording);
    const existing = byPair.get(pair) ?? { pair, matches: 0, p1Wins: 0, p2Wins: 0 };
    const next: DeckPairRecord = {
      pair,
      matches: existing.matches + 1,
      p1Wins: existing.p1Wins + (recording.winnerId === "p1" ? 1 : 0),
      p2Wins: existing.p2Wins + (recording.winnerId === "p2" ? 1 : 0),
    };
    byPair.set(pair, next);
  }
  return [...byPair.values()].sort((left, right) => right.matches - left.matches);
}
