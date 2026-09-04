import type {
  CreatureId,
  DieId,
  FaceCardId,
  PlayerId,
} from "./ids.js";
import type { EffectDefinition } from "./effects.js";
import type { SymbolType } from "./symbols.js";

/**
 * Bible §9: the game is played with customizable d6. Six is structural rather
 * than a balance knob, so it lives here instead of in GameRulesConfig.
 */
export const FACE_SLOTS_PER_DIE = 6;

/** One opening (or physical) d6 of face-card ids. */
export type DieFaceLayout = readonly [
  FaceCardId,
  FaceCardId,
  FaceCardId,
  FaceCardId,
  FaceCardId,
  FaceCardId,
];

/** Two opening dice (`dicePerPlayer`). */
export type StartingDiceLayout = readonly [DieFaceLayout, DieFaceLayout];

/**
 * Natural and synthetic are bible §10. Untyped is Shield only: a starting-die
 * identity face that is not an attribute and is not Natural.
 */
export type FaceKind = "natural" | "synthetic" | "untyped";

/**
 * Attribute-keyed faces that can be forged. Shield is `untyped` and is never
 * a forge target.
 */
export type ForgeableFaceKind = Exclude<FaceKind, "untyped">;

/**
 * Whether forging (or other overwrite-installs) may replace a slot showing
 * this face. Omitted means the slot may be overwritten. Peel via
 * `ACTIVATE_FACE` / unforge / consume is never this restriction.
 */
export type FaceStayPolicy =
  | { readonly kind: "cannot-replace-by-forge" }
  | { readonly kind: "forge-lock"; readonly turns: number };

/**
 * Continuous stance while this face is showing on an owned die (spec `025`).
 * Not a StandingTrigger and not an EffectDefinition.
 */
export type WhileShowingModifier =
  | { readonly type: "pierce"; readonly amount: number }
  | { readonly type: "empower"; readonly amount: number }
  | { readonly type: "play-discount"; readonly amount: number }
  | { readonly type: "forge-discount"; readonly amount: number }
  | { readonly type: "reduce"; readonly amount: number };

/**
 * The reusable definition of a face (bible §11). Several physical die faces —
 * even on different dice — may point at the same face card (1:N). Overloads
 * attach to the face card, not to a physical slot.
 */
export interface FaceCardDefinition {
  readonly id: FaceCardId;
  readonly name: string;
  readonly kind: FaceKind;
  /** The attribute this face produces, or Shield for the untyped starting face. */
  readonly symbol: SymbolType;
  /**
   * English printing of the inherent-effect region. Empty on identity faces
   * (`+1 Attribute` is the footer, not rules text).
   */
  readonly rulesText: string;
  /**
   * Fired when this face is showing after a roll (bible §14). Print-only faces
   * leave this empty until every clause is modelled.
   */
  readonly onRoll: readonly EffectDefinition[];
  /**
   * Fired when a symbol produced by a die showing this face is absorbed.
   * Empty until On-absorb print lines are wired (`010-trigger-hooks`).
   */
  readonly onAbsorb: readonly EffectDefinition[];
  /**
   * How many pips of `symbol` this face produces when rolled. Default 1.
   * Spec `025` inherent extra pips — not a `[Generate]` opcode.
   */
  readonly pips?: number;
  /**
   * Extra pips of a (possibly other) symbol from this same die/roll (dual-pip).
   * Illegal on Shield / untyped.
   */
  readonly bonusPips?: { readonly symbol: SymbolType; readonly amount: number };
  /**
   * If true, this die’s pips from this roll do not bank; `onRoll` is the
   * `[Convert roll]` payoff. Spec `025`.
   */
  readonly convertRoll?: boolean;
  /**
   * Continuous modifiers while this face is showing on an owned die.
   * Empty / omitted = no stance.
   */
  readonly whileShowing?: readonly WhileShowingModifier[];
  /** Capacity for overloads attached to this face card (shared across all slots). */
  readonly maxOverloads: number;
  /**
   * When `"echo-cards"`, only tactics tagged `forgeTags: ["echo"]` may install
   * this face (Arcane Echo).
   */
  readonly forgeRestriction: "echo-cards" | null;
  /**
   * Player-activated face ability (Forbidden Heritage / Pestilent Plague).
   * Paid with `ACTIVATE_FACE` during the actions phase.
   */
  readonly activated?: {
    readonly kind: "remove-corruption-face";
    readonly spendBase: number;
    readonly spendPerCorruptionOnDie: number;
  };
  /**
   * Stay-on-slot while installed. Forbidden Heritage never yields to a forge
   * overwrite; Pestilent Plague uses a per-slot forge-lock of `turns` owner
   * turns. `forgeRestriction` (who may *install* this type) is a different axis.
   */
  readonly stayPolicy?: FaceStayPolicy;
  /**
   * Pestilent Plague: after this many counters on the physical slot, reset
   * them and try to forge another copy onto an adjacent slot. Catalogue owns
   * the threshold (currently 2).
   */
  readonly pestilenceSpreadAt?: number;
}

