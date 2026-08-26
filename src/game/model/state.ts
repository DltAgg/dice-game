import type { CardDuration, CardInstance, CardType } from "./cards.js";
import type { GameRulesConfig } from "./config.js";
import type { CreatureState } from "./creatures.js";
import type { DieState, FaceKind, ForgeableFaceKind } from "./dice.js";
import type { Attribute } from "./attributes.js";
import type {
  CreatureChoiceFilter,
  DieChoiceFilter,
  DieSlotChoiceFilter,
  EffectDefinition,
} from "./effects.js";
import type { LoggedEvent } from "./events.js";
import type {
  AttackId,
  CardInstanceId,
  CreatureId,
  DieId,
  EffectInstanceId,
  FaceCardId,
  MatchId,
  PlayerId,
  SymbolInstanceId,
} from "./ids.js";
import type { AttributeTokens, SymbolInstance, SymbolType } from "./symbols.js";
import type { RngState } from "../rng/rng.js";

/** Chain link kinds for the reaction stack (`008-reaction-chain`). */
export type ChainLinkKind =
  | "tactic-effect"
  | "ritual-place"
  | "ritual-activate"
  | "equip-attach"
  | "overload-attach"
  | "attack";

/**
 * A waiting chain link. Bodies run only after both seats pass priority
 * (LILO). See `docs/specs/008-reaction-chain.md`.
 */
export interface ChainLink {
  readonly id: EffectInstanceId;
  readonly kind: ChainLinkKind;
  readonly controllerId: PlayerId;
  negated: boolean;
  readonly cardInstanceId: CardInstanceId | null;
  /** Effects for tactic-effect / ritual-activate links. */
  readonly effects: readonly EffectDefinition[];
  readonly sourceCreatureId: CreatureId | null;
  readonly declaredTargetCreatureId: CreatureId | null;
  readonly equipTargetCreatureId: CreatureId | null;
  readonly overloadFaceCardId: FaceCardId | null;
  readonly attackerId: CreatureId | null;
  readonly attackId: AttackId | null;
  readonly attackTargetId: CreatureId | null;
  readonly attackEffect: EffectDefinition | null;
  /** Queued after `attackEffect` when the attack link conducts. */
  readonly attackFollowUpEffects: readonly EffectDefinition[];
  /** Used when finishing a ritual-activate link (exhaust vs GY). */
  readonly ritualDuration: CardDuration | null;
}

/**
 * Bible §16's turn flow. Two of its steps are not phases here:
 *
 * "Generate Symbols" involves no player decision, so it resolves inside
 * ROLL_DICE and appears in the log as its own events. "End Turn" is the
 * END_TURN action rather than a phase, because a phase offering exactly one
 * legal move is noise rather than a decision point.
 *
 * Playtest DECIDED (2026-08-17): there is no dedicated absorption phase.
 * `ROLL_DICE` enters `actions`. Attribute pile banking, Shield absorb onto a
 * creature, `[Requires]` spends, attacks, plays, forges, and ready-ritual
 * activates all share that window. Unabsorbed pool symbols stay spendable and
 * absorbable until used or the turn ends. Rituals cannot activate during roll.
 */
export type TurnPhase = "roll" | "actions";

export const TURN_PHASE_ORDER: readonly TurnPhase[] = ["roll", "actions"];

export type MatchStatus = "in-progress" | "finished";

/**
 * Bible §5 and §18: one shared marker, not a per-player pool. `value` is the
 * Energy available to `holderId`; the turn ends when a spend pushes it below
 * zero, and the overshoot (plus `energyOnOvershootBonus` when the turn
 * actually passes) becomes the other player's starting Energy.
 */
export interface EnergyTrack {
  readonly holderId: PlayerId;
  readonly value: number;
}

/**
 * SPDD §17 asks for an explicit resolution structure so that an effect which
 * spawns another effect does not recurse uncontrollably. Effects are pushed
 * here and drained in order before the player is offered another choice.
 */
