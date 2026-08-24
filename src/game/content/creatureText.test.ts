import { describe, expect, it } from "vitest";
import type { AttackDefinition, CreatureDefinition } from "../model/creatures.js";
import { asAttackId, asCreatureDefinitionId } from "../model/ids.js";
import {
  AEGIS_LINK,
  ALL_CREATURES,
  ARCHMAGE,
  CINDER_WIGHT,
  CLOCKWORK_DYNAMO,
  COGWORK_DRIVER,
  CORRUPTING_ELDER,
  GARUDA,
  ICHOR_HYDRA,
  LENS_CHOIR,
  MARROW_FIEND,
  MINOTAUR,
  NIGHTBOUND_ADEPT,
  PRISM_HERALD,
  SERVO_ASSEMBLY,
  VARCOLAC,
  VOID_SUMMONER,
} from "./creatures.js";
import { formatAttackCost, formatAttackLine, primaryAttribute } from "./creatureText.js";

const FIGMA_IDS = [
  ARCHMAGE,
  CORRUPTING_ELDER,
  GARUDA,
  MINOTAUR,
  VARCOLAC,
  VOID_SUMMONER,
] as const;

const TEMPO_COMBO_IDS = [
  AEGIS_LINK,
  CLOCKWORK_DYNAMO,
  COGWORK_DRIVER,
  LENS_CHOIR,
  PRISM_HERALD,
  SERVO_ASSEMBLY,
] as const;

const BURN_IDS = [CINDER_WIGHT, ICHOR_HYDRA, MARROW_FIEND] as const;

describe("creature catalogue", () => {
  it("includes the six Slow-game-test creatures", () => {
    const ids = new Set(ALL_CREATURES.map((creature) => creature.id));
    for (const id of FIGMA_IDS) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("includes Mechanical / Luminar Tempo–Combo creatures", () => {
    const ids = new Set(ALL_CREATURES.map((creature) => creature.id));
    for (const id of TEMPO_COMBO_IDS) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("includes Nightbound Adept for two-color Control", () => {
    expect(ALL_CREATURES.some((creature) => creature.id === NIGHTBOUND_ADEPT)).toBe(true);
  });

  it("includes Toxin / Corruption Burn creatures", () => {
    const ids = new Set(ALL_CREATURES.map((creature) => creature.id));
    for (const id of BURN_IDS) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it("gives every catalogue creature a passive, a basic and a special", () => {
    for (const creature of ALL_CREATURES) {
      expect(creature.passiveRulesText.length).toBeGreaterThan(0);
      expect(creature.attacks.some((attack) => attack.kind === "basic")).toBe(true);
      expect(creature.attacks.some((attack) => attack.kind === "special")).toBe(true);
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

  it("prints attack costs as Attr + Attr", () => {
    expect(formatAttackCost({ mechanical: 2 })).toBe("Mechanical + Mechanical");
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
