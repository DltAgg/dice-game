import type {
  AttackId,
  CardInstanceId,
  CreatureId,
  DieId,
  FaceCardId,
  PlayerId,
  SymbolInstanceId,
} from "../model/ids.js";
import type { SymbolType } from "../model/symbols.js";

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
  /**
   * Assign a rolled attribute symbol to a field ritual toward its
   * `[Active when: …]` gate (same absorption window as creature absorb).
   */
  | {
      readonly type: "ABSORB_SYMBOL_TO_RITUAL";
      readonly playerId: PlayerId;
      readonly cardInstanceId: CardInstanceId;
      readonly symbolId: SymbolInstanceId;
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
      /** `null` declines an optional choice. */
      readonly creatureId: CreatureId | null;
    }
  /**
   * Completes a pending ritual choice (Dispel Circle / destroy-ritual).
   */
  | {
      readonly type: "RESOLVE_CHOOSE_RITUAL";
      readonly playerId: PlayerId;
      readonly cardInstanceId: CardInstanceId;
    }
  /**
   * Completes a pending forge-from-effect: install `faces` copies of one face
   * card onto the named die slots.
   */
  | {
      readonly type: "RESOLVE_FORGE_FACES";
      readonly playerId: PlayerId;
      readonly dieId: DieId;
      readonly slotIndexes: readonly number[];
      readonly faceCardId: FaceCardId;
    }
  | {
      readonly type: "RESOLVE_CHOOSE_DIE";
      readonly playerId: PlayerId;
      readonly dieId: DieId | null;
    }
  | {
      readonly type: "RESOLVE_CONVERT_SYMBOLS";
      readonly playerId: PlayerId;
      readonly replacements: readonly {
        readonly symbolId: SymbolInstanceId;
        readonly into: "martial" | "wild" | "arcane" | "luminar";
      }[];
    }
  | {
      readonly type: "RESOLVE_COPY_POOL_SYMBOL";
      readonly playerId: PlayerId;
      readonly symbol: SymbolType;
    }
  | {
      readonly type: "RESOLVE_REPLAY_GRAVEYARD";
      readonly playerId: PlayerId;
      readonly cardInstanceId: CardInstanceId;
    }
  | {
      readonly type: "RESOLVE_LOOK_TOP_DECK";
      readonly playerId: PlayerId;
      readonly keepId: CardInstanceId;
    }
  | {
      readonly type: "RESOLVE_PEEK_DECK";
      readonly playerId: PlayerId;
      readonly putOnBottom: boolean;
    }
  | {
      readonly type: "RESOLVE_DARK_PACT";
      readonly playerId: PlayerId;
      readonly cardInstanceIds: readonly [CardInstanceId, CardInstanceId];
    }
  | {
      readonly type: "RESOLVE_MIND_CONTROL";
      readonly playerId: PlayerId;
      readonly mode: "strip-one-face" | "strip-one-each";
      readonly faceCardIds: readonly FaceCardId[];
    }
  | {
      readonly type: "RESOLVE_SPLIT_DAMAGE";
      readonly playerId: PlayerId;
      readonly assignments: readonly { readonly creatureId: CreatureId; readonly amount: number }[];
    }
  | {
      readonly type: "RESOLVE_OPTIONAL_REROLL";
      readonly playerId: PlayerId;
      readonly accept: boolean;
    }
  /**
   * Activate a showing face's `activated` ability (Forbidden Heritage /
   * Pestilent Plague). Legal in the actions phase.
   */
  | {
      readonly type: "ACTIVATE_FACE";
      readonly playerId: PlayerId;
      readonly dieId: DieId;
      readonly slotIndex: number;
    }
  /**
   * Pass reaction priority. Legal only during `reaction-priority` for the
   * priority seat. Two consecutive passes drain the chain (spec `008`).
   */
  | { readonly type: "PASS_PRIORITY"; readonly playerId: PlayerId }
  | { readonly type: "ADVANCE_PHASE"; readonly playerId: PlayerId }
  | { readonly type: "END_TURN"; readonly playerId: PlayerId };

export type GameActionType = GameAction["type"];
