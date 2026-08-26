import { describe, expect, it } from "vitest";
import { asAttackId } from "../model/ids.js";
import type { AttributeTokens } from "../model/symbols.js";
import { currentLife } from "../rules/creatures.js";
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
  withTokens,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const HEAVY_AXE = asAttackId("attack-minotaur-heavy-axe");
const WAR_CHARGE = asAttackId("attack-minotaur-war-charge");
const DIVE = asAttackId("attack-garuda-dive");
const CHARGE = asAttackId("attack-varcolac-charge");
const COORDINATED_HUNT = asAttackId("attack-varcolac-coordinated-hunt");

/**
 * Attacks are funded from the attacker's own absorbed tokens, so a combat
 * scenario begins by fuelling a creature rather than by filling the pool.
 */
function combatState(creatureIndex: number, tokens: AttributeTokens) {
  const state = withPhase(newMatch(), "actions");
  return withTokens(state, creatureIdAt(state, P1, creatureIndex), tokens);
}

describe("attacking", () => {
  it("damages the target when the attacker holds the discarded attributes", () => {
    const state = combatState(0, { martial: 1 });
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);

    const after = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: HEAVY_AXE, targetId }),
    );

    const target = after.creatures[targetId];
    if (target === undefined) throw new Error("expected the target");
    expect(target.damage).toBe(3);
    // War Minotaur starts at 17 life.
    expect(currentLife(target)).toBe(14);
  });

  it("refuses an attack the creature has not absorbed the fuel for", () => {
    const state = combatState(0, { arcane: 1 });

    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: HEAVY_AXE,
      targetId: creatureIdAt(state, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ATTACK_NOT_FUELLED");
    expect(result.state).toBe(state);
  });

  it("cannot be funded from the shared symbol pool", () => {
    const state = withPhase(newMatch(), "actions");

    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: HEAVY_AXE,
      targetId: creatureIdAt(state, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ATTACK_NOT_FUELLED");
  });

  it("burns Spend tokens on War Charge without emptying the Requires gate", () => {
    const state = combatState(0, { martial: 1, wild: 1 });
    const attackerId = creatureIdAt(state, P1, 0);

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: WAR_CHARGE,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );

    expect(after.players[P1]?.attributePool).toEqual({ wild: 1 });
    expect(eventTypes(after)).toContain("attribute-tokens-discarded");
  });

  it("burns discarded tokens when Heavy Axe is declared", () => {
    const state = combatState(0, { martial: 1 });
    const attackerId = creatureIdAt(state, P1, 0);

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: HEAVY_AXE,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );

    expect(after.players[P1]?.attributePool).toEqual({});
    expect(eventTypes(after)).toContain("attribute-tokens-discarded");
  });

  it("still requires every attribute listed on a multi-cost attack", () => {
    const state = combatState(1, { wild: 1 });

    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 1),
      attackId: COORDINATED_HUNT,
      targetId: creatureIdAt(state, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ATTACK_NOT_FUELLED");
  });

  it("allows only one attack per creature per combat phase", () => {
    const state = combatState(0, { martial: 3 });
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);

    const once = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: HEAVY_AXE, targetId }),
    );
    const twice = advance(once, {
      type: "ATTACK",
      playerId: P1,
      attackerId,
      attackId: HEAVY_AXE,
      targetId,
    });

    expect(twice.ok).toBe(false);
    if (!twice.ok) expect(twice.error).toBe("ATTACK_ALREADY_USED");
  });

  it("lets a creature attack again on the following turn", () => {
    const state = combatState(0, { martial: 2 });
    const attackerId = creatureIdAt(state, P1, 0);

    const attacked = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: HEAVY_AXE,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );
    const nextTurn = expectOk(advance(attacked, { type: "END_TURN", playerId: P1 }));

    expect(nextTurn.creatures[attackerId]?.attacksUsedThisCombat).toBe(0);
  });

  it("refuses to attack outside the actions phase", () => {
    const base = withPhase(newMatch(), "roll");
    const state = withTokens(base, creatureIdAt(base, P1, 0), { martial: 2 });

    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: HEAVY_AXE,
      targetId: creatureIdAt(state, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_PHASE");
  });

  it("refuses to attack a friendly creature", () => {
    const state = combatState(0, { martial: 2 });

    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: HEAVY_AXE,
      targetId: creatureIdAt(state, P1, 1),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });

  it("refuses to attack with a defeated creature", () => {
    const state = combatState(0, { martial: 2 });
    const attackerId = creatureIdAt(state, P1, 0);

    const result = advance(withDefeatedCreature(state, attackerId), {
      type: "ATTACK",
      playerId: P1,
      attackerId,
      attackId: HEAVY_AXE,
      targetId: creatureIdAt(state, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("CREATURE_DEFEATED");
  });
});

describe("shields", () => {
  it("prevents damage one point at a time and is spent doing so", () => {
    const base = combatState(1, { wild: 1 });
    const targetId = creatureIdAt(base, P2, 0);
    const state = withShields(base, targetId, 1);

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 1),
        attackId: CHARGE,
        targetId,
      }),
    );

    expect(after.creatures[targetId]?.damage).toBe(1);
    expect(after.creatures[targetId]?.shields).toBe(0);
    expect(eventTypes(after)).toContain("damage-prevented");
  });

  it("can absorb an attack outright, leaving the creature untouched", () => {
    const base = combatState(1, { wild: 1 });
    const targetId = creatureIdAt(base, P2, 0);
    const state = withShields(base, targetId, 3);

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 1),
        attackId: CHARGE,
        targetId,
      }),
    );

    expect(after.creatures[targetId]?.damage).toBe(0);
    expect(after.creatures[targetId]?.shields).toBe(1);
    expect(eventTypes(after)).not.toContain("damage-dealt");
  });

  it("survives the end of turn", () => {
    const base = withPhase(newMatch(), "actions");
    const creatureId = creatureIdAt(base, P1, 0);

    const nextTurn = expectOk(
      advance(withShields(base, creatureId, 2), { type: "END_TURN", playerId: P1 }),
    );

    expect(nextTurn.creatures[creatureId]?.shields).toBe(2);
  });
});

