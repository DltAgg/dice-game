import { describe, expect, it } from "vitest";
import { TEMPO_SQUAD } from "../content/creatures.js";
import type { AttributeTokens } from "../model/symbols.js";
import { currentLife, legendaryCreatureOf } from "../rules/creatures.js";
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
import { CRANK, DRIVE_SHAFT, KINDLE, RETOOL, VIGIL } from "../testing/tempoCatalogue.js";

function combatState(creatureIndex: number, tokens: AttributeTokens) {
  const state = withPhase(newMatch(), "actions");
  return withTokens(state, creatureIdAt(state, P1, creatureIndex), tokens);
}

describe("attacking", () => {
  it("damages the target when the attacker holds the discarded attributes", () => {
    const state = combatState(0, { mechanical: 1 });
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

  it("refuses an attack the creature has not absorbed the fuel for", () => {
    const state = combatState(0, { luminar: 1 });

    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 0),
      attackId: CRANK,
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
      attackId: CRANK,
      targetId: creatureIdAt(state, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ATTACK_NOT_FUELLED");
  });

  it("burns Spend tokens on Retool without emptying the Requires gate", () => {
    const state = combatState(0, { mechanical: 1, luminar: 1 });
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

    expect(after.players[P1]?.attributePool).toEqual({ luminar: 1 });
    expect(eventTypes(after)).toContain("attribute-tokens-discarded");
  });

  it("burns discarded tokens when Drive Shaft is declared", () => {
    const state = combatState(2, { mechanical: 1 });
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

    expect(after.players[P1]?.attributePool).toEqual({});
    expect(eventTypes(after)).toContain("attribute-tokens-discarded");
  });

  it("still requires every attribute listed on a multi-cost attack", () => {
    const state = combatState(1, { mechanical: 1 });
    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId: creatureIdAt(state, P1, 1),
      attackId: VIGIL,
      targetId: creatureIdAt(state, P2, 0),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ATTACK_NOT_FUELLED");
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
    const state = combatState(0, { mechanical: 1 });
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);
    const first = expectOk(
      advance(state, { type: "ATTACK", playerId: P1, attackerId, attackId: CRANK, targetId }),
    );
    const p2Turn = expectOk(advance(first, { type: "END_TURN", playerId: P1 }));
    const p1TurnAgain = expectOk(advance(p2Turn, { type: "END_TURN", playerId: P2 }));
    const refreshed = withTokens(withPhase(p1TurnAgain, "actions"), attackerId, { mechanical: 1 });
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
    const state = withTokens(withPhase(newMatch(), "roll"), creatureIdAt(newMatch(), P1, 0), {
      mechanical: 1,
    });
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
    const state = combatState(0, { mechanical: 1 });
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
    const state = withDefeatedCreature(combatState(0, { mechanical: 1 }), creatureIdAt(combatState(0, {}), P1, 0));
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
    const state = withShields(combatState(0, { mechanical: 1 }), creatureIdAt(combatState(0, {}), P2, 0), 1);
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
    const base = combatState(0, { mechanical: 1 });
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
    const state = withDamage(combatState(0, { mechanical: 1 }), creatureIdAt(combatState(0, {}), P2, 0), 5);
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
    const state = combatState(0, { mechanical: 1 });
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
    const match = newMatch({
      players: [
        { id: P1, squad: TEMPO_SQUAD, deck: [] },
        { id: P2, squad: TEMPO_SQUAD, deck: [] },
      ],
    });
    let state = withPhase(match, "actions");
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 0));
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 1));
    state = withTokens(state, creatureIdAt(state, P1, 0), { mechanical: 1 });
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
    const state = withDamage(combatState(0, { mechanical: 1 }), creatureIdAt(combatState(0, {}), P2, 0), 12);
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
    const match = newMatch({
      players: [
        { id: P1, squad: TEMPO_SQUAD, deck: [] },
        { id: P2, squad: TEMPO_SQUAD, deck: [] },
      ],
    });
    let state = withPhase(match, "actions");
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 0));
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 1));
    const legendaryId = legendaryCreatureOf(state, P2)?.id;
    if (legendaryId === undefined) throw new Error("legendary");
    state = withDamage(state, legendaryId, 21);
    state = withTokens(state, creatureIdAt(state, P1, 2), { mechanical: 1 });
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
    const state = withDamage(combatState(2, { mechanical: 1 }), creatureIdAt(combatState(2, {}), P2, 0), 12);
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
    const match = newMatch({
      players: [
        { id: P1, squad: TEMPO_SQUAD, deck: [] },
        { id: P2, squad: TEMPO_SQUAD, deck: [] },
      ],
    });
    let state = withPhase(match, "actions");
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 0));
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 1));
    const legendaryId = legendaryCreatureOf(state, P2)?.id;
    if (legendaryId === undefined) throw new Error("legendary");
    state = withDamage(state, legendaryId, 21);
    state = withTokens(state, creatureIdAt(state, P1, 2), { mechanical: 1 });
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
    const woundedId = creatureIdAt(newMatch(), P1, 0);
    let state = withDamage(withPhase(newMatch(), "actions"), woundedId, 2);
    const attackerId = creatureIdAt(state, P1, 1);
    state = withTokens(state, attackerId, { luminar: 1 });
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: KINDLE,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );
    expect(after.creatures[woundedId]?.damage).toBe(1);
  });
});
