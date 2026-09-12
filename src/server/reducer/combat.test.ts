import { describe, expect, it } from "vitest";
import { currentLife, legendaryCreatureOf } from "../rules/creatures.js";
import { attackIsUnlocked, showingAttributeCounts } from "../rules/attackUnlock.js";
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
  eventTypes,
  newMatch,
  P1,
  P2,
  withDamage,
  withDefeatedCreature,
  withPhase,
  withShields,
  withShowingFaces,
  withAttributePool,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";
import { CRANK, DRIVE_SHAFT, RETOOL, VIGIL } from "../testing/tempoCatalogue.js";

const HEAL_AFTER_STRIKE = testAttack({
  id: "attack-test-heal-after-strike",
  unlock: { luminar: 1 },
  followUpEffects: [{ type: "heal", amount: 1, target: { kind: "choose-ally" } }],
});
const HEALER = testCreature({
  id: "creature-test-healer",
  attributes: ["luminar"],
  attacks: [HEAL_AFTER_STRIKE],
});

function combatState(_creatureIndex: number, showing: readonly ("mechanical" | "luminar" | "martial" | "shield")[] = ["mechanical"]) {
  const state = withPhase(newMatch(), "actions");
  return withShowingFaces(state, P1, showing);
}

describe("attacking", () => {
  it("damages the target when the owner's showing faces meet Unlock", () => {
    const state = combatState(0);
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

  it("refuses an attack when showing faces do not meet Unlock", () => {
    const state = combatState(0, ["luminar"]);

    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: CRANK,
      targetId: creatureIdAt(state, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ATTACK_NOT_UNLOCKED");
    expect(result.state).toBe(state);
  });

  it("does not unlock from the attribute pile or the turn pool", () => {
    let state = withPhase(newMatch(), "actions");
    state = withAttributePool(state, P1, { mechanical: 4, luminar: 4 });

    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: CRANK,
      targetId: creatureIdAt(state, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ATTACK_NOT_UNLOCKED");
  });

  it("does not burn pile tokens when Retool is declared", () => {
    const state = withAttributePool(combatState(0, ["mechanical", "mechanical"]), P1, {
      mechanical: 3,
      luminar: 1,
    });
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

    expect(after.players[P1]?.attributePool).toEqual({ mechanical: 3, luminar: 1 });
    expect(eventTypes(after)).not.toContain("attribute-tokens-discarded");
  });

  it("does not burn pile tokens when Drive Shaft is declared", () => {
    const state = withAttributePool(combatState(2), P1, { mechanical: 2, luminar: 2 });
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

    expect(after.players[P1]?.attributePool).toEqual({ mechanical: 2, luminar: 2 });
    expect(eventTypes(after)).not.toContain("attribute-tokens-discarded");
  });

  it("still needs every named showing attribute on a dual Unlock", () => {
    const state = combatState(1, ["mechanical"]);
    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 1),
      attackId: VIGIL,
      targetId: creatureIdAt(state, P2, 0),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ATTACK_NOT_UNLOCKED");
  });

  it("allows only one attack per creature per combat phase", () => {
    const state = combatState(0, ["mechanical", "mechanical"]);
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

  it("lets a Frenzy extra attack use the current showing faces", () => {
    const state = combatState(0, ["mechanical", "mechanical"]);
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);
    const first = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: CRANK, targetId }),
    );
    const extra = {
      ...first,
      creatures: {
        ...first.creatures,
        [attackerId]: { ...first.creatures[attackerId]!, extraAttacksThisTurn: 1 },
      },
    };
    const closed = withShowingFaces(extra, P1, ["luminar", "luminar"]);
    const denied = advance(closed, {
      type: "ATTACK",
      playerId: P1,
      attackerId,
      attackId: CRANK,
      targetId,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error).toBe("ATTACK_NOT_UNLOCKED");

    const stillOpen = withShowingFaces(extra, P1, ["mechanical"]);
    const second = expectOk(
      advance(stillOpen, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: CRANK,
        targetId,
      }),
    );
    expect(second.creatures[targetId]?.damage).toBe(4);
  });

  it("lets a creature attack again on the following turn", () => {
    const state = combatState(0);
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);
    const first = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: CRANK, targetId }),
    );
    const p2Turn = expectOk(advance(first, { type: "END_TURN", playerId: P1 }));
    const p1TurnAgain = expectOk(advance(p2Turn, { type: "END_TURN", playerId: P2 }));
    const refreshed = withShowingFaces(withPhase(p1TurnAgain, "actions"), P1, ["mechanical"]);
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
    const state = withShowingFaces(withPhase(newMatch(), "roll"), P1, ["mechanical"]);
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
    const state = combatState(0);
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
    const state = withDefeatedCreature(combatState(0), creatureIdAt(combatState(0), P1, 0));
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
    const state = withShields(combatState(0), creatureIdAt(combatState(0), P2, 0), 1);
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
    expect(after.creatures[targetId]?.shields).toBe(0);
    expect(after.creatures[targetId]?.damage).toBe(1);
  });

  it("can absorb an attack outright, leaving the creature untouched", () => {
    const base = combatState(0);
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
    const state = withDamage(combatState(0), creatureIdAt(combatState(0), P2, 0), 5);
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
    const state = combatState(0);
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
    state = withShowingFaces(state, P1, ["mechanical"]);
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
    const state = withDamage(combatState(0), creatureIdAt(combatState(0), P2, 0), 12);
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

  it("ends the match when the opposing legendary falls", () => {
    const match = newMatch();
    let state = withPhase(match, "actions");
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 0));
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 1));
    const legendaryId = legendaryCreatureOf(state, P2)?.id;
    if (legendaryId === undefined) throw new Error("legendary");
    state = withDamage(state, legendaryId, 21);
    state = withShowingFaces(state, P1, ["mechanical"]);
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 2),
        attackId: DRIVE_SHAFT,
        targetId: legendaryId,
      }),
    );
    expect(after.status).toBe("finished");
    expect(after.winner).toBe(P1);
  });

  it("does not end the match when only non-legendaries fall", () => {
    const state = withDamage(combatState(2), creatureIdAt(combatState(2), P2, 0), 12);
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

  it("refuses every action once the match is finished", () => {
    const match = newMatch();
    let state = withPhase(match, "actions");
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 0));
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 1));
    const legendaryId = legendaryCreatureOf(state, P2)?.id;
    if (legendaryId === undefined) throw new Error("legendary");
    state = withDamage(state, legendaryId, 21);
    state = withShowingFaces(state, P1, ["mechanical"]);
    state = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 2),
        attackId: DRIVE_SHAFT,
        targetId: legendaryId,
      }),
    );
    const denied = advance(state, { type: "END_TURN", playerId: P1 });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error).toBe("GAME_FINISHED");
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
    state = withShowingFaces(state, P1, ["luminar"]);
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

describe("showing-face queries at the attack command", () => {
  it("counts one Mechanical face for Crank", () => {
    const state = combatState(0, ["mechanical", "shield"]);
    expect(showingAttributeCounts(state, P1)).toEqual({ mechanical: 1 });
    const attacker = state.creatures[creatureIdAt(state, P1, 0)];
    if (attacker === undefined) throw new Error("attacker");
    expect(attackIsUnlocked(state, P1, { unlock: { mechanical: 1 } })).toBe(true);
    expect(attackIsUnlocked(state, P1, { unlock: { mechanical: 2 } })).toBe(false);
  });
});
