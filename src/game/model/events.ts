import type { GameError } from "./errors.js";
import type {
  AttackId,
  CardId,
  CardInstanceId,
  CreatureId,
  DieId,
  EffectInstanceId,
  FaceCardId,
  PlayerId,
  SymbolInstanceId,
} from "./ids.js";
import type { Attribute } from "./attributes.js";
import type { CardType } from "./cards.js";
import type { FaceKind } from "./dice.js";
import type { SymbolRequirement, SymbolType } from "./symbols.js";
import type { ChainLinkKind, TurnPhase } from "./state.js";

/**
 * The event log is the seam reactions and triggered abilities will hang off
 * (SPDD §25). Building it now costs nothing and means the card layer will not
 * need the reducer rewritten to notice that something happened.
 *
 * Rejected actions never appear here: an illegal action leaves state untouched
 * (SPDD §35), so it cannot append to the log either. The error is returned.
 */
export type GameEvent =
  | { readonly type: "match-started"; readonly firstPlayerId: PlayerId }
  | { readonly type: "turn-started"; readonly turn: number; readonly playerId: PlayerId }
  | { readonly type: "phase-entered"; readonly phase: TurnPhase }
  | {
      readonly type: "die-rolled";
      readonly dieId: DieId;
      readonly slotIndex: number;
      readonly symbol: SymbolType;
    }
  | {
      readonly type: "die-skipped";
      readonly dieId: DieId;
      readonly reason: "stunned" | "retained";
    }
  | {
      readonly type: "die-retained";
      readonly dieId: DieId;
      readonly playerId: PlayerId;
    }
  | {
      readonly type: "die-released";
      readonly dieId: DieId;
      readonly playerId: PlayerId;
    }
  | {
      readonly type: "symbol-generated";
      readonly symbolId: SymbolInstanceId;
      readonly symbol: SymbolType;
      readonly ownerId: PlayerId;
      readonly source: "roll" | "effect";
    }
  | {
      readonly type: "symbol-absorbed";
      readonly symbolId: SymbolInstanceId;
      readonly creatureId: CreatureId;
    }
  | {
      readonly type: "symbols-consumed";
      readonly symbolIds: readonly SymbolInstanceId[];
      readonly reason: "ritual-progress";
    }
  | { readonly type: "symbols-expired"; readonly symbolIds: readonly SymbolInstanceId[] }
  | {
      readonly type: "effect-resolved";
      readonly effectId: EffectInstanceId;
      readonly effectType: string;
    }
  | {
      readonly type: "attack-declared";
      readonly attackerId: CreatureId;
      readonly attackId: AttackId;
      readonly targetId: CreatureId;
    }
  | {
      readonly type: "damage-dealt";
      readonly creatureId: CreatureId;
      readonly amount: number;
    }
  | { readonly type: "creature-healed"; readonly creatureId: CreatureId; readonly amount: number }
  | { readonly type: "creature-defeated"; readonly creatureId: CreatureId }
  | {
      readonly type: "attribute-token-gained";
      readonly creatureId: CreatureId;
      readonly attribute: Attribute;
      readonly amount: number;
    }
  | {
      readonly type: "attribute-tokens-discarded";
      readonly creatureId: CreatureId;
      readonly discarded: SymbolRequirement;
    }
  | { readonly type: "shield-gained"; readonly creatureId: CreatureId; readonly amount: number }
  | {
      readonly type: "shield-removed";
      readonly creatureId: CreatureId;
      readonly amount: number;
      readonly shieldsRemaining: number;
    }
  | {
      readonly type: "damage-prevented";
      readonly creatureId: CreatureId;
      readonly amount: number;
      readonly shieldsRemaining: number;
      /** What absorbed the damage. Spec `009` distinguishes buffer vs shield. */
      readonly source: "buffer" | "shield" | "effect";
    }
  | {
      readonly type: "card-drawn";
      readonly playerId: PlayerId;
      readonly cardInstanceId: CardInstanceId;
    }
  /** Logged instead of a draw when the deck is empty; §37 makes this harmless. */
  | { readonly type: "deck-empty"; readonly playerId: PlayerId }
  | {
      readonly type: "card-discarded";
      readonly playerId: PlayerId;
      readonly cardInstanceId: CardInstanceId;
    }
  | {
      readonly type: "card-played";
      readonly playerId: PlayerId;
      readonly cardInstanceId: CardInstanceId;
      readonly cardId: CardId;
    }
  | {
      readonly type: "equipment-attached";
      readonly cardInstanceId: CardInstanceId;
      readonly creatureId: CreatureId;
    }
  | {
      readonly type: "equipment-destroyed";
      readonly cardInstanceId: CardInstanceId;
      readonly creatureId: CreatureId;
    }
  | {
      readonly type: "overload-attached";
      readonly cardInstanceId: CardInstanceId;
      readonly faceCardId: FaceCardId;
      readonly playerId: PlayerId;
    }
  | {
      readonly type: "overload-detached";
      readonly cardInstanceId: CardInstanceId;
      readonly faceCardId: FaceCardId;
      readonly playerId: PlayerId;
    }
  | {
      readonly type: "ritual-placed";
      readonly cardInstanceId: CardInstanceId;
      readonly playerId: PlayerId;
    }
  | {
      readonly type: "ritual-orientation-changed";
      readonly cardInstanceId: CardInstanceId;
      readonly orientation: "preparing" | "ready" | "exhausted";
    }
  | {
      readonly type: "ritual-activated";
      readonly cardInstanceId: CardInstanceId;
      readonly playerId: PlayerId;
    }
  | {
      readonly type: "toxin-applied";
      readonly creatureId: CreatureId;
      readonly amount: number;
      readonly total: number;
    }
  | {
      readonly type: "toxin-tick";
      readonly creatureId: CreatureId;
      readonly amount: number;
    }
  | {
      readonly type: "search-started";
      readonly playerId: PlayerId;
      readonly amount: number;
      readonly filter: readonly CardType[] | "graveyard";
    }
  | {
      readonly type: "search-resolved";
      readonly playerId: PlayerId;
      readonly cardInstanceIds: readonly CardInstanceId[];
    }
  | {
      readonly type: "discard-started";
      readonly playerId: PlayerId;
      readonly amount: number;
    }
  | {
      readonly type: "discard-resolved";
      readonly playerId: PlayerId;
      readonly cardInstanceIds: readonly CardInstanceId[];
    }
  | {
      readonly type: "choose-creature-started";
      readonly playerId: PlayerId;
      readonly filter: "ally" | "enemy";
    }
  | {
      readonly type: "choose-creature-resolved";
      readonly playerId: PlayerId;
      readonly creatureId: CreatureId;
    }
  | {
      readonly type: "face-forged";
      readonly playerId: PlayerId;
      /** Null when the install came from a `forge-faces` effect, not FORGE_CARD. */
      readonly cardInstanceId: CardInstanceId | null;
      readonly dieId: DieId;
      readonly slotIndex: number;
      readonly faceCardId: FaceCardId;
    }
  | {
      readonly type: "forge-faces-started";
      readonly playerId: PlayerId;
      readonly faces: number;
      readonly kind: FaceKind;
      readonly attribute: Attribute;
      readonly target: "own-die" | "opponent-die";
    }
  | {
      readonly type: "forge-faces-resolved";
      readonly playerId: PlayerId;
      readonly dieId: DieId;
      readonly slotIndexes: readonly number[];
      readonly faceCardId: FaceCardId;
    }
  | {
      readonly type: "energy-spent";
      readonly playerId: PlayerId;
      readonly amount: number;
      readonly remaining: number;
    }
  | {
      readonly type: "energy-gained";
      readonly playerId: PlayerId;
      readonly amount: number;
      readonly remaining: number;
    }
  | {
      readonly type: "energy-passed";
      readonly toPlayerId: PlayerId;
      readonly amount: number;
      readonly cause: "overshoot" | "voluntary-pass";
    }
  | { readonly type: "turn-ended"; readonly playerId: PlayerId }
  | { readonly type: "match-finished"; readonly winnerId: PlayerId }
  | { readonly type: "resolution-aborted"; readonly error: GameError }
  | {
      readonly type: "chain-link-added";
      readonly linkId: EffectInstanceId;
      readonly kind: ChainLinkKind;
      readonly controllerId: PlayerId;
    }
  | {
      readonly type: "reaction-priority-opened";
      readonly priorityPlayerId: PlayerId;
    }
  | {
      readonly type: "priority-passed";
      readonly playerId: PlayerId;
      readonly nextPriorityPlayerId: PlayerId | null;
    }
  | {
      readonly type: "chain-link-negated";
      readonly linkId: EffectInstanceId;
    }
  | {
      readonly type: "chain-link-resolved";
      readonly linkId: EffectInstanceId;
      readonly kind: ChainLinkKind;
      readonly negated: boolean;
    };

export interface LoggedEvent {
  readonly seq: number;
  readonly turn: number;
  readonly event: GameEvent;
}
