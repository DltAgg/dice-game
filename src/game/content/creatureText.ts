import type { Attribute } from "../model/attributes.js";
import type { AttackDefinition, CreatureDefinition } from "../model/creatures.js";
import { requirementEntries, type SymbolRequirement } from "../model/symbols.js";
import { attributeLabel } from "./cardText.js";

/**
 * English printing helpers for the Figma creature-card grammar.
 */

export function formatAttackCost(requires: SymbolRequirement): string {
  return requirementEntries(requires)
    .flatMap(([attribute, count]) => Array.from({ length: count }, () => attributeLabel(attribute)))
    .join(" + ");
}

/** `requires` (threshold) or `discards` (pay) — exactly one is authored. */
export function attackCostOf(attack: AttackDefinition): SymbolRequirement {
  return attack.requires ?? attack.discards ?? {};
}

export function formatAttackFuel(attack: AttackDefinition): string {
  return formatAttackCost(attackCostOf(attack));
}

export function formatAttackLine(attack: AttackDefinition): string {
  return `${attack.name}: ${attack.rulesText}`;
}

export function basicAttackOf(creature: CreatureDefinition): AttackDefinition | undefined {
  return creature.attacks.find((attack) => attack.kind === "basic");
}

export function specialAttackOf(creature: CreatureDefinition): AttackDefinition | undefined {
  return creature.attacks.find((attack) => attack.kind === "special");
}

export function primaryAttribute(creature: CreatureDefinition): Attribute | undefined {
  return creature.attributes[0];
}
