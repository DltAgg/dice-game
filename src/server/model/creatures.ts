import type { Attribute } from "./attributes.js";
import type { StandingTrigger } from "./cards.js";
import type { EffectDefinition } from "./effects.js";
import type { FighterTechniqueDefinition } from "./fighterTechniques.js";
import type {
  AttackId,
  CardInstanceId,
  CreatureDefinitionId,
  CreatureId,
  PlayerId,
} from "./ids.js";
import type { SymbolRequirement } from "./symbols.js";
import type { Technique } from "./techniques.js";

/** Bible §6: the frontline protects the back. */
export type BattlefieldPosition = "frontline" | "back";

/**
 * Creatures have no ATK/DEF. An attack is a named effect (plus optional
 * printed cost data left on the definition). Pile fuel gates were removed;
 * declare checks targeting, once-per-turn, and a resolvable `effect`.
 */
export interface AttackDefinition {
  readonly id: AttackId;
  readonly name: string;
  /** Basic vs Special as printed on the creature card. */
  readonly kind: "basic" | "special";
  /**
   * Printed `[Requires]` gate. Catalogue data only — not enforced.
   */
  readonly requires?: SymbolRequirement;
  /**
   * Printed `[Spend]`. Catalogue data only — not enforced.
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
  /**
   * Spec `028`. AND-gated on the showing technique of **this** fighter's
   * bound die. Omit on legacy pile-era attacks (no technique gate).
   */
  readonly requiredTechniques?: readonly Technique[];
}

export interface CreatureDefinition {
  readonly id: CreatureDefinitionId;
  readonly name: string;
  readonly life: number;
  readonly attributes: readonly Attribute[];
  /**
   * Catalogue flag from the previous commander-win design. Unused for
   * match termination (no automatic win condition until the 3v3 design).
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
  /**
   * Fighting-game archetype id (spec `028`). Matched by
   * `CardDefinition.archetypeRestriction`.
   */
  readonly archetype?: string;
  /**
   * Assist payload while this fighter is Reserve (spec `028`). Empty / omit
   * means ASSIST is illegal (`CARD_HAS_NO_EFFECT`).
   */
  readonly assistEffects?: readonly EffectDefinition[];
  /** Player-facing Assist name. */
  readonly assistName?: string;
  readonly assistRulesText?: string;
  /**
   * Meter for Assist when this Fighter is not showing assist.
   * Omit to use `assistMeterCost`. Showing assist spends nothing. Spec `030`.
   */
  readonly exceptionalAssistMeter?: number;
  /**
   * Two-face Fighter moves (spec `029`). Distinct from attack
   * `requiredTechniques` (spec `028` toolkit gate).
   */
  readonly techniques?: readonly FighterTechniqueDefinition[];
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
   * Shields. Unused remainder expires at end of turn by default
   * (`preventExpiry: "end-of-turn"`); `"none"` keeps charges until consumed.
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
  /**
   * `[Silence]` expiry turn. Silenced while `GameState.turn < this`. Spec `022`.
   */
  readonly silenceExpiresOnTurn?: number;
  /**
   * Techniques this Fighter may use even when the secondary input does not
   * match. A Moveset Modify appends ids. Spec `030`.
   */
  readonly enabledTechniqueIds?: readonly string[];
}
