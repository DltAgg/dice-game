import type {
  AbilityId,
  AttackId,
  CardInstanceId,
  CreatureId,
  DieId,
  FaceCardId,
  PlayerId,
  SymbolInstanceId,
} from "../model/ids.js";

/**
 * Actions describe intent, never outcome (SPDD §34). There is no DEAL_DAMAGE
 * action carrying an amount, because the amount is the host's to derive.
 *
 * Every action names its actor so the host can check the sender against the
 * claim rather than trusting the connection it arrived on.
 */
export type GameAction =
  | { readonly type: "ROLL_DICE"; readonly playerId: PlayerId }
  | {
      readonly type: "ABSORB_SYMBOL";
      readonly playerId: PlayerId;
      readonly creatureId: CreatureId;
      readonly symbolId: SymbolInstanceId;
    }
  | {
      readonly type: "RESOLVE_ENGINE_ABILITY";
      readonly playerId: PlayerId;
      readonly creatureId: CreatureId;
      readonly abilityId: AbilityId;
    }
  | {
      readonly type: "ATTACK";
      readonly playerId: PlayerId;
      readonly attackerId: CreatureId;
      readonly attackId: AttackId;
      readonly targetId: CreatureId;
    }
  /**
   * The card's forge region. The player names which slots to give up and which
   * face card from their face pool (or an already-installed copy) represents
   * the new face — bible §12–13.
   */
  | {
      readonly type: "FORGE_CARD";
      readonly playerId: PlayerId;
      readonly cardInstanceId: CardInstanceId;
      readonly dieId: DieId;
      readonly slotIndexes: readonly number[];
      /** Face card chosen from the owner's pool or an already-installed copy. */
      readonly faceCardId: FaceCardId;
      /**
       * Required spend for `variableEnergy` cards (at least `energyCost`).
       * Ignored for fixed-cost cards.
       */
      readonly energyPaid?: number;
    }
  /** The card's effect region — Instant resolve, Equipment attach, Overload attach, or Ritual place. */
  | {
      readonly type: "PLAY_CARD";
      readonly playerId: PlayerId;
      readonly cardInstanceId: CardInstanceId;
      readonly declaredTargetCreatureId?: CreatureId;
      /** Required when playing an Overload onto a face card. */
      readonly declaredFaceCardId?: FaceCardId;
      /**
       * Required spend for `variableEnergy` cards (at least `energyCost`).
       * Ignored for fixed-cost cards.
       */
      readonly energyPaid?: number;
    }
  /** Activates a ready Ritual on the engine field. */
  | {
      readonly type: "ACTIVATE_RITUAL";
      readonly playerId: PlayerId;
      readonly cardInstanceId: CardInstanceId;
      readonly declaredTargetCreatureId?: CreatureId;
    }
  /**
   * Bible §21: keep a die's showing face for one subsequent roll, or release
   * early so it rolls again this turn.
   */
  | {
      readonly type: "RETAIN_DIE";
      readonly playerId: PlayerId;
      readonly dieId: DieId;
      /** `true` to retain, `false` to release. */
      readonly retain: boolean;
    }
  /**
   * Completes a pending deck search: chosen cards move to hand, then the deck
   * is shuffled.
   */
  | {
      readonly type: "RESOLVE_SEARCH";
      readonly playerId: PlayerId;
      readonly cardInstanceIds: readonly CardInstanceId[];
    }
  /**
   * Completes a pending discard: the named hand cards go to the graveyard.
   */
  | {
      readonly type: "RESOLVE_DISCARD";
      readonly playerId: PlayerId;
      readonly cardInstanceIds: readonly CardInstanceId[];
    }
  /**
   * Completes a pending creature choice (overload heal and similar).
   */
  | {
      readonly type: "RESOLVE_CHOOSE_CREATURE";
      readonly playerId: PlayerId;
      readonly creatureId: CreatureId;
    }
  /**
   * Pass reaction priority. Legal only during `reaction-priority` for the
   * priority seat. Two consecutive passes drain the chain (spec `008`).
   */
  | { readonly type: "PASS_PRIORITY"; readonly playerId: PlayerId }
  | { readonly type: "ADVANCE_PHASE"; readonly playerId: PlayerId }
  | { readonly type: "END_TURN"; readonly playerId: PlayerId };

export type GameActionType = GameAction["type"];
