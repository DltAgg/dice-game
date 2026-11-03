import type { GameAction, GameError, MatchStatus, PlayerId, TurnPhase } from "@server";
import { METRICS_SCHEMA_VERSION } from "./thresholds.js";

/** Schema 1 is the pile-era recording. Schema 2 adds sequence, Meter, Tag, and Assist. */
export type MetricsSchemaVersion = 1 | typeof METRICS_SCHEMA_VERSION;

/** Who recorded, and how the local seats were bound. */
export type MatchMode = "local" | "local-ai" | "host" | "client";

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
  /** Present on recordings made after the tag-fighter metrics revamp. */
  readonly fighting?: FightingTurn;
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
  readonly eventCounts: Readonly<Record<string, number>>;
  readonly cardPlayCounts: Readonly<Record<string, number>>;
  readonly cardForgeCounts: Readonly<Record<string, number>>;
  readonly pendingDecisionCounts: Readonly<Record<string, number>>;
  readonly livingCreaturesAtEnd: Readonly<Record<string, number>>;
  readonly hpRemainingAtEnd: Readonly<Record<string, number>>;
  readonly turns: readonly TurnRecord[];
  readonly actions: readonly ActionSample[];
  /** Match-wide sequence, Meter, Tag, Assist, and answer counts. Schema 2. */
  readonly fighting?: FightingCounts;
  readonly fightingBySeat?: Readonly<Record<string, FightingCounts>>;
  readonly fighterActivity?: Readonly<Record<string, FighterActivity>>;
  /** Face, Technique, and Assist names that were declared. */
  readonly hitNames?: Readonly<Record<string, number>>;
  readonly rejectionCounts?: Readonly<Record<string, number>>;
}

/** Counts that describe a tag-fighter turn or seat. All zeros is a real sample. */
export interface FightingCounts {
  readonly facesUsed: number;
  readonly techniquesUsed: number;
  readonly assists: number;
  readonly assistHits: number;
  readonly tags: number;
  readonly rerolls: number;
  readonly rerollsSkipped: number;
  readonly starters: number;
  readonly extenders: number;
  readonly finishers: number;
  readonly endSequences: number;
  readonly meterGained: number;
  readonly meterSpent: number;
  readonly negates: number;
  readonly passes: number;
  readonly responses: number;
  readonly counters: number;
  readonly parries: number;
  readonly braces: number;
  readonly exPlays: number;
  readonly shifts: number;
  readonly tagCalls: number;
  readonly movesets: number;
  readonly replaces: number;
  readonly rollChanges: number;
  readonly otherModifies: number;
  readonly koSwaps: number;
  readonly tagOuts: number;
  readonly whiffs: number;
  readonly discards: number;
  readonly lightHits: number;
  readonly mediumHits: number;
  readonly heavyHits: number;
}

export interface FightingTurn extends FightingCounts {
  readonly meterEnd: number | null;
  readonly comboPeak: number;
  readonly activeFighterName: string | null;
}

export interface FighterActivity {
  readonly key: string;
  readonly name: string;
  readonly ownerId: string;
  readonly definitionId: string;
  readonly facesUsed: number;
  readonly techniquesUsed: number;
  readonly assists: number;
  readonly tagsIn: number;
  readonly damageTaken: number;
  readonly defeated: number;
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
