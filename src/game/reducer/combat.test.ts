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

const SHIELD_STRIKE = asAttackId("attack-shield-strike");
const LIGHTLANCE = asAttackId("attack-lightlance");
const RUNEBLAST = asAttackId("attack-runeblast");

/**
 * Attacks are funded from the attacker's own absorbed tokens, so a combat
 * scenario begins by fuelling a creature rather than by filling the pool.
 */
function combatState(creatureIndex: number, tokens: AttributeTokens) {
  const state = withPhase(newMatch(), "combat");
  return withTokens(state, creatureIdAt(state, P1, creatureIndex), tokens);
}

describe("attacking", () => {
  it("damages the target when the attacker holds the required attributes", () => {
    const state = combatState(0, { martial: 1 });
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);

    const after = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: SHIELD_STRIKE, targetId }),
    );

    const target = after.creatures[targetId];
    if (target === undefined) throw new Error("expected the target");
    expect(target.damage).toBe(3);
    expect(currentLife(target)).toBe(7);
  });

  it("refuses an attack the creature has not absorbed the fuel for", () => {
    const state = combatState(0, { arcane: 1 });

    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: SHIELD_STRIKE,
      targetId: creatureIdAt(state, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ATTACK_NOT_FUELLED");
    expect(result.state).toBe(state);
  });

  it("cannot be funded from the shared symbol pool", () => {
    // The pool is full of exactly what the attack asks for, and it is still
    // not payment: only what the creature absorbed counts.
    const state = withPhase(newMatch(), "combat");

    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: SHIELD_STRIKE,
      targetId: creatureIdAt(state, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ATTACK_NOT_FUELLED");
  });

  it("burns the Martial Shield Strike discards", () => {
    const state = combatState(0, { martial: 1 });
    const attackerId = creatureIdAt(state, P1, 0);

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: SHIELD_STRIKE,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );

    expect(after.creatures[attackerId]?.attributeTokens).toEqual({});
    expect(eventTypes(after)).toContain("attribute-tokens-discarded");
  });

  it("burns only what the attack discards", () => {
    const state = combatState(2, { arcane: 1, wild: 1 });
    const attackerId = creatureIdAt(state, P1, 2);

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: RUNEBLAST,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );

    expect(after.creatures[attackerId]?.attributeTokens).toEqual({ wild: 1 });
    expect(eventTypes(after)).toContain("attribute-tokens-discarded");
  });

  it("cannot repeat a discarding attack until the fuel is replaced", () => {
    const state = combatState(2, { arcane: 1, wild: 1 });
    const attackerId = creatureIdAt(state, P1, 2);
    const targetId = creatureIdAt(state, P2, 0);
    const attack = { type: "ATTACK", playerId: P1, attackerId, attackId: RUNEBLAST, targetId } as const;

    const spent = expectOk(advance(state, attack));
    const nextTurn = {
      ...expectOk(advance(spent, { type: "END_TURN", playerId: P1 })),
      activePlayerId: P1,
      phase: "combat" as const,
    };

    const again = advance(nextTurn, attack);

    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error).toBe("ATTACK_NOT_FUELLED");
  });

  it("allows only one attack per creature per combat phase", () => {
    const state = combatState(0, { martial: 1 });
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);

    const once = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: SHIELD_STRIKE, targetId }),
    );
    const twice = advance(once, {
      type: "ATTACK",
      playerId: P1,
      attackerId,
      attackId: SHIELD_STRIKE,
      targetId,
    });

    expect(twice.ok).toBe(false);
    if (!twice.ok) expect(twice.error).toBe("ATTACK_ALREADY_USED");
  });

  it("lets a creature attack again on the following turn", () => {
    const state = combatState(0, { martial: 1 });
    const attackerId = creatureIdAt(state, P1, 0);

    const attacked = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: SHIELD_STRIKE,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );
    const nextTurn = expectOk(advance(attacked, { type: "END_TURN", playerId: P1 }));

    expect(nextTurn.creatures[attackerId]?.attacksUsedThisCombat).toBe(0);
  });

  it("refuses to attack outside the combat phase", () => {
    const base = withPhase(newMatch(), "engine");
    const state = withTokens(base, creatureIdAt(base, P1, 0), { martial: 1 });

    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: SHIELD_STRIKE,
      targetId: creatureIdAt(state, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_PHASE");
  });

  it("refuses to attack a friendly creature", () => {
    const state = combatState(0, { martial: 1 });

    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: SHIELD_STRIKE,
      targetId: creatureIdAt(state, P1, 1),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });

  it("refuses to attack with a defeated creature", () => {
    const state = combatState(0, { martial: 1 });
    const attackerId = creatureIdAt(state, P1, 0);

    const result = advance(withDefeatedCreature(state, attackerId), {
      type: "ATTACK",
      playerId: P1,
      attackerId,
      attackId: SHIELD_STRIKE,
      targetId: creatureIdAt(state, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("CREATURE_DEFEATED");
  });
});

describe("shields", () => {
  it("prevents damage one point at a time and is spent doing so", () => {
    const base = combatState(0, { martial: 1 });
    const targetId = creatureIdAt(base, P2, 0);
    const state = withShields(base, targetId, 1);

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 0),
        attackId: SHIELD_STRIKE,
        targetId,
      }),
    );

    expect(after.creatures[targetId]?.damage).toBe(2);
    expect(after.creatures[targetId]?.shields).toBe(0);
    expect(eventTypes(after)).toContain("damage-prevented");
  });

  it("can absorb an attack outright, leaving the creature untouched", () => {
    const base = combatState(0, { martial: 1 });
    const targetId = creatureIdAt(base, P2, 0);
    const state = withShields(base, targetId, 4);

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 0),
        attackId: SHIELD_STRIKE,
        targetId,
      }),
    );

    expect(after.creatures[targetId]?.damage).toBe(0);
    expect(after.creatures[targetId]?.shields).toBe(1);
    expect(eventTypes(after)).not.toContain("damage-dealt");
  });

  it("survives the end of turn", () => {
    const base = withPhase(newMatch(), "combat");
    const creatureId = creatureIdAt(base, P1, 0);

    const nextTurn = expectOk(
      advance(withShields(base, creatureId, 2), { type: "END_TURN", playerId: P1 }),
    );

    expect(nextTurn.creatures[creatureId]?.shields).toBe(2);
  });
});

