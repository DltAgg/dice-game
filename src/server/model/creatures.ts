import type { Attribute } from "./attributes.js";
import type { StandingTrigger } from "./cards.js";
import type { EffectDefinition } from "./effects.js";
import type {
  AttackId,
  CardInstanceId,
  CreatureDefinitionId,
  CreatureId,
  PlayerId,
} from "./ids.js";
import type { SymbolRequirement } from "./symbols.js";

/** Bible §6: the frontline protects the back. */
export type BattlefieldPosition = "frontline" | "back";

/**
 * Bible §7 and §24: creatures have no ATK/DEF. An attack is a cost plus an
 * effect, and the interesting question is whether the cost can be paid.
 *
 * Fuel is the attacker's owner's attribute pile (spec `016`), never the shared
 * turn-pool symbols. Absorbing an attribute banks into that pile immediately.
 */
export interface AttackDefinition {
  readonly id: AttackId;
  readonly name: string;
  /** Basic vs Special as printed on the creature card. */
  readonly kind: "basic" | "special";
  /**
   * Pile gate (`[Requires: …]`): must hold, not spent. May accompany `discards`.
   */
  readonly requires?: SymbolRequirement;
  /**
   * Pile burn (`[Spend: …]`): removed from the owner's pile on declare.
   * May accompany `requires` (gate + pay from the same pile).
   */
  readonly discards?: SymbolRequirement;
  /** Bible §6: Range lets an attack ignore the frontline restriction. */
  readonly range: boolean;
  /**
   * English rules text for the attack body (after the name), as printed. Kept
   * even when `effect` only models a subset of the clause.
   */
  readonly rulesText: string;
  /**
   * The subset the engine can resolve today. Absent means the attack prints
   * but cannot be declared yet.
   */
  readonly effect?: EffectDefinition;
  /**
   * Additional effects queued after the damage link (Arcane Burst draw, etc.).
   * Existing cards omit this.
   */
  readonly followUpEffects?: readonly EffectDefinition[];
}

export interface CreatureDefinition {
  readonly id: CreatureDefinitionId;
  readonly name: string;
  readonly life: number;
  readonly attributes: readonly Attribute[];
  /**
   * Commander-style win target. Omit / false = non-legendary. Every legal
   * squad has exactly one legendary; defeating it wins the match.
   */
  readonly legendary?: boolean;
  /** English passive text as printed under the art. Empty when none. */
  readonly passiveRulesText: string;
  /**
   * Data-driven standing passives (`010`). Prefer relation filters on shared
   * hooks over special-cased reducer branches.
   */
  readonly standingAbilities?: readonly StandingTrigger[];
  readonly attacks: readonly AttackDefinition[];
}

export interface CreatureState {
  readonly id: CreatureId;
  readonly definitionId: CreatureDefinitionId;
  readonly ownerId: PlayerId;
  readonly position: BattlefieldPosition;
  /** Damage taken. Max life stays on the definition so it is never desynced. */
  readonly damage: number;
  readonly defeated: boolean;
  readonly attacksUsedThisCombat: number;
  /**
   * Extra attacks allowed this turn beyond `attacksPerCreaturePerCombat`
   * (Wild `[Frenzy]`). Cleared at end of turn.
   */
  readonly extraAttacksThisTurn: number;
  /** Each shield prevents 1 damage once, then is gone. Persists across turns. */
  readonly shields: number;
  /**
   * Remaining incoming **attacks** to cancel whole (spec `009`). Applied before
   * Shields. Unused remainder persists until consumed (`preventExpiry: "none"`).
   * Non-attack damage does not consume this.
   */
  readonly attackPreventCount: number;
  /**
   * Extra damage on this creature's next attack only (Varcolac passive). Cleared
   * when spent or at end of turn.
   */
  readonly nextAttackBonus: number;
  /**
   * Toxin counters. At the end of this creature's owner's turn, the creature
   * takes damage equal to its markers, then all markers are cleared. Soft-capped
   * by `GameRulesConfig.maxToxinMarkers` on apply.
   */
  readonly toxinMarkers: number;
  /** Equipment cards currently attached to this creature. */
  readonly equipmentIds: readonly CardInstanceId[];
  /**
   * Once-per-turn standing trigger keys spent this turn
   * (`equip:<id>:on-take-damage`, `creature:<id>:on-attack`, …). Cleared on
   * END_TURN.
   */
  readonly spentOncePerTurnTriggers: readonly string[];
  /**
   * Aegis: remaining damage that would hit another ally is redirected here.
   * Cleared at end of turn.
   */
  readonly redirectDamageThisTurn: number;
  /**
   * Venom absorb: extra incoming damage on the next hit. Cleared when consumed
   * or at end of turn.
   */
  readonly nextIncomingDamageBonus: number;
  /**
   * Adaptive Toxin: remaining markers this creature may still receive until its
   * owner's next turn starts. `null` / omitted = uncapped. Spec `013`.
   */
  readonly toxinReceiveCapRemaining?: number | null;
}
