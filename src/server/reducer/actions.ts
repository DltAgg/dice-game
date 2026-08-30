import type {
  AttackId,
  CardInstanceId,
  CreatureId,
  DieId,
  FaceCardId,
  PlayerId,
  SymbolInstanceId,
} from "../model/ids.js";
import type { Attribute } from "../model/attributes.js";
import type { SymbolRequirement, SymbolType } from "../model/symbols.js";

/**
 * Actions describe intent, never outcome (SPDD §34). There is no DEAL_DAMAGE
 * action carrying an amount, because the amount is the host's to derive.
 *
 * Every action names its actor so the host can check the sender against the
 * claim rather than trusting the connection it arrived on.
 */
export type GameAction =
  | { readonly type: "ROLL_DICE"; readonly playerId: PlayerId }
  /**
   * Bank an unabsorbed attribute into the player's pile, or grant Shield onto
   * a living owned creature (`creatureId` required for Shield only). Spec `016`.
   */
  | {
      readonly type: "ABSORB_SYMBOL";
      readonly playerId: PlayerId;
      readonly symbolId: SymbolInstanceId;
      /** Required when absorbing Shield; omitted for attribute pile banking. */
      readonly creatureId?: CreatureId;
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
    }
  /** The card's effect region — Instant resolve, Equipment attach, Overload attach, or Ritual place. */
  | {
      readonly type: "PLAY_CARD";
      readonly playerId: PlayerId;
      readonly cardInstanceId: CardInstanceId;
      readonly declaredTargetCreatureId?: CreatureId;
      /** Required when playing an Overload onto a face card. */
      readonly declaredFaceCardId?: FaceCardId;
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
   * Completes a pending equipment choice (`destroy-equipment` with 2+ pieces).
   */
  | {
      readonly type: "RESOLVE_CHOOSE_EQUIPMENT";
      readonly playerId: PlayerId;
      readonly cardInstanceId: CardInstanceId;
    }
  /**
   * Completes a pending token-strip choice (Siphon Sigil / Hexbrand mix).
   * `discarded` must total the pending `amount` and be a subset of the
   * creature's current tokens.
   */
  | {
      readonly type: "RESOLVE_CHOOSE_ATTRIBUTE_TOKENS";
      readonly playerId: PlayerId;
      readonly discarded: SymbolRequirement;
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
  /**
   * Completes a pending replace-synthetic-face (Reforge): uninstall the named
   * slot's matching face to the pool and install a different pool face there.
   * Not a forge — no forge-draw.
   */
  | {
      readonly type: "RESOLVE_REPLACE_SYNTHETIC_FACE";
      readonly playerId: PlayerId;
      readonly dieId: DieId;
      readonly slotIndex: number;
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
        readonly into: Attribute;
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
      /**
       * Required for `strip-one-each` when a chosen face has 2+ overloads:
       * one attached instance per chosen face. Omit only when every chosen
       * face has exactly one overload.
       */
      readonly overloadInstanceIds?: readonly CardInstanceId[];
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
   * Completes a pending die-slot choice (Corruption markers, suppress, lock,
   * Catalyst copy). `dieId`/`slotIndex` null declines an optional choice.
   * Spec `013`.
   */
  | {
      readonly type: "RESOLVE_CHOOSE_DIE_SLOT";
      readonly playerId: PlayerId;
      readonly dieId: DieId | null;
      readonly slotIndex: number | null;
    }
  /**
   * Completes a pending pool-symbol choice (Catalyst roll wildcard). Spec `013`.
   */
  | {
      readonly type: "RESOLVE_CHOOSE_POOL_SYMBOL";
      readonly playerId: PlayerId;
      readonly symbolId: SymbolInstanceId;
    }
  /**
   * Completes Overcharge optional symbol + suppress. Spec `013`.
   */
  | {
      readonly type: "RESOLVE_OPTIONAL_OVERCHARGE";
      readonly playerId: PlayerId;
      readonly accept: boolean;
    }
  /**
   * Completes Instinct optional bonus basic during the actions window. Spec `013`.
   */
  | {
      readonly type: "RESOLVE_OPTIONAL_BONUS_ATTACK";
      readonly playerId: PlayerId;
      readonly accept: boolean;
      readonly attackId?: AttackId;
      readonly targetId?: CreatureId;
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
