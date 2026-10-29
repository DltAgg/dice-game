import { describe, expect, it } from "vitest";
import type { AttackDefinition } from "../model/creatures.js";
import { asAttackId } from "../model/ids.js";
import { secondaryMatches } from "../rules/faceActions.js";
import { ALL_CREATURES, MAGNUS, RYU, VEGA } from "./creatures.js";
import { ALL_FACE_CARDS, getFaceCard, JAB, MAGNUS_LARIAT, RYU_FOCUS, VEGA_KICK } from "./faces.js";
import { formatAttackCost, formatAttackFuel, formatAttackLine } from "./creatureText.js";

const TAG_SQUAD = [VEGA, MAGNUS, RYU] as const;

describe("creature catalogue", () => {
  it("includes the Tag Skirmish trio", () => {
    const ids = new Set(ALL_CREATURES.map((creature) => creature.id));
    for (const id of TAG_SQUAD) expect(ids.has(id)).toBe(true);
    expect(ids.size).toBe(TAG_SQUAD.length);
  });

  it("gives every fighter a passive", () => {
    for (const creature of ALL_CREATURES) {
      expect(creature.passiveRulesText.length).toBeGreaterThan(0);
    }
  });

  it("hits with a face or a two-face technique, not a basic or special attack", () => {
    for (const creature of TAG_SQUAD) {
      const definition = ALL_CREATURES.find((entry) => entry.id === creature);
      expect(definition?.attacks).toEqual([]);
      expect((definition?.techniques?.length ?? 0) > 0).toBe(true);
    }
    const step = VEGA && ALL_CREATURES.find((entry) => entry.id === VEGA);
    const stepKick = step?.techniques?.find((technique) => technique.id === "technique-vega-step-jab");
    expect(stepKick?.name).toBe("Step Kick");
    expect(stepKick?.primaryFaceId).toBe(VEGA_KICK);
    expect(stepKick?.sequenceRole).toBe("starter");
    expect(stepKick?.effects[0]).toMatchObject({ type: "damage", amount: 3 });
    expect(stepKick?.secondary).toEqual({
      faceType: "projectile",
    });
    const collar = ALL_CREATURES.find((entry) => entry.id === MAGNUS);
    const lariatTie = collar?.techniques?.find((technique) => technique.id === "technique-magnus-collar-tie");
    expect(lariatTie?.name).toBe("Lariat Tie");
    expect(lariatTie?.primaryFaceId).toBe(MAGNUS_LARIAT);
    expect(lariatTie?.sequenceRole).toBe("starter");
    expect(lariatTie?.effects[0]).toMatchObject({ type: "damage", amount: 3 });
    expect(lariatTie?.secondary).toEqual({
      hitStrength: "light",
      hitType: "kick",
    });
    const check = ALL_CREATURES.find((entry) => entry.id === RYU);
    const checkFocus = check?.techniques?.find((technique) => technique.id === "technique-ryu-check-fire");
    expect(checkFocus?.name).toBe("Check Focus");
    expect(checkFocus?.primaryFaceId).toBe(RYU_FOCUS);
    expect(checkFocus?.sequenceRole).toBe("starter");
    expect(checkFocus?.effects[0]).toMatchObject({ type: "damage", amount: 2 });
    expect(checkFocus?.secondary).toEqual({
      sequenceRole: "extender",
    });
    expect(getFaceCard(JAB)?.primaryEffects?.[0]).toMatchObject({ type: "damage", amount: 1 });
    for (const creature of TAG_SQUAD) {
      const definition = ALL_CREATURES.find((entry) => entry.id === creature);
      expect(definition?.baseDie?.includes(JAB)).toBe(true);
    }
    const dashId = ALL_CREATURES.find((entry) => entry.id === VEGA)?.baseDie?.[3];
    const dash = dashId === undefined ? undefined : getFaceCard(dashId);
    expect(dash?.sequenceRole).toBe("extender");
    expect(dash === undefined ? false : secondaryMatches(dash, { sequenceRole: "extender" })).toBe(true);
    const projectileId = ALL_CREATURES.find((entry) => entry.id === RYU)?.baseDie?.[1];
    const projectile = projectileId === undefined ? undefined : getFaceCard(projectileId);
    expect(projectile?.faceType).toBe("projectile");
    expect(projectile === undefined ? false : secondaryMatches(projectile, { faceType: "projectile" })).toBe(true);
    const kickId = ALL_CREATURES.find((entry) => entry.id === VEGA)?.baseDie?.[2];
    const kick = kickId === undefined ? undefined : getFaceCard(kickId);
    expect(kick?.hitStrength).toBe("light");
    expect(kick?.hitType).toBe("kick");
    expect(kick === undefined ? false : secondaryMatches(kick, { hitStrength: "light", hitType: "kick" })).toBe(true);
    expect(kick === undefined ? false : secondaryMatches(kick, { hitType: "punch" })).toBe(false);
    for (const face of ALL_FACE_CARDS) {
      if ((face.primaryEffects?.length ?? 0) === 0) continue;
      expect(face.hitStrength, face.id).toBeDefined();
      expect(face.hitType, face.id).toBeDefined();
    }
    for (const creature of ALL_CREATURES) {
      for (const technique of creature.techniques ?? []) {
        expect(technique.hitStrength, technique.id).toBeDefined();
        expect(technique.hitType, technique.id).toBeDefined();
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

});
