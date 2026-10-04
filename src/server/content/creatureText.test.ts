import { describe, expect, it } from "vitest";
import type { AttackDefinition } from "../model/creatures.js";
import { asAttackId } from "../model/ids.js";
import { secondaryMatches } from "../rules/faceActions.js";
import { ALL_CREATURES, GRAPPLER, MAGNUS, RYU, VEGA } from "./creatures.js";
import { getFaceCard } from "./faces.js";
import { formatAttackCost, formatAttackFuel, formatAttackLine } from "./creatureText.js";

const TAG_SQUAD = [VEGA, MAGNUS, RYU] as const;

describe("creature catalogue", () => {
  it("includes the Tag Skirmish trio plus proving Grappler", () => {
    const ids = new Set(ALL_CREATURES.map((creature) => creature.id));
    for (const id of TAG_SQUAD) expect(ids.has(id)).toBe(true);
    expect(ids.has(GRAPPLER)).toBe(true);
    expect(ids.size).toBe(TAG_SQUAD.length + 1);
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
    expect(step?.techniques?.find((technique) => technique.id === "technique-vega-step-jab")?.secondary).toEqual({
      faceType: "projectile",
    });
    const collar = ALL_CREATURES.find((entry) => entry.id === MAGNUS);
    expect(collar?.techniques?.find((technique) => technique.id === "technique-magnus-collar-tie")?.secondary).toEqual({
      faceId: "face-natural-vega-dash",
    });
    const check = ALL_CREATURES.find((entry) => entry.id === RYU);
    expect(check?.techniques?.find((technique) => technique.id === "technique-ryu-check-fire")?.secondary).toEqual({
      sequenceRole: "extender",
    });
    const dashId = ALL_CREATURES.find((entry) => entry.id === VEGA)?.baseDie?.[3];
    const dash = dashId === undefined ? undefined : getFaceCard(dashId);
    expect(dash?.sequenceRole).toBe("extender");
    expect(dash === undefined ? false : secondaryMatches(dash, { sequenceRole: "extender" })).toBe(true);
    const projectileId = ALL_CREATURES.find((entry) => entry.id === RYU)?.baseDie?.[1];
    const projectile = projectileId === undefined ? undefined : getFaceCard(projectileId);
    expect(projectile?.faceType).toBe("projectile");
    expect(projectile === undefined ? false : secondaryMatches(projectile, { faceType: "projectile" })).toBe(true);
  });

  it("keeps a native attack on the proving Grappler", () => {
    const grappler = ALL_CREATURES.find((entry) => entry.id === GRAPPLER);
    expect((grappler?.attacks.length ?? 0) > 0).toBe(true);
    expect(grappler?.attacks.some((attack) => attack.effect !== undefined)).toBe(true);
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
