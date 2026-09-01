import type { CardDuration, CardInstance } from "./cards.js";
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
  SymbolInstanceId,
} from "./ids.js";
import type { AttributeTokens, SymbolInstance, SymbolType } from "./symbols.js";
import type { PendingDecision } from "./pendingDecision.js";
import type { RngState } from "../rng/rng.js";

export type { PendingDecision };

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
 * Turn phases are `roll` and `actions` only — banking happens during actions.
 * `ROLL_DICE` enters `actions`. Attribute pile banking, Shield absorb onto a
 * creature, `[Requires]` gates, `[Spend]` burns, attacks, plays, forges, and
 * ready-ritual activates all share that window. Unabsorbed pool symbols stay
 * absorbable until used or the turn ends. Rituals cannot activate during roll.
 */
export type TurnPhase = "roll" | "actions";

export const TURN_PHASE_ORDER: readonly TurnPhase[] = ["roll", "actions"];

export type MatchStatus = "in-progress" | "finished";
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
  /** Set after choose-ritual / equipment / overload for `declared-*` targets. */
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
  /**
   * Tactic Overcharge pips keyed by face card (spec `021`). One entry per
   * spent hand card, in spend order. Shared across copies on this player's
   * dice. Cleared when the last owned copy leaves.
   */
  readonly overchargeByFace: Readonly<Record<string, readonly Attribute[]>>;
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
   * Next PLAY_CARD this turn costs this much less (On roll `[Discount]`, not
   * forge). Consumed on the next header spend; cleared at end of turn.
   */
  readonly playCostDiscountThisTurn: Readonly<Record<string, number>>;
  /**
   * One-shot Resonance / Catalyst wildcards. Consumed when they cover shortfall
   * on a `[Requires]` / Active-when gate or a `[Spend]` burn this turn.
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
  /**
   * Banked symbol ids from the active roll whose on-absorb triggers are
   * waiting for on-roll effects (and choices) to finish first.
   */
  readonly rollBankQueue: readonly SymbolInstanceId[];
  readonly winner: PlayerId | null;
  readonly log: readonly LoggedEvent[];

  /** Carried in state so a match replays identically from its action log. */
  readonly rng: RngState;
  /** Carried in state so a replay is not affected by later balance changes. */
  readonly config: GameRulesConfig;
  /** Deterministic source of instance ids; the engine never calls nanoid. */
  readonly nextInstanceSeq: number;
}
