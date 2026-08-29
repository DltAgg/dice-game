/**
 * Every balance-sensitive or unresolved number lives here (SPDD §18) so that a
 * later design decision is a config edit rather than an engine change. Each
 * field records where its value comes from:
 *
 *   DEFINED — stated outright in the game bible.
 *   DECIDED — settled in the design discussion of 2026-08-07.
 *   ASSUMED — a prototype assumption; see docs/OPEN_DESIGN.md.
 */


export interface GameRulesConfig {
  /** DEFINED, bible §4. */
  readonly creaturesPerPlayer: number;
  /** DEFINED, bible §5 and §9. */
  readonly dicePerPlayer: number;
  /** DEFINED, bible §9.1. */
  readonly maxFacesOfSameAttributePerDie: number;
  /**
   * ASSUMED (constructed opening dice). Minimum untyped Shield faces per
   * opening die. See OPEN_DESIGN.
   */
  readonly startingMinShieldsPerDie: number;
  /**
   * ASSUMED. Named synthetics across both opening dice.
   */
  readonly startingMaxSyntheticsPerPlayer: number;
  /**
   * ASSUMED. Named synthetics on a single opening die (default 2). Player
   * cap still blocks a third synthetic across both dice.
   */
  readonly startingMaxSyntheticsPerDie: number;
  /**
   * ASSUMED. Opening slots whose face definition has a non-empty `onRoll`
   * (default 2).
   */
  readonly startingMaxOnRollFacesPerDie: number;
  /**
   * DECIDED (playtest 2026-08-26: Yu-Gi-Oh-sized constructed). Tactics deck
   * minimum size. Was M4 50.
   */
  readonly deckMinCards: number;
  /**
   * DECIDED (playtest 2026-08-26: Yu-Gi-Oh-sized constructed). Tactics deck
   * maximum size. Was M4 60.
   */
  readonly deckMaxCards: number;
  /**
   * DECIDED (playtest 2026-08-26: Yu-Gi-Oh-sized constructed). At most this
   * many copies of the same tactics card id. Was M4 4.
   */
  readonly deckMaxCopiesPerCard: number;
  /** DEFINED, bible §12. Face cards selected during deckbuilding. */
  readonly faceDeckMaxCards: number;
  /** DEFINED, bible §12. At most this many face cards share one attribute. */
  readonly faceDeckMaxPerAttribute: number;
  /** DECIDED. Cards dealt to each player before the first turn. */
  readonly openingHandSize: number;
  /**
   * DECIDED (playtest 2026-08-20: 2). Drawn at the start of each of your
   * own turns.
   */
  readonly cardsDrawnPerTurn: number;
  /** DEFINED, bible §22. */
  readonly maxStunnedDicePerPlayer: number;
  /** DEFINED, bible §7. */
  readonly attacksPerCreaturePerCombat: number;
  /**
   * ASSUMED. The battlefield diagram in bible §6 shows two forward slots plus
   * a back row, which fits three creatures as 2 + 1. Tracked as OPEN.
   */
  readonly frontlineSlots: number;
  /**
   * Safety bound on a single resolution cascade. An effect chain that exceeds
   * it aborts deterministically rather than hanging the host.
   */
  readonly maxResolutionSteps: number;
  /**
   * DECIDED (009). When unused damage-prevent buffers expire. `"none"` means
   * they persist until consumed; other policies can be added later without a
   * reducer rewrite.
   */
  readonly preventExpiry: "none";
  /**
   * DECIDED (playtest 2026-08-29). Extra attribute pips generated when a
   * `forgeYield` slot is showing after `ROLL_DICE` (per yield face). Shield /
   * untyped faces grant nothing.
   */
  readonly forgeYieldGenerate: number;
  /**
   * DECIDED (playtest 2026-08-29). Immediate pile bank per face installed by
   * own-die **synthetic** `FORGE_CARD` only. Natural forge and opponent-die
   * forge do not bank.
   */
  readonly forgeBankPerFace: number;
  /**
   * DECIDED (playtest 2026-08-29). Soft global cap on Toxin markers per
   * creature. Excess from `[Mark]` is discarded after Adaptive Toxin’s
   * receive cap (if any).
   */
  readonly maxToxinMarkers: number;
}

export const DEFAULT_RULES_CONFIG: GameRulesConfig = {
  creaturesPerPlayer: 3,
  dicePerPlayer: 2,
  maxFacesOfSameAttributePerDie: 4,
  startingMinShieldsPerDie: 1,
  startingMaxSyntheticsPerPlayer: 2,
  startingMaxSyntheticsPerDie: 2,
  startingMaxOnRollFacesPerDie: 2,
  deckMinCards: 40,
  deckMaxCards: 50,
  deckMaxCopiesPerCard: 3,
  faceDeckMaxCards: 12,
  faceDeckMaxPerAttribute: 3,
  openingHandSize: 5,
  cardsDrawnPerTurn: 2,
  maxStunnedDicePerPlayer: 1,
  attacksPerCreaturePerCombat: 1,
  frontlineSlots: 2,
  maxResolutionSteps: 64,
  preventExpiry: "none",
  forgeYieldGenerate: 1,
  forgeBankPerFace: 1,
  maxToxinMarkers: 3,
};
