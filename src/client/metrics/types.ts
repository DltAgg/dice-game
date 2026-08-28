import type { GameAction, GameError, MatchStatus, PlayerId, TurnPhase } from "@server";
import { METRICS_SCHEMA_VERSION } from "./thresholds.js";

export type MetricsSchemaVersion = typeof METRICS_SCHEMA_VERSION;

export type MatchMode = "local" | "host" | "client";

export type RecordingStatus = MatchStatus | "abandoned";

export interface CreatureHpSnapshot {
  readonly creatureId: string;
  readonly definitionId: string;
  readonly name: string;
  readonly ownerId: string;
  readonly position: string;
  readonly life: number;
  readonly damage: number;
  readonly remaining: number;
  readonly defeated: boolean;
}

export interface ZoneSnapshot {
  readonly hand: number;
  readonly deck: number;
  readonly graveyard: number;
  readonly ritual: number;
  readonly equipment: number;
  readonly overload: number;
}

export interface TurnRecord {
  readonly turn: number;
  readonly playerId: string;
  readonly startedAt: string | null;
  readonly endedAt: string | null;
  readonly durationMs: number | null;
  readonly actionCount: number;
  readonly rejectedCount: number;
  readonly energyAtStart: number | null;
  readonly energyAtEnd: number | null;
  readonly energyPassCause: "overshoot" | "voluntary-pass" | null;
  /** Sum of `energy-spent.amount`. Missing on recordings from before this field. */
  readonly energySpent?: number;
  readonly energyGained?: number;
  readonly energyLost?: number;
  /** Sum of `energy-passed.amount` (overshoot leftover or clean-pass grant). */
  readonly energyPassedAmount?: number;
  readonly damageDealt: number;
  readonly healAmount: number;
  readonly damagePrevented: number;
  readonly attacksDeclared: number;
  readonly cardsPlayed: number;
  readonly cardsDrawn: number;
  readonly forges: number;
  /** Tactic cards spent via FORGE_CARD (not face-install count). */
  readonly cardsForged: number;
  readonly absorbs: number;
  readonly ritualActivations: number;
  readonly creaturesDefeated: number;
  readonly pendingDecisionOpens: number;
  readonly reactionWindows: number;
  readonly chainLinksAdded: number;
  readonly stall: boolean;
  readonly hp: readonly CreatureHpSnapshot[];
  readonly zonesByPlayer: Readonly<Record<string, ZoneSnapshot>>;
}

export interface ActionSample {
  readonly seq: number;
  readonly at: string;
  readonly deltaMs: number;
  readonly turn: number;
  readonly phase: TurnPhase | string;
  readonly playerId: string | null;
  readonly actionType: GameAction["type"] | null;
  readonly accepted: boolean;
  readonly errorCode: GameError | null;
  readonly pendingDecisionType: string | null;
  readonly chainDepth: number;
  readonly eventsAppended: number;
  readonly eventTypes: readonly string[];
  /** True when reconstructed from a log on first observe (no think time). */
  readonly reconstructed: boolean;
}

export interface MatchRecording {
  readonly schemaVersion: MetricsSchemaVersion;
  readonly recordingId: string;
  readonly matchId: string;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly endedAt: string | null;
  readonly status: RecordingStatus;
  readonly recordedAs: MatchMode;
  readonly roomCode: string | null;
  readonly localPlayerId: string | null;
  readonly seed: number;
  readonly p1DeckId: string;
  readonly p2DeckId: string;
  readonly p1DeckName: string;
  readonly p2DeckName: string;
  readonly winnerId: PlayerId | string | null;
  readonly firstPlayerId: string | null;
  readonly totalTurns: number;
  readonly durationMs: number;
  readonly acceptedActions: number;
  readonly rejectedActions: number;
  readonly slowThinkCount: number;
  readonly stallTurnCount: number;
  readonly totalDamageDealt: number;
  readonly totalAttacksDeclared: number;
  readonly totalCardsPlayed: number;
  readonly totalCardsForged: number;
  /** Sum of Energy spent. Missing on recordings from before amount tracking. */
  readonly totalEnergySpent?: number;
  readonly eventCounts: Readonly<Record<string, number>>;
  readonly cardPlayCounts: Readonly<Record<string, number>>;
  readonly cardForgeCounts: Readonly<Record<string, number>>;
  readonly pendingDecisionCounts: Readonly<Record<string, number>>;
  readonly energyPassCounts: Readonly<Record<string, number>>;
  readonly livingCreaturesAtEnd: Readonly<Record<string, number>>;
  readonly hpRemainingAtEnd: Readonly<Record<string, number>>;
  readonly turns: readonly TurnRecord[];
  readonly actions: readonly ActionSample[];
}

export interface ObservationContext {
  readonly nowMs: number;
  readonly recordingId: string;
  readonly recordedAs: MatchMode;
  readonly roomCode: string | null;
  readonly localPlayerId: string | null;
  readonly p1DeckId: string;
  readonly p2DeckId: string;
  readonly p1DeckName: string;
  readonly p2DeckName: string;
}

export interface Clock {
  now(): number;
}

export interface MetricsRepository {
  list(): Promise<readonly MatchRecording[]>;
  get(recordingId: string): Promise<MatchRecording | undefined>;
  findByMatchId(matchId: string): Promise<MatchRecording | undefined>;
  save(recording: MatchRecording): Promise<void>;
  remove(recordingId: string): Promise<boolean>;
  clear(): Promise<void>;
}