export interface PendingEffect {
  readonly id: EffectInstanceId;
  readonly controllerId: PlayerId;
  readonly effect: EffectDefinition;
  readonly sourceCreatureId: CreatureId | null;
  readonly declaredTargetCreatureId: CreatureId | null;
  /** Set after `RESOLVE_CHOOSE_RITUAL` for `declared-ritual` targets. */
  readonly declaredTargetCardInstanceId: CardInstanceId | null;
  readonly sourceDieId: DieId | null;
  readonly sourceSlotIndex: number | null;
  /**
   * Card instance that originated this effect (tactic, ritual, overload, gear).
   * Null for face on-roll / on-absorb, attacks, and creature passives.
   */
  readonly sourceCardInstanceId: CardInstanceId | null;
  /** Attack damage only: skip this many Shield (spec `012`). */
  readonly ignoreShield: number;
  /**
   * True when this effect is the conducting attack’s Strike (or Blade Rain
   * split of that Strike). Attack-prevent consumes only then. Spec `009`.
   */
  readonly fromAttack: boolean;
}

/**
 * A player decision that pauses resolution. While a non-reaction pending is
 * set, only the matching resolve action from `controllerId` may advance —
 * even if that player is not `activePlayerId`. Everyone else, including the
 * turn player, is refused with `PENDING_DECISION`. Reaction windows use
 * `priorityPlayerId` / `NOT_PRIORITY_PLAYER` instead (`008`).
 */
