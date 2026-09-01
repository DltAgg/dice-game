import { describe, expect, it } from "vitest";
import { createDraft } from "./draft.js";
import { drainResolution, pushEffect } from "./resolution.js";
import {
  creatureIdAt,
  newMatch,
  P1,
  P2,
  withDamage,
  withDefeatedCreature,
  withPhase,
} from "../testing/scenario.js";

describe("ally-all / enemy-all selectors", () => {
  it("enemy-all damage hits every living enemy, including the back row", () => {
    const base = withPhase(newMatch(), "actions");
    const frontA = creatureIdAt(base, P2, 0);
    const frontB = creatureIdAt(base, P2, 1);
    const back = creatureIdAt(base, P2, 2);
    expect(base.creatures[frontA]?.position).toBe("frontline");
    expect(base.creatures[frontB]?.position).toBe("frontline");
    expect(base.creatures[back]?.position).toBe("back");

    const draft = createDraft(base);
    pushEffect(draft, P1, { type: "damage", amount: 2, target: { kind: "enemy-all" } }, null, null);
    drainResolution(draft);

    expect(draft.creatures[frontA]?.damage).toBe(2);
    expect(draft.creatures[frontB]?.damage).toBe(2);
    expect(draft.creatures[back]?.damage).toBe(2);
    expect(draft.creatures[creatureIdAt(base, P1, 0)]?.damage).toBe(0);
    expect(draft.creatures[creatureIdAt(base, P1, 1)]?.damage).toBe(0);
    expect(draft.creatures[creatureIdAt(base, P1, 2)]?.damage).toBe(0);
  });

  it("enemy-all skips defeated enemies", () => {
    const base = withPhase(newMatch(), "actions");
    const frontA = creatureIdAt(base, P2, 0);
    const frontB = creatureIdAt(base, P2, 1);
    const back = creatureIdAt(base, P2, 2);
    const seeded = withDefeatedCreature(base, frontA);
    const draft = createDraft(seeded);
    pushEffect(draft, P1, { type: "damage", amount: 1, target: { kind: "enemy-all" } }, null, null);
    drainResolution(draft);

    expect(draft.creatures[frontA]?.damage).toBe(999);
    expect(draft.creatures[frontB]?.damage).toBe(1);
    expect(draft.creatures[back]?.damage).toBe(1);
  });

  it("ally-all heal hits every living ally, including the back row", () => {
    const base = withPhase(newMatch(), "actions");
    const frontA = creatureIdAt(base, P1, 0);
    const frontB = creatureIdAt(base, P1, 1);
    const back = creatureIdAt(base, P1, 2);
    const damaged = withDamage(withDamage(withDamage(base, frontA, 4), frontB, 3), back, 2);
    const draft = createDraft(damaged);
    pushEffect(draft, P1, { type: "heal", amount: 2, target: { kind: "ally-all" } }, null, null);
    drainResolution(draft);

    expect(draft.creatures[frontA]?.damage).toBe(2);
    expect(draft.creatures[frontB]?.damage).toBe(1);
    expect(draft.creatures[back]?.damage).toBe(0);
  });
});
