/** Playtest flags — not bible numbers. Retune here, not in the reducer. */
export const BASELINE_TURNS = 10;
/**
 * Opening turns are expected to arm (absorb fuel) rather than swing.
 * Idle/stall after this window counts against the drag score.
 */
export const ARMING_TURN_WINDOW = 2;
export const STALL_DAMAGE_THRESHOLD = 0;
export const SLOW_THINK_MS = 15_000;
export const LOW_LETHALITY_DAMAGE_PER_TURN = 2;
export const EMPTY_TURN_RATE_FLAG = 0.35;
export const DRAG_SCORE_WARN = 4;
export const DRAG_SCORE_HIGH = 8;
export const MAX_STORED_RECORDINGS = 200;
export const METRICS_SCHEMA_VERSION = 1;

export const METRICS_IDB_NAME = "dice-skirmish-metrics";
export const METRICS_IDB_STORE = "recordings";
export const METRICS_LOCAL_STORAGE_KEY = "dice-skirmish.metrics.v1";
