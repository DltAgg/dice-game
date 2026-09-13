import type { Attribute } from "../model/attributes.js";
import type { AttackDefinition, CreatureDefinition } from "../model/creatures.js";
import type { SymbolRequirement } from "../model/symbols.js";
import { isNonEmptyRequirement } from "../rules/tokens.js";
import { formatRequirementBody } from "./cardText.js";

/**
 * English printing helpers for the Figma creature-card grammar.
 */

export function formatAttackCost(requires: SymbolRequirement): string {
  return formatRequirementBody(requires);
}

/** Icons on the creature frame: the showing-face `[Unlock]` requirement. */
export function attackCostOf(attack: AttackDefinition): SymbolRequirement {
  return attack.unlock;
}

/** Player-facing gate: `[Unlock: …]` from showing faces (spec `028`). */
export function formatAttackFuel(attack: AttackDefinition): string {
  if (!isNonEmptyRequirement(attack.unlock)) return "";
  return `[Unlock: ${formatAttackCost(attack.unlock)}]`;
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