describe("frontline protection", () => {
  it("stops a melee attack from reaching the back row", () => {
    const state = combatState(0, { martial: 1 });

    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: SHIELD_STRIKE,
      targetId: creatureIdAt(state, P2, 2),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });

  it("lets a Range attack ignore the frontline", () => {
    const state = combatState(1, { luminar: 1 });
    const backRowId = creatureIdAt(state, P2, 2);

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 1),
        attackId: LIGHTLANCE,
        targetId: backRowId,
      }),
    );

    expect(after.creatures[backRowId]?.damage).toBe(2);
  });

  it("opens the back row to melee once the frontline is gone", () => {
    const base = combatState(0, { martial: 1 });
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
        attackId: SHIELD_STRIKE,
        targetId: backRowId,
      }),
    );

    expect(after.creatures[backRowId]?.damage).toBe(3);
  });
});

describe("creature defeat and victory", () => {
  it("defeats a creature whose damage reaches its life", () => {
    const state = combatState(0, { martial: 1 });
    const targetId = creatureIdAt(state, P2, 0);
    const nearlyDead = withDamage(state, targetId, 7);

    const after = expectOk(
      advance(nearlyDead, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 0),
        attackId: SHIELD_STRIKE,
        targetId,
      }),
    );

    expect(after.creatures[targetId]?.defeated).toBe(true);
    expect(eventTypes(after)).toContain("creature-defeated");
    expect(after.status).toBe("in-progress");
  });

  it("ends the match when the last opposing creature falls", () => {
    const base = combatState(2, { arcane: 1, wild: 1 });
    const [front, mid, back] = [0, 1, 2].map((index) => creatureIdAt(base, P2, index));
    if (front === undefined || mid === undefined || back === undefined) {
      throw new Error("expected three enemy creatures");
    }

    const almostWon = withDamage(
      withDefeatedCreature(withDefeatedCreature(base, front), mid),
      back,
      1,
    );

    const after = expectOk(
      advance(almostWon, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(base, P1, 2),
        attackId: RUNEBLAST,
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
