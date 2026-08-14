import type { Attribute, DualKindAttribute } from "./attributes.js";
import type { CardType } from "./cards.js";
import type { FaceKind } from "./dice.js";
import type { SymbolType } from "./symbols.js";

/**
 * Effects are data, never functions (SPDD §26). GameState has to survive JSON,
 * travel over PeerJS and be replayed from a log, none of which works if a card
 * carries executable code.
 *
 * This union only contains effects the rules engine actually interprets today.
 * Stun is deliberately absent — the mechanic is parked, see docs/OPEN_DESIGN.md.
 *
 * Grow this union only when a concrete card needs a new member, with resolver
 * + tests + proving wire in the same change.
 *
 * There is no store-symbol effect: nothing survives the turn but a retained
 * die, so banking a symbol is not a thing an effect can do.
 * There is no push effect (intentionally not modelled — see DEFERRED_CATALOGUE).
 */
export type EffectDefinition =
  | { readonly type: "damage"; readonly amount: number; readonly target: TargetSelector }
  | { readonly type: "heal"; readonly amount: number; readonly target: TargetSelector }
  | { readonly type: "grant-shield"; readonly amount: number; readonly target: TargetSelector }
  | { readonly type: "generate-symbol"; readonly symbol: SymbolType; readonly amount: number }
  | {
      readonly type: "draw-cards";
      readonly amount: number;
      /** Default `controller`. */
      readonly player?: "controller" | "opponent";
    }
  | {
      readonly type: "discard-cards";
      readonly amount: number;
      /** When true, the controller may discard fewer (including 0). */
      readonly optional?: boolean;
      /** Queued after a successful discard of at least one card. */
      readonly then?: readonly EffectDefinition[];
    }
  /**
   * Look through the controller's deck, choose up to `amount` cards whose main
   * `CardType` is in `filter`, add them to hand, then shuffle the remaining deck.
   */
  | {
      readonly type: "search-deck";
      readonly amount: number;
      readonly filter: readonly CardType[];
    }
  /**
   * Choose up to `amount` cards in the controller's graveyard and return them
   * to hand (Eternal Darkness). Optional `maxEnergyCost` (Shadow Echo).
   */
  | {
      readonly type: "search-graveyard";
      readonly amount: number;
      readonly maxEnergyCost?: number;
    }
  /**
   * Moves the shared marker in the controller's favour. Bible §18: this is the
   * one effect that buys a longer turn rather than spending one.
   */
  | { readonly type: "gain-energy"; readonly amount: number }
  /** Sends one equipment on the target creature to its owner's graveyard. */
  | { readonly type: "destroy-equipment"; readonly target: TargetSelector }
  /** Places Toxin counters on a creature. Each counter deals 1 damage per owner turn. */
  | { readonly type: "apply-toxin"; readonly amount: number; readonly target: TargetSelector }
  /** Removes Shield counters from a creature (Rending Claw). */
  | { readonly type: "remove-shield"; readonly amount: number; readonly target: TargetSelector }
  /**
   * The controller's next attack this turn deals this much extra damage
   * (Crush). Cleared at end of turn whether spent or not.
   */
  | { readonly type: "next-attack-bonus"; readonly amount: number }
  /**
   * Add to a creature's `nextAttackBonus` (Varcolac). Cleared when that creature
   * next attacks or at end of turn.
   */
  | {
      readonly type: "grant-next-attack-bonus";
      readonly amount: number;
      readonly target: TargetSelector;
    }
  /**
   * Controller's attacks this turn apply this many Toxin markers to the attack
   * target (Toxic Blessing). Cleared at end of turn.
   */
  | { readonly type: "arm-attack-toxin"; readonly amount: number }
  /**
   * Negate the top chain link when it is a card-sourced link (not an attack;
   * forge never opens the chain) and the source card's main type is allowed.
   * `cardTypes: "any"` = any card link. Spec `008` — Runic Nullification
   * (`["instant"]`), Arcane Silence / Fade (`"any"`).
   */
  | {
      readonly type: "negate-card";
      readonly cardTypes: readonly CardType[] | "any";
    }
  /**
   * Negate the top chain link only when it is `ritual-place` or
   * `ritual-activate`. Other tops whiff. Spec `008` — Seal the Rite.
   */
  | { readonly type: "negate-ritual" }
  /**
   * Strip up to `amount` attribute tokens from the target in `ATTRIBUTES`
   * order (martial → … → darkness). Whiffs legally if none remain. Spec `011`.
   */
  | {
      readonly type: "discard-attribute-tokens";
      readonly amount: number;
      readonly target: TargetSelector;
    }
  /**
   * Send one opposing field ritual to its owner's graveyard. Spec `011`.
   */
  | { readonly type: "destroy-ritual"; readonly target: TargetSelector }
  /**
   * Add to a creature’s prevent-next-N damage buffer (before Shields). Spec `009`.
   */
  | {
      readonly type: "grant-damage-prevent";
      readonly amount: number;
      readonly target: TargetSelector;
    }
  /**
   * Cancel damage on the waiting attack chain link and deal that amount to the
   * attacker (Luminar Judgement). Spec `009`.
   */
  | { readonly type: "prevent-attack-reflect" }
  /**
   * Arm “when you next prevent damage, draw N” (Glimmer). Spec `009`.
   */
  | { readonly type: "arm-prevent-draw"; readonly amount: number }
  /**
   * Controller forges `faces` copies of one matching face card onto a single
   * die (Great Contamination, Ritual of Contamination). Same install rules as
   * the PLAY forge region, without spending a tactic from hand.
   */
  | {
      readonly type: "forge-faces";
      readonly faces: number;
      readonly kind: FaceKind;
      readonly attribute: Attribute;
      readonly target: "own-die" | "opponent-die";
    }
  /**
   * Toggle the target between frontline and back. If moving to frontline would
   * exceed `frontlineSlots`, the controller chooses a living frontline ally to
   * swap with (via `setCreaturePosition`). Spec `012`.
   */
  | {
      readonly type: "reposition-creature";
      readonly target: TargetSelector;
      readonly optional?: boolean;
    }
  /**
   * Swap the source creature with `with` through `setCreaturePosition` twice.
   * Same-position swaps are no-ops. Spec `012`.
   */
  | {
      readonly type: "swap-positions";
      readonly with: TargetSelector;
      readonly optional?: boolean;
    }
  /** Run `then` only when `when` holds. */
  | {
      readonly type: "conditional";
      readonly when: EffectCondition;
      readonly then: readonly EffectDefinition[];
    }
  /**
   * Opponent loses Energy on the shared track without the controller gaining a
   * spend. No-op when the opponent does not hold the marker or holds 0.
   */
  | { readonly type: "lose-energy"; readonly amount: number; readonly player: "opponent" }
  /**
   * Move the marker `amount` toward the controller (opponent-held Energy
   * decreases). No-op when the opponent holds 0 / does not hold the marker.
   */
  | { readonly type: "transfer-energy"; readonly amount: number }
  /** Pending: choose an owned retainable die and mark it retained. */
  | { readonly type: "retain-die" }
  /**
   * Pending: convert up to `amount` rolled/available symbols into Natural
   * attributes. `sourceOnly` limits the choice to the symbol generated by the
   * source die this roll.
   */
  | {
      readonly type: "convert-symbols";
      readonly amount: number;
      readonly sourceOnly?: boolean;
    }
  /** Controller's attacks this turn ignore this many Shield (Rust). */
  | { readonly type: "arm-ignore-shield"; readonly amount: number }
  /**
   * One-shot: a matching pool symbol may pay any `[Requires]` / ritual
   * Active-when attribute this turn (Resonance / Catalyst).
   */
  | { readonly type: "arm-requirement-wildcard"; readonly fromSymbol?: SymbolType }
  /** Next `FORGE_CARD` this turn costs this much less Energy (min 0). */
  | { readonly type: "arm-forge-discount"; readonly amount: number }
  /**
   * Until EOT, up to `amount` damage that would hit another allied creature is
   * dealt to `target` instead (Aegis).
   */
  | { readonly type: "arm-redirect-damage"; readonly amount: number; readonly target: TargetSelector }
  /** Next incoming damage on `target` is increased by `amount` (Venom absorb). */
  | {
      readonly type: "arm-next-incoming-bonus";
      readonly amount: number;
      readonly target: TargetSelector;
    }
  /**
   * Next attack this turn: distribute that attack's damage among living enemies
   * in range of the attacker (Blade Rain).
   */
  | { readonly type: "arm-blade-rain" }
  /**
   * Pending: choose a GY tactic with an `effect` region; resolve those effects
   * immediately without paying Energy or `[Requires]`. The card stays in the GY.
   */
  | { readonly type: "replay-graveyard-tactic" }
  /**
   * Pending: choose another symbol type currently in the controller's
   * rolled/available pool and generate 1 of that type (Mirrored Rune).
   */
  | { readonly type: "copy-pool-symbol" }
  /** Look at the top `amount` of the deck; choose 1 to hand, rest to bottom. */
  | { readonly type: "look-top-deck"; readonly amount: number }
  /** Peek the top of the deck; optionally put it on the bottom. */
  | { readonly type: "peek-deck-optional-bottom" }
  /** Pending: send 2 different-attribute tactics from deck to GY, then shuffle. */
  | { readonly type: "dark-pact" }
  /**
   * Pending: strip all overloads from 1 opposing face, or 1 overload from each
   * of up to 2 opposing faces.
   */
  | { readonly type: "mind-control" }
  /**
   * Pending: consume every Synthetic Corruption face on one die; deal
   * `2 * consumed` split across up to 2 creatures. No forge-draw.
   */
  | { readonly type: "extermination" }
  /**
   * Pending: choose an owned showing die and re-fire its face `onRoll` plus
   * overload `onRoll` (no second inherent pip).
   */
  | { readonly type: "reapply-die-modifiers" }
  /**
   * Re-fire the controller's other die's showing face `onRoll` and that face's
   * overloads (Arcane Echo face).
   */
  | { readonly type: "copy-other-die-face" }
  /** Pending optional reroll of the source die (Adrenaline). */
  | { readonly type: "optional-reroll-die" }
  /** Add 1 pestilence counter on the source slot; at 5, reset and try adjacent forge. */
  | { readonly type: "add-pestilence-counter" };