export type PendingDecision =
  | {
      readonly type: "search-deck";
      readonly controllerId: PlayerId;
      /** How many cards must be chosen (already capped to eligible count). */
      readonly amount: number;
      readonly filter: readonly CardType[];
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "search-graveyard";
      readonly controllerId: PlayerId;
      /** Maximum cards that may be returned (already capped to GY size). */
      readonly amount: number;
      readonly maxEnergyCost?: number;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "discard-cards";
      readonly controllerId: PlayerId;
      /** How many hand cards must be chosen (capped to current hand size). */
      readonly amount: number;
      /**
       * Energy spend from the card that opened this decision. Applied after the
       * discard resolves so an overshoot does not end the turn mid-choice.
       */
      readonly turnEnds: boolean;
      readonly optional?: boolean;
      readonly thenEffects?: readonly EffectDefinition[];
      readonly sourceCreatureId?: CreatureId | null;
      readonly declaredTargetCreatureId?: CreatureId | null;
      readonly sourceDieId?: DieId | null;
      readonly sourceSlotIndex?: number | null;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "choose-creature";
      readonly controllerId: PlayerId;
      readonly filter: CreatureChoiceFilter;
      readonly optional?: boolean;
      /**
       * Effect waiting for a target. `effect.target` / `effect.with` is rewritten
       * to `declared-target` so applying it after the choice does not re-open
       * this decision.
       */
      readonly deferred: PendingEffect;
    }
  | {
      readonly type: "choose-ritual";
      readonly controllerId: PlayerId;
      /** Only opposing field rituals are legal today (`011`). */
      readonly filter: "opponent";
      /**
       * Effect waiting for a ritual. `effect.target` is rewritten to
       * `declared-ritual` so applying it after the choice does not re-open
       * this decision.
       */
      readonly deferred: PendingEffect;
    }
  | {
      readonly type: "choose-equipment";
      readonly controllerId: PlayerId;
      /** Creature whose attached equipment is being chosen. */
      readonly creatureId: CreatureId;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "choose-attribute-tokens";
      readonly controllerId: PlayerId;
      readonly creatureId: CreatureId;
      /** How many token pips must be named (already less than the creature's total). */
      readonly amount: number;
      /**
       * `drain` (default, Siphon) takes the pips into the controller’s pile.
       * `transfer` / `copy` move or duplicate them onto `destinationCreatureId`
       * (spec `015`, parked).
       */
      readonly mode?: "drain" | "transfer" | "copy";
      readonly destinationCreatureId?: CreatureId;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "reaction-priority";
      readonly priorityPlayerId: PlayerId;
      /** Consecutive Passes; chain drains when this reaches 2. */
      readonly consecutivePasses: number;
    }
  | {
      readonly type: "forge-faces";
      readonly controllerId: PlayerId;
      readonly faces: number;
      readonly kind: ForgeableFaceKind;
      readonly attribute: Attribute;
      readonly target: "own-die" | "opponent-die";
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "replace-synthetic-face";
      readonly controllerId: PlayerId;
      readonly kind: ForgeableFaceKind;
      readonly attribute: Attribute;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "choose-die";
      readonly controllerId: PlayerId;
      readonly filter: DieChoiceFilter;
      readonly optional?: boolean;
      readonly deferred: PendingEffect;
    }
  | {
      readonly type: "convert-symbols";
      readonly controllerId: PlayerId;
      readonly amount: number;
      readonly eligibleSymbolIds: readonly SymbolInstanceId[];
    }
  | {
      readonly type: "copy-pool-symbol";
      readonly controllerId: PlayerId;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "replay-graveyard-tactic";
      readonly controllerId: PlayerId;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "look-top-deck";
      readonly controllerId: PlayerId;
      readonly cardInstanceIds: readonly CardInstanceId[];
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "peek-deck";
      readonly controllerId: PlayerId;
      readonly cardInstanceId: CardInstanceId;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "dark-pact";
      readonly controllerId: PlayerId;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "mind-control";
      readonly controllerId: PlayerId;
      readonly sourceCardInstanceId: CardInstanceId | null;
      readonly sourceFaceCardId: FaceCardId | null;
    }
  | {
      readonly type: "split-damage";
      readonly controllerId: PlayerId;
      readonly amount: number;
      readonly maxTargets: number;
      /** When set, targets must be legal attack targets for this attacker. */
      readonly attackerId: CreatureId | null;
      readonly range: boolean;
      readonly sourceCreatureId: CreatureId | null;
      readonly ignoreShield?: number;
      /** Blade Rain of an attack Strike; Extermination leaves this unset. */
      readonly fromAttack?: boolean;
      readonly thenEffects?: readonly EffectDefinition[];
    }
  | {
      readonly type: "optional-reroll";
      readonly controllerId: PlayerId;
      readonly dieId: DieId;
      readonly faceCardId: FaceCardId;
      /** Adrenaline: deal this much to up to 2 allies if the reroll shows the same face. */
      readonly sameFaceAllyDamage?: number;
    }
  | {
      readonly type: "choose-die-slot";
      readonly controllerId: PlayerId;
      readonly filter: DieSlotChoiceFilter;
      readonly optional?: boolean;
      /** For `same-die-other-slot`: die already chosen. */
      readonly contextDieId?: DieId;
      /** For `same-die-other-slot`: slot that must not be chosen again. */
      readonly excludedSlotIndex?: number;
      readonly deferred: PendingEffect;
    }
  | {
      readonly type: "choose-pool-symbol";
      readonly controllerId: PlayerId;
      /** Eligible symbol instance ids (synthetic-in-pool). */
      readonly eligibleSymbolIds: readonly SymbolInstanceId[];
      readonly deferred: PendingEffect;
    }
  | {
      readonly type: "optional-overcharge";
      readonly controllerId: PlayerId;
      readonly amount: number;
      readonly dieId: DieId;
      readonly slotIndex: number;
    }
  | {
      readonly type: "optional-bonus-attack";
      readonly controllerId: PlayerId;
      readonly creatureId: CreatureId;
    };

export interface PlayerState {
  readonly id: PlayerId;
  readonly creatureIds: readonly CreatureId[];
  readonly dieIds: readonly DieId[];
  /**
   * Face cards available to be forged onto a die — the in-match face pool of
   * bible §12. Built from the player's face deck at setup. A card is either
   * here or backing at least one installed physical face, never both.
   */
  readonly facePool: readonly FaceCardId[];
  /**
   * The tactics deck zones. `deck` is ordered top-first, so drawing takes from
   * the front. Shuffling happens once at setup off the seeded RNG.
   */
  readonly deck: readonly CardInstanceId[];
  readonly hand: readonly CardInstanceId[];
  /** The layouts call this the *cemitério*; it is the discard pile. */
  readonly graveyard: readonly CardInstanceId[];
  /** Equipment this player owns that is currently attached to a creature. */
  readonly equipment: readonly CardInstanceId[];
  /** Overload cards this player owns that are currently attached to a face. */
  readonly overload: readonly CardInstanceId[];
  /** Ritual cards this player owns that are waiting / ready on the engine field. */
  readonly ritual: readonly CardInstanceId[];
  /**
   * Persistent attribute pile (spec `016`). Absorbed attribute pips bank here
   * immediately; attacks and ritual Active-when / Spend read this pool.
   */
  readonly attributePool: AttributeTokens;
  /**
   * Player-scoped once-per-turn keys (Adrenaline reroll, etc.). Cleared on END_TURN.
   */
  readonly spentOncePerTurnKeys: readonly string[];
}

