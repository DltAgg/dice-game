import { describe, expect, it } from "vitest";
import type { AttackDefinition, CreatureDefinition } from "../model/creatures.js";
import { asAttackId, asCreatureDefinitionId } from "../model/ids.js";
import { isNonEmptyRequirement } from "../rules/tokens.js";
import {
  ALL_CREATURES,
  DAWN_WARDEN,
  DUSKTHRONE_ORACLE,
  GRAVEMARROW_SHADE,
  LODESTAR_ARTIFICER,
  RIFTSCRIBE_ADEPT,
  TORQUE_WRIGHT,
} from "./creatures.js";
import { formatAttackCost, formatAttackFuel, formatAttackLine, primaryAttribute } from "./creatureText.js";

const TEMPO_IDS = [DAWN_WARDEN, LODESTAR_ARTIFICER, TORQUE_WRIGHT] as const;
const CONTROL_IDS = [RIFTSCRIBE_ADEPT, GRAVEMARROW_SHADE, DUSKTHRONE_ORACLE] as const;

describe("creature catalogue", () => {
  it("includes the Mechanical / Luminar Tempo squad", () => {
    const ids = new Set(ALL_CREATURES.map((creature) => creature.id));
    for (const id of TEMPO_IDS) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("includes the Arcane / Darkness Control squad", () => {
    const ids = new Set(ALL_CREATURES.map((creature) => creature.id));
    for (const id of CONTROL_IDS) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("catalogues exactly one legendary win target per attribute pairing", () => {
    const legendaries = ALL_CREATURES.filter((creature) => creature.legendary === true);
    expect(legendaries.map((creature) => creature.id)).toEqual([
      LODESTAR_ARTIFICER,
      DUSKTHRONE_ORACLE,
    ]);
  });

  it("gives every catalogue creature a passive, a basic and a special", () => {
    for (const creature of ALL_CREATURES) {
      if (creature.id.startsWith("creature-baseline-")) continue;
      expect(creature.passiveRulesText.length).toBeGreaterThan(0);
      expect(creature.attacks.some((attack) => attack.kind === "basic")).toBe(true);
      expect(creature.attacks.some((attack) => attack.kind === "special")).toBe(true);
      expect(creature.attacks.every((attack) => attack.effect !== undefined)).toBe(true);
    }
  });

  it("gives every attack a Requires gate, a Spend, or both", () => {
    for (const creature of ALL_CREATURES) {
      if (creature.id.startsWith("creature-baseline-")) continue;
      for (const attack of creature.attacks) {
        const hasRequires = isNonEmptyRequirement(attack.requires);
        const hasDiscards = isNonEmptyRequirement(attack.discards);
        expect(
          hasRequires || hasDiscards,
          `${creature.name} ${attack.name} needs Requires and/or Spend`,
        ).toBe(true);
        if (attack.kind === "special") {
          expect(hasRequires, `${creature.name} ${attack.name} special has a Requires gate`).toBe(
            true,
          );
          expect(hasDiscards, `${creature.name} ${attack.name} special Spends`).toBe(true);
        }
      }
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
