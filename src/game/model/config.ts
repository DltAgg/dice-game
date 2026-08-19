/**
 * Every balance-sensitive or unresolved number lives here (SPDD §18) so that a
 * later design decision is a config edit rather than an engine change. Each
 * field records where its value comes from:
 *
 *   DEFINED — stated outright in the game bible.
 *   DECIDED — settled in the design discussion of 2026-08-07.
 *   ASSUMED — a prototype assumption; see docs/OPEN_DESIGN.md.
 */

export interface EnergyRulesConfig {
  /**
   * DECIDED. The shared track runs from `trackMax` on one player's side,
   * through zero, to `trackMax` on the other's (bible §18, Digimon-style).
   */
  readonly trackMax: number;
  /** DECIDED. Energy held by the player taking the first turn (not the clean-pass amount). */
  readonly startingEnergy: number;
  /**
   * DECIDED. What the incoming player receives when the outgoing player ends
   * their turn voluntarily (clean `END_TURN`, no overshoot this turn). A
   * fixed amount, not a floor — overshoot passes use
   * `energyOnOvershootBonus` instead of this value.
   */
  readonly energyOnVoluntaryPass: number;
  /**
   * DECIDED. Added to the overshoot when a turn actually ends because the
   * marker crossed zero. Incoming Energy is `overshoot + this`, capped at
   * `trackMax`. Applied at turn-pass, not at the moment of spend, so a
   * reaction can still restore the marker before the bonus lands.
   */
  readonly energyOnOvershootBonus: number;
}

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
  /** ASSUMED. Named synthetics on a single opening die. */
  readonly startingMaxSyntheticsPerDie: number;
  /**
   * ASSUMED. Opening slots whose face definition has a non-empty `onRoll`.
   */
  readonly startingMaxOnRollFacesPerDie: number;
  /**
   * DECIDED (M4). Tactics deck minimum size.
   */
  readonly deckMinCards: number;
  /**
   * DECIDED (M4). Tactics deck maximum size.
   */
  readonly deckMaxCards: number;
  /**
   * DECIDED (M4). At most this many copies of the same tactics card id.
   */
  readonly deckMaxCopiesPerCard: number;
  /** DEFINED, bible §12. Face cards selected during deckbuilding. */
  readonly faceDeckMaxCards: number;
  /** DEFINED, bible §12. At most this many face cards share one attribute. */
  readonly faceDeckMaxPerAttribute: number;
  /** DECIDED. Cards dealt to each player before the first turn. */
  readonly openingHandSize: number;
  /** DECIDED. Drawn at the start of each of your own turns. */
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
  readonly energy: EnergyRulesConfig;
}

export const DEFAULT_RULES_CONFIG: GameRulesConfig = {
  creaturesPerPlayer: 3,
  dicePerPlayer: 2,
  maxFacesOfSameAttributePerDie: 4,
  startingMinShieldsPerDie: 1,
  startingMaxSyntheticsPerPlayer: 2,
  startingMaxSyntheticsPerDie: 1,
  startingMaxOnRollFacesPerDie: 1,
  deckMinCards: 50,
  deckMaxCards: 60,
  deckMaxCopiesPerCard: 4,
  faceDeckMaxCards: 12,
  faceDeckMaxPerAttribute: 3,
  openingHandSize: 5,
  cardsDrawnPerTurn: 1,
  maxStunnedDicePerPlayer: 1,
  attacksPerCreaturePerCombat: 1,
  frontlineSlots: 2,
  maxResolutionSteps: 64,
  preventExpiry: "none",
  energy: {
    trackMax: 10,
    startingEnergy: 3,
    energyOnVoluntaryPass: 5,
    energyOnOvershootBonus: 2,
  },
};