export interface GameState {
  readonly matchId: MatchId;
  readonly status: MatchStatus;
  readonly turn: number;
  readonly phase: TurnPhase;
  readonly activePlayerId: PlayerId;
  readonly playerOrder: readonly [PlayerId, PlayerId];

  readonly players: Readonly<Record<string, PlayerState>>;
  readonly creatures: Readonly<Record<string, CreatureState>>;
  readonly dice: Readonly<Record<string, DieState>>;
  readonly symbols: Readonly<Record<string, SymbolInstance>>;
  readonly cards: Readonly<Record<string, CardInstance>>;

  readonly energy: EnergyTrack;
  /**
   * Immediate effect drain while a chain link is conducting (search/discard
   * pauses live here). Separate from `chainStack`.
   */
  readonly resolutionStack: readonly PendingEffect[];
  /** Waiting reaction-chain links (LILO). Spec `008`. */
  readonly chainStack: readonly ChainLink[];
  /**
   * Set while an effect needs a player choice, or while a reaction window is
   * open. Resolution resumes after the matching resolve / Pass action.
   */
  readonly pendingDecision: PendingDecision | null;
  /**
   * Energy overshoot that must wait until the chain (and nested choices)
   * finishes. Spec `008`.
   */
  readonly deferredTurnEndPlayerId: PlayerId | null;
  /**
   * Extra damage on the next attack this turn (Crush and similar). Keyed by
   * player id; cleared at end of turn.
   */
  readonly attackBonusThisTurn: Readonly<Record<string, number>>;
  /**
   * Toxic Blessing and similar: this player's attacks apply this many Toxin
   * markers to the attack target. Cleared at end of turn.
   */
  readonly attackToxinThisTurn: Readonly<Record<string, number>>;
  /**
   * Glimmer and similar: next time this player prevents damage, draw this many
   * cards, then clear. Spec `009`.
   */
  readonly preventDrawArmed: Readonly<Record<string, number>>;
  /** Controller's attacks this turn ignore this many Shield (Rust). */
  readonly ignoreShieldThisTurn: Readonly<Record<string, number>>;
  /** Next FORGE_CARD this turn costs this much less (Gear absorb). */
  readonly forgeDiscountThisTurn: Readonly<Record<string, number>>;
  /**
   * One-shot requirement wildcards (Resonance / Catalyst). Consumed when a
   * `[Requires]` check or ritual absorb uses one.
   */
  readonly requirementWildcardsThisTurn: Readonly<
    Record<string, readonly { readonly fromSymbol?: SymbolType }[]>
  >;
  /** Blade Rain: next attack this turn splits its damage. */
  readonly bladeRainArmed: Readonly<Record<string, boolean>>;
  /**
   * Faces that showed during the active player's last `ROLL_DICE` this turn
   * (Catalyst absorb). Cleared on `END_TURN` / next roll. Spec `013`.
   */
  readonly facesAppearedThisRoll: readonly {
    readonly dieId: DieId;
    readonly slotIndex: number;
    readonly faceCardId: FaceCardId;
    readonly kind: FaceKind;
  }[];
  /**
   * Overcharge absorb: next face-sourced effect (`sourceDieId` set) resolves
   * twice. Spec `013`.
   */
  readonly resolveNextFaceEffectTwice: Readonly<Record<string, boolean>>;
  readonly winner: PlayerId | null;
  readonly log: readonly LoggedEvent[];

  /** Carried in state so a match replays identically from its action log. */
  readonly rng: RngState;
  /** Carried in state so a replay is not affected by later balance changes. */
  readonly config: GameRulesConfig;
  /** Deterministic source of instance ids; the engine never calls nanoid. */
  readonly nextInstanceSeq: number;
}
