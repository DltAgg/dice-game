import type { Attribute } from "./attributes.js";
import type { EffectDefinition } from "./effects.js";
import type {
  AbilityId,
  AttackId,
  CardInstanceId,
  CreatureDefinitionId,
  CreatureId,
  PlayerId,
} from "./ids.js";
import type { AttributeTokens, SymbolRequirement } from "./symbols.js";

/** Bible §6: the frontline protects the back. */
export type BattlefieldPosition = "frontline" | "back";

/**
 * Bible §7 and §24: creatures have no ATK/DEF. An attack is a cost plus an
 * effect, and the interesting question is whether the cost can be paid.
 *
 * The cost is paid from attributes the *attacker itself* absorbed, never from
 * the shared symbol pool — the Pokémon TCG attachment model. That is what makes
 * absorbing a real choice rather than a loss: an absorbed symbol leaves engine
 * resolution (bible §7) but arms the creature that took it.
 */
export interface AttackDefinition {
  readonly id: AttackId;
  readonly name: string;
  /** Basic vs Special as printed on the creature card. */
  readonly kind: "basic" | "special";
  /**
   * Attributes the attacker must be holding. Checked, not spent: a creature
   * that is fuelled stays fuelled and can attack again on later turns.
   */
  readonly requires: SymbolRequirement;
  /**
   * Attributes the attack burns on use, normally a subset of `requires`. This
   * is how a heavier attack costs more than a lighter one on the same creature.
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
}

/**
 * An engine ability: the creature consumes symbols during engine resolution to
 * produce an effect. This is the "creatures are converters" pillar (SPDD §52).
 * Figma creature cards do not print these; they remain on the vertical-slice
 * prototype squad only.
 */
export interface CreatureAbilityDefinition {
  readonly id: AbilityId;
  readonly name: string;
  readonly consumes: SymbolRequirement;
  readonly effect: EffectDefinition;
}

export interface CreatureDefinition {
  readonly id: CreatureDefinitionId;
  readonly name: string;
  readonly life: number;
  readonly attributes: readonly Attribute[];
  /** English passive text as printed under the art. Empty when none. */
  readonly passiveRulesText: string;
  readonly attacks: readonly AttackDefinition[];
  readonly engineAbilities: readonly CreatureAbilityDefinition[];
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
   * Bible §7: absorbed symbols become attribute tokens at end of turn. Because
   * they only appear once the turn is over, a creature can never attack on the
   * same turn it absorbed the fuel — absorbing is always a turn of setup.
   */
  readonly attributeTokens: AttributeTokens;
  /** Each shield prevents 1 damage once, then is gone. Persists across turns. */
  readonly shields: number;
  /**
   * Prevent-next-N damage buffer (spec `009`). Applied before Shields.
   * Unused remainder persists until consumed (`preventExpiry: "none"`).
   */
  readonly damagePreventBuffer: number;
  /**
   * Toxin counters. At the start of this creature's owner's turn, the creature
   * takes 1 damage per counter. Counters persist until something removes them.
   */
  readonly toxinMarkers: number;
  /** Equipment cards currently attached to this creature. */
  readonly equipmentIds: readonly CardInstanceId[];
}