/**
 * One physical face of one die. Points at a face card; many slots may share
 * the same `faceCardId`. Overloads live on the face card (see CardInstance),
 * not here.
 *
 * `faceCardOwnerId` is deliberately separate from the die's owner: bible §12
 * has a face card return to *its* owner when the last installed copy is
 * removed, even if it sat on an opponent's die.
 */
export interface DieSlot {
  readonly index: number;
  readonly faceCardId: FaceCardId;
  readonly faceCardOwnerId: PlayerId;
  /** Pestilent Plague counters on this physical slot. */
  readonly pestilenceCounters?: number;
  /**
   * Remaining die-owner turns this slot cannot be replaced by forging
   * (`stayPolicy.kind === "forge-lock"`). Decremented on that owner's
   * `END_TURN` / turn finish; floor 0. OPEN_DESIGN ASSUMED.
   */
  readonly forgeLockRemaining?: number;
  /**
   * Corruption markers on this physical slot (Stain / Infection). A slot with
   * ≥1 is a Corrupted face. Spec `013`.
   */
  readonly corruptionMarkers?: number;
  /**
   * Skip this slot's face `onRoll` on the controller's next `ROLL_DICE`, then
   * clear (Decay suppress / spec `013` face-marker Overcharge). Not tactic
   * `[Overcharge]` (spec `021`).
   */
  readonly suppressInherentNextRoll?: boolean;
  /**
   * Showing / generated symbols from this slot cannot pay costs this turn
   * (Stain absorb). Cleared `END_TURN`. Spec `013`.
   */
  readonly resourceLockedThisTurn?: boolean;
  /**
   * Own-die forge scaler: when true and this slot is showing after
   * `ROLL_DICE`, generate `forgeYieldGenerate` extra attribute pips for the
   * die owner (skip Shield / untyped). Set only on own-die installs; cleared
   * by overwrite / peel unless re-set. OPEN_DESIGN DECIDED 2026-08-29.
   */
  readonly forgeYield?: boolean;
  /**
   * `[Silence]` expiry turn on this physical slot. Silenced while
   * `GameState.turn < this`. Spec `022`. Same face on another die is unaffected.
   */
  readonly silenceExpiresOnTurn?: number;
}

export interface DieState {
  readonly id: DieId;
  readonly ownerId: PlayerId;
  /** Always exactly FACE_SLOTS_PER_DIE entries, indexed 0..5. */
  readonly slots: readonly DieSlot[];
  /** Bible §22. A die with markers is not rolled and produces no symbols. */
  readonly stunMarkers: number;
  /** Bible §21: a retained die keeps its result instead of being rerolled. */
  readonly retained: boolean;
  /** Slot index showing after the last roll, or null before the first roll. */
  readonly rolledSlotIndex: number | null;
  /** Bible §7: the die sits on the creature that absorbed its symbol. */
  readonly attachedToCreatureId: CreatureId | null;
}
