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

export type FaceKind = "natural" | "synthetic";

/**
 * The reusable definition of a face (bible §11). Several physical die faces —
 * even on different dice — may point at the same face card (1:N). Overloads
 * attach to the face card, not to a physical slot.
 */
export interface FaceCardDefinition {
  readonly id: FaceCardId;
  readonly name: string;
  readonly kind: FaceKind;
  /** The attribute this face produces, or Shield for the one untyped face. */
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
  /** Capacity for overloads attached to this face card (shared across all slots). */
  readonly maxOverloads: number;
  /**
   * When `"echo-cards"`, only tactics tagged `forgeTags: ["echo"]` may install
   * this face (Arcane Echo).
   */
  readonly forgeRestriction: "echo-cards" | null;
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