describe("frontline protection", () => {
  it("stops a melee attack from reaching the back row", () => {
    const state = combatState(0, { martial: 2 });

    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: HEAVY_AXE,
      targetId: creatureIdAt(state, P2, 2),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });

  it("lets a Range attack ignore the frontline", () => {
    const state = combatState(2, { wild: 1 });
    const backRowId = creatureIdAt(state, P2, 2);

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 2),
        attackId: DIVE,
        targetId: backRowId,
      }),
    );

    expect(after.creatures[backRowId]?.damage).toBe(2);
  });

  it("opens the back row to melee once the frontline is gone", () => {
    const base = combatState(0, { martial: 2 });
    const cleared = withDefeatedCreature(
      withDefeatedCreature(base, creatureIdAt(base, P2, 0)),
      creatureIdAt(base, P2, 1),
    );
    const backRowId = creatureIdAt(cleared, P2, 2);

    const after = expectOk(
      advance(cleared, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(cleared, P1, 0),
        attackId: HEAVY_AXE,
        targetId: backRowId,
      }),
    );

    expect(after.creatures[backRowId]?.damage).toBe(3);
  });
});

describe("creature defeat and victory", () => {
  it("defeats a creature whose damage reaches its life", () => {
    const state = combatState(0, { martial: 2 });
    const targetId = creatureIdAt(state, P2, 0);
    // War Minotaur has 17 life; 14 prior + Heavy Axe 3 = lethal.
    const nearlyDead = withDamage(state, targetId, 14);

    const after = expectOk(
      advance(nearlyDead, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 0),
        attackId: HEAVY_AXE,
        targetId,
      }),
    );

    expect(after.creatures[targetId]?.defeated).toBe(true);
    expect(eventTypes(after)).toContain("creature-defeated");
    expect(after.status).toBe("in-progress");
  });

  it("ends the match when the last opposing creature falls", () => {
    const base = combatState(1, { wild: 1, martial: 1 });
    const [front, mid, back] = [0, 1, 2].map((index) => creatureIdAt(base, P2, index));
    if (front === undefined || mid === undefined || back === undefined) {
      throw new Error("expected three enemy creatures");
    }

    // Garuda (back) has 11 life; Coordinated Hunt deals 4.
    const almostWon = withDamage(
      withDefeatedCreature(withDefeatedCreature(base, front), mid),
      back,
      7,
    );

    const after = expectOk(
      advance(almostWon, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(base, P1, 1),
        attackId: COORDINATED_HUNT,
        targetId: back,
      }),
    );

    expect(after.status).toBe("finished");
    expect(after.winner).toBe(P1);
    expect(eventTypes(after)).toContain("match-finished");
  });

  it("refuses every action once the match is finished", () => {
    const finished = { ...newMatch(), status: "finished" as const, winner: P1 };

    const result = advance(finished, { type: "ROLL_DICE", playerId: P1 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("GAME_FINISHED");
    expect(result.state).toBe(finished);
  });
});
