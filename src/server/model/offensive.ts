import type { PlayerId } from "./ids.js";

/**
 * Offensive sequence for sequence-role face actions and Fighter techniques
 * (spec `030`). Not a turn phase. Not spec `028` `comboCount`.
 */
export const SEQUENCE_ROLES = ["starter", "extender", "finisher"] as const;

export type SequenceRole = (typeof SEQUENCE_ROLES)[number];

export const OFFENSIVE_STATES = ["open", "combo", "finished"] as const;

export type OffensiveStateName = (typeof OFFENSIVE_STATES)[number];

export function isSequenceRole(value: string): value is SequenceRole {
  return (SEQUENCE_ROLES as readonly string[]).includes(value);
}

export interface PendingOffenseSettle {
  readonly actorId: PlayerId;
  readonly role: SequenceRole;
  readonly negated: boolean;
  readonly endsSequence: boolean;
  readonly passesInitiative: boolean;
  readonly sequenceActionId: string | null;
}
