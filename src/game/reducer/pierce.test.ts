import { describe, expect, it } from "vitest";
import { asAttackId } from "../model/ids.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  newMatch,
  P1,
  P2,
  withPhase,
  withShields,
  withTokens,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const HEAVY_AXE = asAttackId("attack-minotaur-heavy-axe");
const CHARGE = asAttackId("attack-varcolac-charge");

describe("ignore Shield / pierce", () => {
  it("lets War Minotaur skip 1 Shield without spending it", () => {
    const base = withTokens(withPhase(newMatch(), "actions"), creatureIdAt(newMatch(), P1, 0), {
      martial: 2,
    });
    const attackerId = creatureIdAt(base, P1, 0);
    const targetId = creatureIdAt(base, P2, 0);
    const state = withShields(base, targetId, 1);

    const after = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: HEAVY_AXE, targetId }),
    );

    expect(after.creatures[targetId]?.damage).toBe(3);
    expect(after.creatures[targetId]?.shields).toBe(1);
  });

  it("still spends remaining Shield after the ignored point", () => {
    const base = withTokens(withPhase(newMatch(), "actions"), creatureIdAt(newMatch(), P1, 0), {
      martial: 2,
    });
    const attackerId = creatureIdAt(base, P1, 0);
    const targetId = creatureIdAt(base, P2, 0);
    const state = withShields(base, targetId, 2);

    const after = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: HEAVY_AXE, targetId }),
    );

    expect(after.creatures[targetId]?.damage).toBe(2);
    expect(after.creatures[targetId]?.shields).toBe(1);
    expect(eventTypes(after)).toContain("damage-prevented");
  });

  it("does not pierce on a creature without ignore-shield", () => {
    const match = withPhase(newMatch(), "actions");
    const attackerId = creatureIdAt(match, P1, 1);
    const targetId = creatureIdAt(match, P2, 0);
    const state = withShields(withTokens(match, attackerId, { wild: 1 }), targetId, 1);

    const after = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: CHARGE, targetId }),
    );

    expect(after.creatures[targetId]?.damage).toBe(1);
    expect(after.creatures[targetId]?.shields).toBe(0);
  });
});
