import type { RngState } from "../rng/rng.js";
import type { CardInstance } from "./cards.js";
import type { GameRulesConfig } from "./config.js";
import type { CreatureState } from "./creatures.js";
import type { DieState } from "./dice.js";
import type { EffectDefinition } from "./effects.js";
import type { LoggedEvent } from "./events.js";
import type {
  CardInstanceId,
  CreatureId,
  DieId,
  EffectInstanceId,
  FaceCardId,
  MatchId,
  PlayerId,
} from "./ids.js";
import type { SymbolInstance } from "./symbols.js";

/**
 * Bible §16's turn flow. Two of its steps are not phases here:
 *
 * "Generate Symbols" involves no player decision, so it resolves inside
 * ROLL_DICE and appears in the log as its own events. "End Turn" is the
 * END_TURN action rather than a phase, because a phase offering exactly one
 * legal move is noise rather than a decision point.
 *
 * The `actions` phase covers both playing cards and forging faces (one shared
 * window). "Generate Symbols" is not a phase: it resolves inside ROLL_DICE.
 * "End Turn" is an action rather than a phase.
 */
export type TurnPhase = "roll" | "absorption" | "engine" | "combat" | "actions";

export const TURN_PHASE_ORDER: readonly TurnPhase[] = [
  "roll",
  "absorption",
  "engine",
  "combat",
  "actions",
];

export type MatchStatus = "in-progress" | "finished";

/**
 * Bible §5 and §18: one shared marker, not a per-player pool. `value` is the
 * Energy available to `holderId`; the turn ends when a spend pushes it below
 * zero, and the overshoot becomes the other player's starting Energy.
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
      readonly filter: "tactic";
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
  readonly resolutionStack: readonly PendingEffect[];
  /**
   * Set while an effect needs a player choice (deck search today). Resolution
   * resumes after the matching resolve action clears it.
   */
  readonly pendingDecision: PendingDecision | null;
  /**
   * Extra damage on the next attack this turn (Crush and similar). Keyed by
   * player id; cleared at end of turn.
   */
  readonly attackBonusThisTurn: Readonly<Record<string, number>>;
  readonly winner: PlayerId | null;
  readonly log: readonly LoggedEvent[];

  /** Carried in state so a match replays identically from its action log. */
  readonly rng: RngState;
  /** Carried in state so a replay is not affected by later balance changes. */
  readonly config: GameRulesConfig;
  /** Deterministic source of instance ids; the engine never calls nanoid. */
  readonly nextInstanceSeq: number;
}
