import type { Attribute } from "./attributes.js";
import type { CardType } from "./cards.js";
import type { FaceKind, ForgeableFaceKind } from "./dice.js";
import type { SymbolType } from "./symbols.js";
import type { BounceHost, SilenceHost, TargetSelector } from "./targeting.js";

export type {
  BounceHost,
  BounceHostChoice,
  CreatureChoiceFilter,
  DieChoiceFilter,
  DieSlotChoiceFilter,
  SilenceHost,
  SilenceHostChoice,
  TargetSelector,
} from "./targeting.js";
export { NATURAL_CONVERT_SYMBOLS } from "./targeting.js";

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
 * There is no push / enemy-move effect — ally swap/reposition only
 * (`OPEN_DESIGN.md`). Former push print was rewritten in the catalogue.
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
   * to hand (Eternal Darkness). Optional `maxPlayCost` (Shadow Echo).
   */
  | {
      readonly type: "search-graveyard";
      readonly amount: number;
      readonly maxPlayCost?: number;
    }
  /**
   * Send one equipment to its owner's graveyard. Creature `target` (011): 0
   * pieces whiff; 1 destroys; 2+ open `choose-equipment`. Card `target`
   * (`choose-opponent-equipment` / `declared-equipment`): field-wide pick.
   */
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
   * Transfer life: deal up to `amount` damage to `target` (normal prevent /
   * Shield → HP), then heal `with` for the **HP actually lost**. Spec `011`.
   * Runtime may rewrite `target` to `{ kind: "fixed", creatureId }` between
   * nested creature choices.
   */
  | {
      readonly type: "drain-life";
      readonly amount: number;
      /** Source creature that loses HP. */
      readonly target: TargetSelector;
      /** Destination creature that is healed. */
      readonly with: TargetSelector;
    }
  /**
   * Send one opposing field ritual to its owner's graveyard. Spec `011`.
   */
  | { readonly type: "destroy-ritual"; readonly target: TargetSelector }
  /**
   * `[Silence]` an opposing creature, field ritual, or die slot (per `hosts`)
   * until the start of the silencer's next turn. Spec `022`.
   */
  | {
      readonly type: "silence";
      readonly target: TargetSelector;
      readonly hosts: readonly SilenceHost[];
    }
  /**
   * Send one opposing attached overload to its owner's graveyard.
   * `choose-opponent-overload` / `declared-overload`. Spec `011`.
   */
  | { readonly type: "destroy-overload"; readonly target: TargetSelector }
  /**
   * Return one opposing field ritual, attached equipment, or attached overload
   * (per `hosts`) to its owner's hand. Spec `023`. Not destroy (GY) and not discard.
   */
  | {
      readonly type: "bounce";
      readonly target: TargetSelector;
      readonly hosts: readonly BounceHost[];
    }
  /**
   * Replace a synthetic attribute face slot on any die with that attribute's
   * natural identity face. Spec `024`. Not `[Reforge]`.
   */
  | { readonly type: "desynthesize"; readonly target: TargetSelector }
  /**
   * Add to a creature’s prevent-next-N-**attacks** counter (before Shields).
   * Spec `009`. Amount is how many incoming attack instances to cancel.
   */
  | {
      readonly type: "grant-attack-prevent";
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
      readonly kind: ForgeableFaceKind;
      readonly attribute: Attribute;
      readonly target: "own-die" | "opponent-die";
    }
  /**
   * `[Reforge N Attribute]` / `[Cross forge N Y / Z]`. Pending: choose N
   * replaceable slots on **one** owned die, then N **synthetic** `attribute`
   * faces from the pool. `fromAttribute` omitted = any showing face (Reforge);
   * set = Cross forge (those slots must show Y). Not a forge — no forge-draw.
   */
  | {
      readonly type: "replace-synthetic-face";
      readonly faces: number;
      readonly attribute: Attribute;
      readonly fromAttribute?: Attribute;
    }
  /**
   * Toggle an **ally** between frontline and back. If moving to frontline would
   * exceed `frontlineSlots`, the controller chooses a living frontline ally to
   * swap with (via `setCreaturePosition`). Enemy targets whiff. Spec `012`.
   */
  | {
      readonly type: "reposition-creature";
      readonly target: TargetSelector;
      readonly optional?: boolean;
    }
  /**
   * Swap the source creature with an **ally** `with` through
   * `setCreaturePosition` twice. Same-position swaps are no-ops. Opposing
   * targets whiff (push banned). Spec `012`.
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
   * Pending: controller chooses one of N modes. Each mode is an array of
   * effects that replace this node on the stack. `modeLabels` are short
   * player-facing strings (e.g. `"Mechanical → Luminar"`). If only one mode
   * is legal the engine auto-picks it; if none are legal, the effect whiffs.
   */
  | {
      readonly type: "choose-effect-mode";
      readonly modes: readonly (readonly EffectDefinition[])[];
      readonly modeLabels?: readonly string[];
    }
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
   * One-shot: may pay any `[Spend]` / `[Requires]` / `[Active when]` attribute
   * this turn (Resonance / Catalyst). Consumed when used.
   */
  | { readonly type: "arm-requirement-wildcard"; readonly fromSymbol?: SymbolType }
  /** Next `FORGE_CARD` this turn costs this much less from the pile (min 0). */
  | { readonly type: "arm-forge-discount"; readonly amount: number }
  /**
   * Next `PLAY_CARD` this turn (effect, ritual place, equip, overload — not
   * forge) costs this much less from the pile (min 0). Face / overload On roll.
   */
  | { readonly type: "play-cost-discount"; readonly amount: number }
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
   * immediately without paying pile cost or `[Requires]`. The card stays in the GY.
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
   * Pending: consume every synthetic Corruption face on one die; deal
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
  /**
   * Optional reroll of a rolled die. With `sourceDieId` (Adrenaline on-roll),
   * that die; otherwise opens `owned-rolled` (Rethrow). `oncePerTurn` spends a
   * player key. `sameFaceAllyDamage` is Adrenaline’s same-face self-hit.
   */
  | {
      readonly type: "optional-reroll-die";
      readonly oncePerTurn?: boolean;
      readonly sameFaceAllyDamage?: number;
    }
  /**
   * Add 1 pestilence counter on the source slot; at the showing face's
   * `pestilenceSpreadAt`, reset and try an adjacent forge of that face from
   * the slot's `faceCardOwnerId` pool / copies.
   */
  | { readonly type: "add-pestilence-counter" }
  /**
   * Until the target's owner's next turn, further `apply-toxin` applications
   * may grant at most `amount` markers total (Adaptive Toxin). Spec `013`.
   */
  | {
      readonly type: "arm-toxin-receive-cap";
      readonly amount: number;
      readonly target: TargetSelector;
    }
  /**
   * Remove up to `amount` Toxin markers from the target (or all remaining if
   * fewer) and deal that much damage. Spec `013`.
   */
  | {
      readonly type: "remove-toxin-deal-damage";
      readonly amount: number;
      readonly target: TargetSelector;
    }
  /**
   * Pending: put `amount` Corruption marker(s) on an opposing synthetic face
   * slot. Spec `013`.
   */
  | { readonly type: "add-corruption-marker"; readonly amount: number }
  /**
   * Pending: lock an opposing Corrupted face so its symbols cannot pay costs
   * this turn. Spec `013`.
   */
  | { readonly type: "lock-corrupted-face-resource" }
  /**
   * If the opponent has a Corrupted face, pending: put 1 Corruption marker on
   * another face of the same die (Infection). Spec `013`.
   */
  | { readonly type: "spread-corruption-marker" }
  /**
   * Pending: choose an opposing Natural face; suppress its inherent `onRoll`
   * until the next roll. Spec `013`.
   */
  | { readonly type: "suppress-opposing-natural-inherent" }
  /**
   * Pending: strip an opposing Corrupted face to Shield (face returns to its
   * owner's pool) and put an unusable Corruption symbol in the controller's
   * pool. Spec `013`.
   */
  | { readonly type: "strip-corrupted-face-unusable-symbol" }
  /**
   * Pending: choose a Synthetic symbol in the controller's pool; arm a
   * requirement wildcard from that symbol. Spec `013`.
   */
  | { readonly type: "arm-wildcard-from-synthetic-pool" }
  /**
   * Pending: re-queue `onRoll` of a Synthetic face that appeared this roll for
   * the controller. Spec `013`.
   */
  | { readonly type: "copy-appeared-synthetic-onroll" }
  /**
   * Pending optional: bank `amount` of `symbol` and mark the source slot
   * Overcharged (suppress inherent next roll). Spec `013`.
   */
  | {
      readonly type: "optional-overcharge";
      readonly symbol: SymbolType;
      readonly amount: number;
    }
  /**
   * The next face-sourced effect (`sourceDieId` set) the controller resolves
   * this turn is applied twice. Spec `013`.
   */
  | { readonly type: "arm-resolve-next-face-effect-twice" }
  /**
   * Pending optional: the absorbing creature may declare a basic attack now
   * during the actions window if it has not attacked this turn. Spec `013`.
   * Prefer `[Frenzy]` / `grant-extra-attack` for Wild exclusive multi-attack.
   */
  | { readonly type: "optional-bonus-basic-attack" }
  /**
   * Wild `[Frenzy]`: the target may declare `amount` additional attacks this
   * turn (raises `extraAttacksThisTurn`). Does not clear attacks already used.
   */
  | {
      readonly type: "grant-extra-attack";
      readonly amount: number;
      readonly target: TargetSelector;
    }
  /**
   * Put the top `amount` cards of `player`'s deck into that player's graveyard
   * (Darkness mill). Fewer remaining mills those; an empty deck is a legal
   * whiff. Not discard-from-hand and does not fire `on-discard`. Spec `015`.
   */
  | {
      readonly type: "mill-cards";
      readonly amount: number;
      readonly player: "controller" | "opponent";
    };

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
  | { readonly type: "source-is-frontline" }
  /** Controller’s other die shows a known face with the same attribute (spec `025`). */
  | { readonly type: "other-die-same-attribute" }
  /**
   * This die has at least `atLeast` slots whose face `symbol` equals this
   * showing face’s attribute (spec `025`).
   */
  | { readonly type: "this-die-attribute-count"; readonly atLeast: number }
  /** Both of the controller’s showing faces are `kind: "synthetic"` (spec `025`). */
  | { readonly type: "both-showing-synthetic" };
