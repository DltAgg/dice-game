import { describe, expect, it } from "vitest";
import { POUNCE } from "../content/cards.js";
import { GARUDA, MINOTAUR, WARLORD_IRONHOOF } from "../content/creatures.js";
import { asAttackId } from "../model/ids.js";
import type { AttributeTokens } from "../model/symbols.js";
import { currentLife, legendaryCreatureOf } from "../rules/creatures.js";
import {
  creatureIdAt,
  expectOk,
  eventTypes,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withDamage,
  withDefeatedCreature,
  withHand,
  withAttributePool,
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

const RANGE_SQUAD = [MINOTAUR, GARUDA, WARLORD_IRONHOOF] as const;

/**
 * Attacks are funded from the attacker's own absorbed tokens, so a combat
 * scenario begins by fuelling a creature rather than by filling the pool.
 */
function combatState(creatureIndex: number, tokens: AttributeTokens) {
  const state = withPhase(newMatch(), "actions");
  return withTokens(state, creatureIdAt(state, P1, creatureIndex), tokens);
}

/** Aggro builtin no longer includes Garuda — Range tests use a legal squad with Dive. */
function rangeCombatState() {
  const match = newMatch({
    players: [
      { id: P1, squad: RANGE_SQUAD, deck: [] },
      { id: P2, squad: RANGE_SQUAD, deck: [] },
    ],
  });
  const state = withPhase(match, "actions");
  return withTokens(state, creatureIdAt(state, P1, 1), { wild: 1 });
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

  it("Frenzy lets a creature declare an extra attack this turn", () => {
    const base = combatState(0, { martial: 2 });
    const attackerId = creatureIdAt(base, P1, 0);
    const targetId = creatureIdAt(base, P2, 0);
    const frenzied = {
      ...base,
      creatures: {
        ...base.creatures,
        [attackerId]: {
          ...base.creatures[attackerId]!,
          extraAttacksThisTurn: 1,
        },
      },
    };

    const once = expectOk(
      advance(frenzied, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: HEAVY_AXE,
        targetId,
      }),
    );
    expect(once.creatures[attackerId]?.attacksUsedThisCombat).toBe(1);
    const twice = expectOk(
      advance(once, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: HEAVY_AXE,
        targetId,
      }),
    );
    expect(twice.creatures[attackerId]?.attacksUsedThisCombat).toBe(2);
    const thrice = advance(twice, {
      type: "ATTACK",
      playerId: P1,
      attackerId,
      attackId: HEAVY_AXE,
      targetId,
    });
    expect(thrice.ok).toBe(false);
    if (!thrice.ok) expect(thrice.error).toBe("ATTACK_ALREADY_USED");
  });

  it("clears Frenzy allowance at end of turn", () => {
    const base = combatState(0, { martial: 1 });
    const attackerId = creatureIdAt(base, P1, 0);
    const frenzied = {
      ...base,
      creatures: {
        ...base.creatures,
        [attackerId]: {
          ...base.creatures[attackerId]!,
          extraAttacksThisTurn: 1,
        },
      },
    };
    const nextTurn = expectOk(advance(frenzied, { type: "END_TURN", playerId: P1 }));
    expect(nextTurn.creatures[attackerId]?.extraAttacksThisTurn).toBe(0);
  });

  it("Pounce Spends Wild and grants Frenzy", () => {
    let state = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [POUNCE]),
      P1,
      { wild: 3 },
    );
    const allyId = creatureIdAt(state, P1, 0);
    state = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    expect(state.players[P1]?.attributePool.wild ?? 0).toBe(0);
    expect(state.pendingDecision?.type).toBe("choose-creature");
    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: allyId,
      }),
    );
    expect(state.creatures[allyId]?.extraAttacksThisTurn).toBe(1);
    expect(eventTypes(state)).toContain("extra-attacks-granted");
  });

  it("Coordinated Hunt grants Frenzy so Varcolac may attack again", () => {
    const state = combatState(1, { wild: 2, martial: 1 });
    const attackerId = creatureIdAt(state, P1, 1);
    const targetId = creatureIdAt(state, P2, 0);

    const afterHunt = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: COORDINATED_HUNT,
        targetId,
      }),
    );
    expect(afterHunt.creatures[attackerId]?.extraAttacksThisTurn).toBe(1);
    expect(afterHunt.creatures[attackerId]?.nextAttackBonus).toBe(0);
    expect(afterHunt.creatures[targetId]?.damage).toBe(4);

    const afterCharge = expectOk(
      advance(afterHunt, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: CHARGE,
        targetId,
      }),
    );
    expect(afterCharge.creatures[attackerId]?.attacksUsedThisCombat).toBe(2);
    expect(afterCharge.creatures[targetId]?.damage).toBe(6);
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
    const state = rangeCombatState();
    const backRowId = creatureIdAt(state, P2, 2);

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 1),
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

  it("ends the match when the opposing legendary falls", () => {
    const base = rangeCombatState();
    const legendary = legendaryCreatureOf(base, P2);
    if (legendary === undefined) throw new Error("expected P2 legendary");
    // Ironhoof Warlord has 23 life; Dive deals 2 through Range while frontline lives.
    const almostWon = withDamage(base, legendary.id, 21);

    const after = expectOk(
      advance(almostWon, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(base, P1, 1),
        attackId: DIVE,
        targetId: legendary.id,
      }),
    );

    expect(
      Object.values(after.creatures).filter(
        (creature) => creature.ownerId === P2 && !creature.defeated && creature.id !== legendary.id,
      ),
    ).not.toHaveLength(0);
    expect(after.status).toBe("finished");
    expect(after.winner).toBe(P1);
    expect(eventTypes(after)).toContain("match-finished");
  });

  it("does not end the match when only non-legendaries fall", () => {
    const state = combatState(0, { martial: 2 });
    const legendary = legendaryCreatureOf(state, P2);
    if (legendary === undefined) throw new Error("expected P2 legendary");
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
    expect(after.creatures[legendary.id]?.defeated).toBe(false);
    expect(after.status).toBe("in-progress");
    expect(after.winner).toBeNull();
  });

  it("refuses every action once the match is finished", () => {
    const finished = { ...newMatch(), status: "finished" as const, winner: P1 };

    const result = advance(finished, { type: "ROLL_DICE", playerId: P1 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("GAME_FINISHED");
    expect(result.state).toBe(finished);
  });
});

