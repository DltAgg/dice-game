import { describe, expect, it } from "vitest";
import type { SymbolInstance } from "../model/symbols.js";
import { usableSymbols } from "../rules/symbols.js";
import {
  creatureIdAt,
  expectOk,
  newMatch,
  P1,
  P2,
  withDefeatedCreature,
  withPhase,
  withSymbols,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";
import { CRANK } from "../testing/tempoCatalogue.js";

const roll = { type: "ROLL_DICE", playerId: P1 } as const;

function afterRoll(): { state: ReturnType<typeof newMatch>; symbols: SymbolInstance[] } {
  const state = expectOk(advance(newMatch(), roll));
  return { state, symbols: Object.values(state.symbols) };
}

describe("symbol absorb", () => {
  it("marks an attribute symbol absorbed without a creature target", () => {
    const state = withSymbols(withPhase(newMatch(), "actions"), P1, ["martial"]);
    const pip = Object.values(state.symbols)[0]!;
    const absorbed = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: pip.id }),
    );
    expect(absorbed.symbols[pip.id]?.status).toBe("absorbed");
    expect(absorbed.symbols[pip.id]?.absorbedByCreatureId).toBeNull();
    expect(usableSymbols(absorbed, P1).some((s) => s.id === pip.id)).toBe(false);
  });

  it("marks attribute absorbed even if a creatureId is still supplied", () => {
    const state = withSymbols(withPhase(newMatch(), "actions"), P1, ["martial"]);
    const pip = Object.values(state.symbols)[0]!;
    const creatureId = creatureIdAt(state, P1, 0);
    const absorbed = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId,
        symbolId: pip.id,
      }),
    );
    expect(absorbed.symbols[pip.id]?.status).toBe("absorbed");
  });

  it("grants Shield immediately onto a creature", () => {
    const state = withSymbols(withPhase(newMatch(), "actions"), P1, ["shield"]);
    const pip = Object.values(state.symbols)[0]!;
    const creatureId = creatureIdAt(state, P1, 0);
    const absorbed = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId,
        symbolId: pip.id,
      }),
    );
    expect(absorbed.creatures[creatureId]?.shields).toBe(1);
  });

  it("refuses Shield absorb without a creature", () => {
    const state = withSymbols(withPhase(newMatch(), "actions"), P1, ["shield"]);
    const pip = Object.values(state.symbols)[0]!;
    const result = advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: pip.id });
    expect(result.ok).toBe(false);
  });

  it("refuses Shield onto a defeated creature", () => {
    let state = withSymbols(withPhase(newMatch(), "actions"), P1, ["shield"]);
    const creatureId = creatureIdAt(state, P1, 0);
    state = withDefeatedCreature(state, creatureId);
    const pip = Object.values(state.symbols)[0]!;
    const result = advance(state, {
      type: "ABSORB_SYMBOL",
      playerId: P1,
      creatureId,
      symbolId: pip.id,
    });
    expect(result.ok).toBe(false);
  });

  it("clears unabsorbed symbols on END_TURN", () => {
    let state = withSymbols(withPhase(newMatch(), "actions"), P1, ["martial", "wild"]);
    const [martial, wild] = Object.values(state.symbols);
    if (martial === undefined || wild === undefined) throw new Error("symbols");
    state = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: martial.id }),
    );
    expect(state.symbols[martial.id]?.status).toBe("absorbed");
    state = expectOk(advance(state, { type: "END_TURN", playerId: P1 }));
    expect(state.symbols[wild.id]).toBeUndefined();
  });

  it("allows an attack without creature fuel after pile removal", () => {
    const state = withPhase(newMatch(), "actions");
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);
    const result = advance(state, {
      type: "ATTACK",
      playerId: P1,
      attackerId,
      attackId: CRANK,
      targetId,
    });
    expect(result.ok).toBe(true);
  });

  it("auto-absorbs rolled attributes without naming a creature", () => {
    const { state, symbols } = afterRoll();
    const attributes = symbols.filter((s) => s.symbol !== "shield" && s.ownerId === P1);
    expect(attributes.length).toBeGreaterThan(0);
    for (const pip of attributes) {
      expect(pip.status).toBe("absorbed");
      expect(pip.absorbedByCreatureId).toBeNull();
    }
    expect(Object.keys(state.symbols).length).toBeGreaterThanOrEqual(attributes.length);
  });
});
