import type { CardDuration, CardInstance, CardType } from "./cards.js";
import type { GameRulesConfig } from "./config.js";
import type { CreatureState } from "./creatures.js";
import type { DieState, FaceKind } from "./dice.js";
import type { Attribute } from "./attributes.js";
import type { EffectDefinition } from "./effects.js";
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
} from "./ids.js";
import type { SymbolInstance } from "./symbols.js";
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
 * The `actions` phase is one shared window for attacking, playing cards,
 * forging, and activating ready rituals (in any order). There is no separate
 * combat phase. Leftover rolled symbols become `available` when absorption
 * ends (entering actions). Ready rituals may also activate during absorption;
 * they cannot during roll.
 */
export type TurnPhase = "roll" | "absorption" | "actions";

export const TURN_PHASE_ORDER: readonly TurnPhase[] = [
  "roll",
  "absorption",
  "actions",
];

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
}

/**
 * A player decision that pauses resolution. While set, only the matching
 * resolve action from the controller may advance the match.
 */
export type PendingDecision =
  | {
      readonly type: "search-deck";
      readonly controllerId: PlayerId;
      /** How many cards must be chosen (already capped to eligible count). */
      readonly amount: number;
      readonly filter: readonly CardType[];
    }
  | {
      readonly type: "search-graveyard";
      readonly controllerId: PlayerId;
      /** Maximum cards that may be returned (already capped to GY size). */
      readonly amount: number;
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
    }
  | {
      readonly type: "choose-creature";
      readonly controllerId: PlayerId;
      readonly filter: "ally" | "enemy";
      /**
       * Effect waiting for a target. `effect.target` is rewritten to
       * `declared-target` so applying it after the choice does not re-open
       * this decision.
       */
      readonly deferred: PendingEffect;
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
      readonly kind: FaceKind;
      readonly attribute: Attribute;
      readonly target: "own-die" | "opponent-die";
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
  readonly winner: PlayerId | null;
  readonly log: readonly LoggedEvent[];

  /** Carried in state so a match replays identically from its action log. */
  readonly rng: RngState;
  /** Carried in state so a replay is not affected by later balance changes. */
  readonly config: GameRulesConfig;
  /** Deterministic source of instance ids; the engine never calls nanoid. */
  readonly nextInstanceSeq: number;
}
