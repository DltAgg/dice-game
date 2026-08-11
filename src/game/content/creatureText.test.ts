import { describe, expect, it } from "vitest";
import {
  ALL_CREATURES,
  ARCHMAGE,
  GARUDA,
  MINOTAUR,
  VARCOLAC,
  VOID_SUMMONER,
  CORRUPTING_ELDER,
  getCreatureDefinition,
} from "./creatures.js";
import { formatAttackLine, primaryAttribute } from "./creatureText.js";

describe("Figma creature catalogue", () => {
  it("includes the six Slow-game-test creatures", () => {
    expect(ALL_CREATURES.map((creature) => creature.id).sort()).toEqual(
      [
        ARCHMAGE,
        CORRUPTING_ELDER,
        GARUDA,
        MINOTAUR,
        VARCOLAC,
        VOID_SUMMONER,
      ].sort(),
    );
  });

  it("prints English attack lines", () => {
    const minotaur = getCreatureDefinition(MINOTAUR);
    if (minotaur === undefined) throw new Error("missing minotaur");
    const [basic] = minotaur.attacks;
    expect(formatAttackLine(basic!)).toBe("Heavy Axe: Deal 3 damage.");
    expect(primaryAttribute(minotaur)).toBe("martial");
  });

  it("gives every Figma creature a passive, a basic and a special", () => {
    for (const creature of ALL_CREATURES) {
      expect(creature.passiveRulesText.length).toBeGreaterThan(0);
      expect(creature.attacks.some((attack) => attack.kind === "basic")).toBe(true);
      expect(creature.attacks.some((attack) => attack.kind === "special")).toBe(true);
      expect(creature.attacks.every((attack) => attack.effect !== undefined)).toBe(true);
    }
  });
});
