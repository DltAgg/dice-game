import { describe, expect, it } from "vitest";
import type { AttackDefinition, CreatureDefinition } from "../model/creatures.js";
import { asAttackId, asCreatureDefinitionId } from "../model/ids.js";
import { ALL_CREATURES, GRAPPLER, KORR, MAGNUS, NYX } from "./creatures.js";
import { formatAttackCost, formatAttackFuel, formatAttackLine, primaryAttribute } from "./creatureText.js";

const TAG_SQUAD = [KORR, MAGNUS, NYX] as const;

describe("creature catalogue", () => {
  it("includes the Tag Skirmish trio plus proving Grappler", () => {
    const ids = new Set(ALL_CREATURES.map((creature) => creature.id));
    for (const id of TAG_SQUAD) expect(ids.has(id)).toBe(true);
    expect(ids.has(GRAPPLER)).toBe(true);
    expect(ids.size).toBe(TAG_SQUAD.length + 1);
  });

  it("gives every fighter a passive and at least one native attack", () => {
    for (const creature of ALL_CREATURES) {
      expect(creature.passiveRulesText.length).toBeGreaterThan(0);
      expect(creature.attacks.length).toBeGreaterThan(0);
      expect(creature.attacks.every((attack) => attack.effect !== undefined)).toBe(true);
    }
  });
});

describe("English creature printing", () => {
  it("prints attack lines as Name: body", () => {
    const attack: AttackDefinition = {
      id: asAttackId("attack-example-heavy-axe"),
      name: "Heavy Axe",
      kind: "basic",
      requires: { martial: 2 },
      range: false,
      rulesText: "[Strike 3].",
    };
    expect(formatAttackLine(attack)).toBe("Heavy Axe: [Strike 3].");
  });

  it("prints Requires and Spend when an attack has both", () => {
    const attack: AttackDefinition = {
      id: asAttackId("attack-example-war-charge"),
      name: "War Charge",
      kind: "special",
      requires: { martial: 1, wild: 1 },
      discards: { martial: 1 },
      range: false,
      rulesText: "[Strike 4].",
    };
    expect(formatAttackFuel(attack)).toBe("[Requires: Martial + Wild] [Spend: Martial]");
  });

  it("prints attack costs as Attr + Attr", () => {
    expect(formatAttackCost({ mechanical: 2 })).toBe("2 x Mechanical");
    expect(formatAttackCost({ martial: 1, toxin: 1 })).toBe("Martial + Toxin");
  });

  it("reads the first listed attribute as primary", () => {
    const creature: CreatureDefinition = {
      id: asCreatureDefinitionId("creature-example"),
      name: "Example",
      life: 10,
      attributes: ["luminar", "arcane"],
      passiveRulesText: "A passive.",
      attacks: [],
    };
    expect(primaryAttribute(creature)).toBe("luminar");
  });
});
