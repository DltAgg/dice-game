import type { Attribute } from "../model/attributes.js";
import type { AttackDefinition, CreatureDefinition } from "../model/creatures.js";
import { requirementEntries, type SymbolRequirement } from "../model/symbols.js";
import { isNonEmptyRequirement } from "../rules/tokens.js";
import { attributeLabel } from "./cardText.js";

/**
 * English printing helpers for the Figma creature-card grammar.
 */

export function formatAttackCost(requires: SymbolRequirement): string {
  return requirementEntries(requires)
    .flatMap(([attribute, count]) => Array.from({ length: count }, () => attributeLabel(attribute)))
    .join(" + ");
}

/**
 * Icons on the creature frame: the gate if printed, otherwise the Spend.
 * Text fuel (`formatAttackFuel`) names both when both exist.
 */
export function attackCostOf(attack: AttackDefinition): SymbolRequirement {
  if (isNonEmptyRequirement(attack.requires)) return attack.requires;
  return attack.discards ?? {};
}

/** Player-facing fuel: `[Requires: …]` gate, `[Spend: …]` pile burn. */
export function formatAttackFuel(attack: AttackDefinition): string {
  const parts: string[] = [];
  if (isNonEmptyRequirement(attack.requires)) {
    parts.push(`[Requires: ${formatAttackCost(attack.requires)}]`);
  }
  if (isNonEmptyRequirement(attack.discards)) {
    parts.push(`[Spend: ${formatAttackCost(attack.discards)}]`);
  }
  return parts.join(" ");
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
