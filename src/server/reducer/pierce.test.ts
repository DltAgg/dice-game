import { describe, expect, it } from "vitest";
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
import { DRIVE_SHAFT, KINDLE } from "../testing/tempoCatalogue.js";

describe("ignore Shield / pierce", () => {
  it("skips one Shield without spending it when ignore-shield is armed", () => {
    const base = withTokens(withPhase(newMatch(), "actions"), creatureIdAt(newMatch(), P1, 2), {
      mechanical: 1,
    });
    const attackerId = creatureIdAt(base, P1, 2);
    const targetId = creatureIdAt(base, P2, 0);
    const state = {
      ...withShields(base, targetId, 1),
      ignoreShieldThisTurn: { [P1]: 1 },
    };

    const after = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: DRIVE_SHAFT, targetId }),
    );

    expect(after.creatures[targetId]?.damage).toBe(3);
    expect(after.creatures[targetId]?.shields).toBe(1);
  });

  it("still spends remaining Shield after the ignored point", () => {
    const base = withTokens(withPhase(newMatch(), "actions"), creatureIdAt(newMatch(), P1, 2), {
      mechanical: 1,
    });
    const attackerId = creatureIdAt(base, P1, 2);
    const targetId = creatureIdAt(base, P2, 0);
    const state = {
      ...withShields(base, targetId, 2),
      ignoreShieldThisTurn: { [P1]: 1 },
    };

    const after = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: DRIVE_SHAFT, targetId }),
    );

    expect(after.creatures[targetId]?.damage).toBe(2);
    expect(after.creatures[targetId]?.shields).toBe(1);
    expect(eventTypes(after)).toContain("damage-prevented");
  });

  it("does not pierce on a creature without ignore-shield", () => {
    const match = withPhase(newMatch(), "actions");
    const attackerId = creatureIdAt(match, P1, 1);
    const targetId = creatureIdAt(match, P2, 0);
    const state = withShields(withTokens(match, attackerId, { luminar: 1 }), targetId, 1);

    const after = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: KINDLE, targetId }),
    );

    expect(after.creatures[targetId]?.damage).toBe(1);
    expect(after.creatures[targetId]?.shields).toBe(0);
  });
});
