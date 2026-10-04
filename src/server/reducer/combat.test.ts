import { describe, expect, it } from "vitest";
import type { AttributeTokens } from "../model/symbols.js";
import { currentLife, legendaryCreatureOf } from "../rules/creatures.js";
import {
  TEST_BODY_A,
  TEST_LEGEND,
  TEST_SQUAD,
  testAttack,
  testCreature,
} from "../testing/fixtures/index.js";
import {
  creatureIdAt,
  expectOk,
  newMatch,
  P1,
  P2,
  withDamage,
  withDefeatedCreature,
  withPhase,
  withShields,
  withTokens,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";
import { CRANK, CRANK_FUEL, DRIVE_SHAFT, DRIVE_SHAFT_FUEL, KINDLE_FUEL, RETOOL, RETOOL_FUEL, VIGIL } from "../testing/tempoCatalogue.js";

const HEAL_AFTER_STRIKE = testAttack({
  id: "attack-test-heal-after-strike",
  discards: { luminar: 2 },
  followUpEffects: [{ type: "heal", amount: 1, target: { kind: "choose-ally" } }],
});
const HEALER = testCreature({
  id: "creature-test-healer",
  attacks: [HEAL_AFTER_STRIKE],
});

function combatState(creatureIndex: number, tokens: AttributeTokens) {
  const state = withPhase(newMatch(), "actions");
  return withTokens(state, creatureIdAt(state, P1, creatureIndex), tokens);
}

describe("attacking", () => {
  it("damages the target when the attacker holds the discarded attributes", () => {
    const state = combatState(0, CRANK_FUEL);
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);

    const after = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: CRANK, targetId }),
    );

    const target = after.creatures[targetId];
    if (target === undefined) throw new Error("expected the target");
    expect(target.damage).toBe(2);
    expect(currentLife(target)).toBe(12);
  });

  it("declares Retool without pile spend bookkeeping", () => {
    const state = combatState(0, RETOOL_FUEL);
    const attackerId = creatureIdAt(state, P1, 0);

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: RETOOL,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );

    expect(after.creatures[creatureIdAt(after, P2, 0)]?.damage).toBeGreaterThan(0);
  });

  it("declares Drive Shaft without pile spend bookkeeping", () => {
    const state = combatState(2, DRIVE_SHAFT_FUEL);
    const attackerId = creatureIdAt(state, P1, 2);

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: DRIVE_SHAFT,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );

    expect(after.creatures[creatureIdAt(after, P2, 0)]?.damage).toBeGreaterThan(0);
  });

  it("allows multi-cost attacks without creature fuel", () => {
    const state = combatState(1, {});
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 1),
        attackId: VIGIL,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );
    expect(after.creatures[creatureIdAt(after, P2, 0)]?.damage).toBeGreaterThan(0);
  });

  it("allows only one attack per creature per combat phase", () => {
    const state = combatState(0, { mechanical: 2 });
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);
    const first = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: CRANK, targetId }),
    );
    const second = advance(first, {
      type: "ATTACK",
      playerId: P1,
      attackerId,
      attackId: CRANK,
      targetId,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("ATTACK_ALREADY_USED");
  });

  it("lets a creature attack again on the following turn", () => {
    const state = combatState(0, CRANK_FUEL);
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);
    const first = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: CRANK, targetId }),
    );
    const p2Turn = expectOk(advance(first, { type: "END_TURN", playerId: P1 }));
    const p1TurnAgain = expectOk(advance(p2Turn, { type: "END_TURN", playerId: P2 }));
    const refreshed = withTokens(withPhase(p1TurnAgain, "actions"), attackerId, CRANK_FUEL);
    const second = advance(refreshed, {
      type: "ATTACK",
      playerId: P1,
      attackerId,
      attackId: CRANK,
      targetId,
    });
    expect(second.ok).toBe(true);
  });

  it("refuses to attack outside the actions phase", () => {
    const state = withTokens(withPhase(newMatch(), "roll"), creatureIdAt(newMatch(), P1, 0), CRANK_FUEL);
    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: CRANK,
      targetId: creatureIdAt(state, P2, 0),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_PHASE");
  });

  it("refuses to attack a friendly creature", () => {
    const state = combatState(0, CRANK_FUEL);
    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: CRANK,
      targetId: creatureIdAt(state, P1, 1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });

  it("refuses to attack with a defeated creature", () => {
    const state = withDefeatedCreature(combatState(0, CRANK_FUEL), creatureIdAt(combatState(0, {}), P1, 0));
    const attackerId = creatureIdAt(state, P1, 0);
    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId,
      attackId: CRANK,
      targetId: creatureIdAt(state, P2, 0),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("CREATURE_DEFEATED");
  });

  it("prevents damage one point at a time and is spent doing so", () => {
    const state = withShields(combatState(0, CRANK_FUEL), creatureIdAt(combatState(0, {}), P2, 0), 1);
    const targetId = creatureIdAt(state, P2, 0);
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 0),
        attackId: CRANK,
        targetId,
      }),
    );
    expect(after.creatures[targetId]?.shields).toBe(1);
    expect(after.creatures[targetId]?.damage).toBe(2);
  });

  it("can absorb an attack outright, leaving the creature untouched", () => {
    const base = combatState(0, CRANK_FUEL);
    const targetId = creatureIdAt(base, P2, 0);
    const shielded = {
      ...base,
      creatures: {
        ...base.creatures,
        [targetId]: {
          ...base.creatures[targetId]!,
          attackPreventCount: 1,
        },
      },
    };
    const after = expectOk(
      advance(shielded, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(shielded, P1, 0),
        attackId: CRANK,
        targetId,
      }),
    );
    expect(after.creatures[targetId]?.damage).toBe(0);
  });

  it("survives the end of turn", () => {
    const state = withDamage(combatState(0, CRANK_FUEL), creatureIdAt(combatState(0, {}), P2, 0), 5);
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 0),
        attackId: CRANK,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );
    expect(after.creatures[creatureIdAt(after, P2, 0)]?.defeated).toBe(false);
  });

  it("stops a melee attack from reaching the back row", () => {
    const state = combatState(0, CRANK_FUEL);
    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: CRANK,
      targetId: creatureIdAt(state, P2, 2),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });

  it("opens the back row to melee once the frontline is gone", () => {
    const match = newMatch();
    let state = withPhase(match, "actions");
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 0));
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 1));
    state = withTokens(state, creatureIdAt(state, P1, 0), CRANK_FUEL);
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 0),
        attackId: CRANK,
        targetId: creatureIdAt(state, P2, 2),
      }),
    );
    expect(after.creatures[creatureIdAt(after, P2, 2)]?.damage).toBe(2);
  });

  it("defeats a creature whose damage reaches its life", () => {
    const state = withDamage(combatState(0, CRANK_FUEL), creatureIdAt(combatState(0, {}), P2, 0), 12);
    const targetId = creatureIdAt(state, P2, 0);
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 0),
        attackId: CRANK,
        targetId,
      }),
    );
    expect(after.creatures[targetId]?.defeated).toBe(true);
  });

  it("does not auto-finish when the opposing legendary falls", () => {
    const match = newMatch();
    let state = withPhase(match, "actions");
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 0));
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 1));
    const legendaryId = legendaryCreatureOf(state, P2)?.id;
    if (legendaryId === undefined) throw new Error("legendary");
    state = withDamage(state, legendaryId, 21);
    state = withTokens(state, creatureIdAt(state, P1, 2), DRIVE_SHAFT_FUEL);
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 2),
        attackId: DRIVE_SHAFT,
        targetId: legendaryId,
      }),
    );
    expect(after.creatures[legendaryId]?.defeated).toBe(true);
    expect(after.status).toBe("in-progress");
    expect(after.winner).toBeNull();
  });

  it("does not end the match when only non-legendaries fall", () => {
    const state = withDamage(combatState(2, DRIVE_SHAFT_FUEL), creatureIdAt(combatState(2, {}), P2, 0), 12);
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 2),
        attackId: DRIVE_SHAFT,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );
    expect(after.status).toBe("in-progress");
  });

  it("still allows actions after a legendary is defeated", () => {
    const match = newMatch();
    let state = withPhase(match, "actions");
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 0));
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 1));
    const legendaryId = legendaryCreatureOf(state, P2)?.id;
    if (legendaryId === undefined) throw new Error("legendary");
    state = withDamage(state, legendaryId, 21);
    state = withTokens(state, creatureIdAt(state, P1, 2), DRIVE_SHAFT_FUEL);
    state = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 2),
        attackId: DRIVE_SHAFT,
        targetId: legendaryId,
      }),
    );
    const after = expectOk(advance(state, { type: "END_TURN", playerId: P1 }));
    expect(after.status).toBe("in-progress");
  });
});

describe("Kindle follow-up", () => {
  it("heals the most damaged ally after striking", () => {
    const match = newMatch({
      players: [
        { id: P1, squad: [TEST_BODY_A, HEALER.id, TEST_LEGEND], deck: [] },
        { id: P2, squad: TEST_SQUAD, deck: [] },
      ],
    });
    const woundedId = creatureIdAt(match, P1, 0);
    let state = withDamage(withPhase(match, "actions"), woundedId, 2);
    const attackerId = creatureIdAt(state, P1, 1);
    state = withTokens(state, attackerId, KINDLE_FUEL);
    const afterAttack = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: HEAL_AFTER_STRIKE.id,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );
    let after = afterAttack;
    while (after.pendingDecision?.type === "choose-creature") {
      after = expectOk(
        advance(after, {
          type: "RESOLVE_CHOOSE_CREATURE",
          playerId: P1,
          creatureId: woundedId,
        }),
      );
    }
    expect(after.creatures[woundedId]?.damage).toBe(1);
  });
});
