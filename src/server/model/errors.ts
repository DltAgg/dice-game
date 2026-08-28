/**
 * Expected illegal player actions are values, not exceptions (SPDD §44).
 * A thrown error in the engine means a bug in the engine, never a bad move.
 */
export type GameError =
  | "GAME_FINISHED"
  | "INVALID_PHASE"
  | "NOT_ACTIVE_PLAYER"
  | "UNKNOWN_ENTITY"
  | "INVALID_TARGET"
  | "INSUFFICIENT_ENERGY"
  | "INSUFFICIENT_SYMBOLS"
  /** The attacker has not absorbed the attributes its attack requires. */
  | "ATTACK_NOT_FUELLED"
  | "SYMBOL_UNAVAILABLE"
  | "INVALID_FACE"
  /** No matching face card is available in the owner's face pool (bible §12). */
  | "FACE_NOT_AVAILABLE"
  | "CREATURE_DEFEATED"
  | "ATTACK_ALREADY_USED"
  | "DIE_STUNNED"
  | "CARD_NOT_AVAILABLE"
  /** The card forges but its effect region is empty, or vice versa. */
  | "CARD_HAS_NO_EFFECT"
  /** The forge names a different number of slots than the card forges faces. */
  | "WRONG_FACE_COUNT"
  /** Forging would put a fifth face of one attribute on a die (bible §9.1). */
  | "ATTRIBUTE_LIMIT_REACHED"
  /** An effect is waiting on a player choice; only that controller's matching resolve is legal. */
  | "PENDING_DECISION"
  /** The search picks do not match the pending search (count, zone, or filter). */
  | "INVALID_SEARCH"
  /** The discard picks do not match the pending discard (count or zone). */
  | "INVALID_DISCARD"
  /** The chosen creature / ritual is not legal for the pending choose decision. */
  | "INVALID_CHOICE"
  /** Pass / respond when it is not this seat's reaction priority. */
  | "NOT_PRIORITY_PLAYER"
  /** Negate (or similar) against a link kind that cannot be negated. */
  | "INVALID_CHAIN_TARGET"
  | "RESOLUTION_LIMIT_EXCEEDED";
