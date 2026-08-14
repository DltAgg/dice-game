import { describe, expect, it } from "vitest";
import {
  AEGIS_LINK,
  ALL_CREATURES,
  ARCHMAGE,
  CLOCKWORK_DYNAMO,
  COGWORK_DRIVER,
  CORRUPTING_ELDER,
  GARUDA,
  LENS_CHOIR,
  MINOTAUR,
  PRISM_HERALD,
  SERVO_ASSEMBLY,
  VARCOLAC,
  VOID_SUMMONER,
  getCreatureDefinition,
} from "./creatures.js";
import { formatAttackLine, primaryAttribute } from "./creatureText.js";

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

  it("prints English attack lines", () => {
    const minotaur = getCreatureDefinition(MINOTAUR);
    if (minotaur === undefined) throw new Error("missing minotaur");
    const [basic] = minotaur.attacks;
    expect(formatAttackLine(basic!)).toBe("Heavy Axe: Deal 3 damage.");
    expect(primaryAttribute(minotaur)).toBe("martial");
  });

  it("gives every catalogue creature a passive, a basic and a special", () => {
    for (const creature of ALL_CREATURES) {
      expect(creature.passiveRulesText.length).toBeGreaterThan(0);
      expect(creature.attacks.some((attack) => attack.kind === "basic")).toBe(true);
      expect(creature.attacks.some((attack) => attack.kind === "special")).toBe(true);
      expect(creature.attacks.every((attack) => attack.effect !== undefined)).toBe(true);
    }
  });

  it("wires Prism Herald Concord choose-ally bonus", () => {
    const herald = getCreatureDefinition(PRISM_HERALD);
    if (herald === undefined) throw new Error("missing prism herald");
    const special = herald.attacks.find((attack) => attack.kind === "special");
    expect(special?.followUpEffects).toEqual([
      {
        type: "grant-next-attack-bonus",
        amount: 1,
        target: { kind: "choose-ally" },
      },
    ]);
    expect(primaryAttribute(herald)).toBe("luminar");
  });

  it("wires Servo Assembly Stamp Pulse reapply", () => {
    const servo = getCreatureDefinition(SERVO_ASSEMBLY);
    if (servo === undefined) throw new Error("missing servo assembly");
    const special = servo.attacks.find((attack) => attack.kind === "special");
    expect(special?.requires).toEqual({ mechanical: 2 });
    expect(special?.followUpEffects).toEqual([{ type: "reapply-die-modifiers" }]);
    expect(primaryAttribute(servo)).toBe("mechanical");
  });
});
