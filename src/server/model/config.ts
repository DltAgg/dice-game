/**
 * Every balance-sensitive or unresolved number lives here (SPDD §18) so that a
 * later design decision is a config edit rather than an engine change. Each
 * field records where its value comes from:
 *
 *   DEFINED — stated outright in the game bible.
 *   DECIDED — settled in the design discussion of 2026-08-07.
 *   ASSUMED — a prototype assumption; see docs/OPEN_DESIGN.md.
 */

import { FACE_SLOTS_PER_DIE } from "./dice.js";

export interface GameRulesConfig {
  /** DEFINED, bible §4. */
  readonly creaturesPerPlayer: number;
  /** DEFINED, bible §5 and §9. One die per Fighter in the tag preset. */
  readonly dicePerPlayer: number;
  /**
   * Spec `030` playtest. Faces on each Fighter die. Not a final size.
   * Current layouts are this long.
   */
  readonly facesPerDie: number;
  /** DEFINED, bible §9.1. */
  readonly maxFacesOfSameAttributePerDie: number;
  /**
   * DECIDED (playtest 2026-09-06). Minimum untyped Shield faces per opening
   * die. Default 0 — Shield is optional on constructed layouts.
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
  /**
   * Spec `030` playtest. Exact tactics-deck size. Null means a number has
   * not been chosen, and `deckMinCards` / `deckMaxCards` still apply.
   * A number requires that count and skips the range.
   */
  readonly deckSize: number | null;
  /** DEFINED, bible §12. Face cards selected during deckbuilding. */
  readonly faceDeckMaxCards: number;
  /** DEFINED, bible §12. At most this many face cards share one attribute. */
  readonly faceDeckMaxPerAttribute: number;
  /**
   * Spec `030` playtest. Cards dealt to each player at setup. Not a
   * final balance number.
   */
  readonly openingHandSize: number;
  /**
   * Spec `030` playtest. Drawn at the start of every turn, including the
   * first. Not a final balance number.
   */
  readonly cardsDrawnPerTurn: number;
  /**
   * Spec `030` playtest. Null means no hand limit. A number is stored for
   * a later limit. The current rules do not discard excess cards.
   */
  readonly maxHandSize: number | null;
  /**
   * Spec `030` playtest. A draw from an empty deck loses the match when
   * true. When false, the draw stops and play continues.
   */
  readonly deckOutEnabled: boolean;
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
   * DECIDED (009). When unused `[Prevent]` charges (`attackPreventCount`)
   * expire. `"end-of-turn"` clears them on `END_TURN`; `"none"` leaves them
   * until consumed (tests / opt-out).
   */
  readonly preventExpiry: "none" | "end-of-turn";
  /**
   * DECIDED (playtest 2026-08-29). Extra attribute pips generated when a
   * `forgeYield` slot is showing after `ROLL_DICE` (per yield face). Shield /
   * untyped faces grant nothing.
   */
  readonly forgeYieldGenerate: number;
  /**
   * Unused. Was immediate pile bank per own-die synthetic forge. Kept so
   * existing `GameRulesConfig` snapshots stay shape-compatible.
   */
  readonly forgeBankPerFace: number;
  /**
   * DECIDED (playtest 2026-08-29). Soft global cap on Toxin markers per
   * creature. Excess from `[Mark]` is discarded after Adaptive Toxin’s
   * receive cap (if any).
   */
  readonly maxToxinMarkers: number;
  /**
   * ASSUMED (spec `028`). Meter resource cap. Spend on Tag-cancel, Assist,
   * and cards with `meterCost`. Not a Mark token.
   */
  readonly meterCap: number;
  /**
   * ASSUMED (spec `028`). Meter granted to the dealer per HP actually lost
   * on an attack Strike (`fromAttack`).
   */
  readonly meterPerDamageDealt: number;
  /**
   * ASSUMED (spec `028`). TAG spend when the Active die is not showing `tag`.
   */
  readonly tagCancelMeterCost: number;
  /**
   * ASSUMED (spec `028`). ASSIST spend when that Reserve die is not showing
   * `assist`.
   */
  readonly assistMeterCost: number;
  /**
   * ASSUMED (spec `028`). Clear `comboCount` on `END_TURN`.
   */
  readonly comboResetsOnEndTurn: boolean;
  /**
   * ASSUMED (spec `028`). When true, all three fighters `defeated` loses.
   */
  readonly wipeVictory: boolean;
  /**
   * ASSUMED (spec `029`). When true, a die used as primary or secondary for
   * `USE_FACE` / `USE_TECHNIQUE` cannot be used again this turn
   * (`spentOncePerTurnKeys` `face-action:<dieId>`).
   */
  readonly consumeDiceOnFaceActions: boolean;
}

export const DEFAULT_RULES_CONFIG: GameRulesConfig = {
  creaturesPerPlayer: 3,
  dicePerPlayer: 2,
  facesPerDie: FACE_SLOTS_PER_DIE,
  maxFacesOfSameAttributePerDie: 4,
  startingMinShieldsPerDie: 0,
  startingMaxSyntheticsPerPlayer: 2,
  startingMaxSyntheticsPerDie: 2,
  startingMaxOnRollFacesPerDie: 2,
  deckMinCards: 40,
  deckMaxCards: 50,
  deckMaxCopiesPerCard: 3,
  deckSize: null,
  faceDeckMaxCards: 12,
  faceDeckMaxPerAttribute: 3,
  openingHandSize: 5,
  cardsDrawnPerTurn: 1,
  maxHandSize: null,
  deckOutEnabled: true,
  maxStunnedDicePerPlayer: 1,
  attacksPerCreaturePerCombat: 1,
  frontlineSlots: 2,
  maxResolutionSteps: 64,
  preventExpiry: "end-of-turn",
  forgeYieldGenerate: 1,
  forgeBankPerFace: 1,
  maxToxinMarkers: 3,
  meterCap: 8,
  meterPerDamageDealt: 1,
  tagCancelMeterCost: 2,
  assistMeterCost: 1,
  comboResetsOnEndTurn: true,
  wipeVictory: false,
  consumeDiceOnFaceActions: true,
};

/**
 * Live 3v3 tag-fighter prototype (spec `028`). Engine tests keep
 * `DEFAULT_RULES_CONFIG` (2 dice, 40–50 constructed) so existing fixtures
 * stay legal. Lobby / tag loadouts pass this preset.
 */
export const TAG_FIGHTER_RULES: GameRulesConfig = {
  ...DEFAULT_RULES_CONFIG,
  dicePerPlayer: 3,
  frontlineSlots: 1,
  deckMinCards: 10,
  deckMaxCards: 24,
  openingHandSize: 5,
  cardsDrawnPerTurn: 1,
  consumeDiceOnFaceActions: false,
  attacksPerCreaturePerCombat: 2,
  wipeVictory: true,
};

/** Three bound dice → tag-fighter prototype knobs; otherwise skirmish defaults. */
export function rulesConfigForLoadout(startingDiceCount: number): GameRulesConfig {
  return startingDiceCount === TAG_FIGHTER_RULES.dicePerPlayer
    ? TAG_FIGHTER_RULES
    : DEFAULT_RULES_CONFIG;
}
