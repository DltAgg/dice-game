import type { Attribute } from "./attributes.js";
import type { CardType } from "./cards.js";
import type { BattlefieldPosition } from "./creatures.js";
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
 * Most of the card catalogue needs vocabulary that is not here yet. The backlog
 * lives in docs/DEFERRED_CATALOGUE.md — grow this union only when a concrete
 * card needs a new member.
 *
 * There is no store-symbol effect: nothing survives the turn but a retained
 * die, so banking a symbol is not a thing an effect can do.
 */
export type EffectDefinition =
  | { readonly type: "damage"; readonly amount: number; readonly target: TargetSelector }
  | { readonly type: "heal"; readonly amount: number; readonly target: TargetSelector }
  | { readonly type: "grant-shield"; readonly amount: number; readonly target: TargetSelector }
  | { readonly type: "generate-symbol"; readonly symbol: SymbolType; readonly amount: number }
  | { readonly type: "draw-cards"; readonly amount: number }
  | { readonly type: "discard-cards"; readonly amount: number }
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
   * to hand (Eternal Darkness).
   */
  | { readonly type: "search-graveyard"; readonly amount: number }
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
   * Swap the source creature with `with` via `setCreaturePosition` (twice).
   * Ally-only: opposing targets whiff. Same-position swaps are no-ops.
   * Enemy push is banned — never author `with: choose-enemy`.
   */
  | {
      readonly type: "swap-positions";
      readonly with: TargetSelector;
    }
  /**
   * Toggle an ally between frontline and back. If moving to frontline would
   * exceed `frontlineSlots`, the controller chooses a living frontline ally to
   * swap with. Ally-only.
   */
  | {
      readonly type: "reposition-creature";
      readonly target: TargetSelector;
    }
  /** Run `then` only when `when` holds (War Minotaur back-row swap). */
  | {
      readonly type: "conditional";
      readonly when: EffectCondition;
      readonly then: readonly EffectDefinition[];
    };

/** Conditions for `conditional` effects. Grow only when a proving card needs it. */
export type EffectCondition = {
  readonly type: "source-position";
  readonly position: BattlefieldPosition;
};

/**
 * Targets are resolved against the resolution context rather than chosen at
 * definition time. Selectors that need a player decision (a free choice of
 * enemy creature, say) arrive with the card layer, together with the pending
 * choice structure they require.
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
  /** Pause for the controller to name one living allied frontline creature. */
  | { readonly kind: "choose-allied-frontline" }
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
  | { readonly kind: "chain-attack-target" };