export type EffectCondition =
  | { readonly type: "source-position"; readonly position: "frontline" | "back" }
  | { readonly type: "any-enemy-has-toxin" }
  | { readonly type: "any-ally-attacked-this-turn" }
  | {
      readonly type: "has-other-symbol";
      readonly symbol?: SymbolType;
      readonly faceKind?: FaceKind;
    }
  /** Another living ally is a `creatureIds` neighbor (±1). */
  | { readonly type: "has-adjacent-ally" }
  | { readonly type: "controller-has-frontline" }
  | { readonly type: "source-is-frontline" };

/**
 * Targets are resolved against the resolution context rather than chosen at
 * definition time. Selectors that need a player decision arrive as `choose-*`
 * and open a `choose-creature` pending.
 */
export type TargetSelector =
  /** The creature whose ability or attack produced the effect. */
  | { readonly kind: "source-creature" }
  /** The creature named by the action that started this resolution. */
  | { readonly kind: "declared-target" }
  /**
   * The controller's living creature with the most damage (ties: earliest id).
   * Used when an overload fires on roll and there is no declared target yet.
   */
  | { readonly kind: "most-damaged-ally" }
  /**
   * An opposing living creature with the most Shield (ties: earliest id).
   * Used by on-roll face effects that strip shields without a declared target.
   */
  | { readonly kind: "most-shielded-enemy" }
  /** Pause for the controller to name one of their living creatures. */
  | { readonly kind: "choose-ally" }
  /** Pause for the controller to name one opposing living creature. */
  | { readonly kind: "choose-enemy" }
  /**
   * Pause for the controller to name one opposing field ritual
   * (preparing / ready / exhausted). Spec `011`.
   */
  | { readonly kind: "choose-opponent-ritual" }
  /**
   * Ritual named by a completed `choose-ritual` decision (after rewrite).
   * Spec `011`.
   */
  | { readonly kind: "declared-ritual" }
  /**
   * The creature targeted by the waiting attack chain link (Prismatic Barrier).
   * Spec `009`.
   */
  | { readonly kind: "chain-attack-target" }
  /** Every living allied frontline creature. */
  | { readonly kind: "allied-frontline" }
  /** Every living enemy frontline creature. */
  | { readonly kind: "enemy-frontline" }
  | { readonly kind: "choose-ally-other" }
  | { readonly kind: "choose-allied-frontline" }
  | { readonly kind: "choose-allied-frontline-other" }
  | { readonly kind: "choose-ally-with-toxin" }
  | { readonly kind: "choose-enemy-with-toxin" }
  | { readonly kind: "choose-ally-damage-over-half" };

/** Filters for a `choose-creature` pending (specs `011` / `012`). */
export type CreatureChoiceFilter =
  | "ally"
  | "enemy"
  | "self"
  | "ally-other"
  | "allied-frontline"
  | "allied-frontline-other"
  | "ally-with-toxin"
  | "enemy-with-toxin"
  | "ally-damage-over-half";

/** Filters for a `choose-die` pending (spec `012`). */
export type DieChoiceFilter = "owned-retainable" | "owned-rolled" | "any-synthetic-corruption";

export const NATURAL_CONVERT_SYMBOLS: readonly DualKindAttribute[] = [
  "martial",
  "wild",
  "arcane",
  "luminar",
];
