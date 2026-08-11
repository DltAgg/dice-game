import { describe, expect, it } from "vitest";
import { SHIELD, type SymbolInstance } from "../model/symbols.js";
import { usableSymbols } from "../rules/symbols.js";
import {
  creatureIdAt,
  expectOk,
  newMatch,
  P1,
  P2,
  play,
  withActivePlayer,
  withDefeatedCreature,
  withPhase,
  withSymbols,
} from "../testing/scenario.js";
import { advance } from "./reduce.js";

const roll = { type: "ROLL_DICE", playerId: P1 } as const;
const advancePhase = { type: "ADVANCE_PHASE", playerId: P1 } as const;

/** Rolls, then hands back the state plus the symbols now awaiting a decision. */
function afterRoll(): { state: ReturnType<typeof newMatch>; symbols: SymbolInstance[] } {
  const state = expectOk(advance(newMatch(), roll));
  return { state, symbols: Object.values(state.symbols) };
}

describe("creature absorption", () => {
  it("removes the absorbed symbol from engine resolution", () => {
    const { state, symbols } = afterRoll();
    const [first] = symbols;
    if (first === undefined) throw new Error("expected a rolled symbol");
    const creatureId = creatureIdAt(state, P1, 0);

    const absorbed = play(
      state,
      { type: "ABSORB_SYMBOL", playerId: P1, creatureId, symbolId: first.id },
      advancePhase,
    );

    expect(absorbed.symbols[first.id]?.status).toBe("absorbed");
    expect(usableSymbols(absorbed, P1).map((symbol) => symbol.id)).not.toContain(first.id);
  });

  it("leaves unabsorbed symbols available to the engine", () => {
    const { state, symbols } = afterRoll();
    const [first, second] = symbols;
    if (first === undefined || second === undefined) throw new Error("expected two symbols");
    const creatureId = creatureIdAt(state, P1, 0);

    const engine = play(
      state,
      { type: "ABSORB_SYMBOL", playerId: P1, creatureId, symbolId: first.id },
      advancePhase,
    );

    expect(engine.symbols[second.id]?.status).toBe("available");
    expect(usableSymbols(engine, P1).map((symbol) => symbol.id)).toEqual([second.id]);
  });

  it("places the absorbing die on the creature until end of turn", () => {
    const { state, symbols } = afterRoll();
    const [first] = symbols;
    if (first === undefined || first.sourceDieId === null) throw new Error("expected a die symbol");
    const creatureId = creatureIdAt(state, P1, 0);

    const absorbed = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, creatureId, symbolId: first.id }),
    );

    expect(absorbed.dice[first.sourceDieId]?.attachedToCreatureId).toBe(creatureId);
  });

  it("frees the die at end of turn", () => {
    const { state, symbols } = afterRoll();
    const [first] = symbols;
    if (first === undefined || first.sourceDieId === null) throw new Error("expected a die symbol");
    const creatureId = creatureIdAt(state, P1, 0);

    const nextTurn = play(
      state,
      { type: "ABSORB_SYMBOL", playerId: P1, creatureId, symbolId: first.id },
      { type: "END_TURN", playerId: P1 },
    );

    expect(nextTurn.dice[first.sourceDieId]?.attachedToCreatureId).toBeNull();
    expect(nextTurn.symbols[first.id]).toBeUndefined();
  });

  it("refuses to absorb once the absorption window has closed", () => {
    const { state, symbols } = afterRoll();
    const [first] = symbols;
    if (first === undefined) throw new Error("expected a rolled symbol");
    const creatureId = creatureIdAt(state, P1, 0);

    const engine = expectOk(advance(state, advancePhase));
    const result = advance(engine, {
      type: "ABSORB_SYMBOL",
      playerId: P1,
      creatureId,
      symbolId: first.id,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_PHASE");
    expect(result.state).toBe(engine);
  });

  it("refuses to absorb the same symbol twice", () => {
    const { state, symbols } = afterRoll();
    const [first] = symbols;
    if (first === undefined) throw new Error("expected a rolled symbol");

    const once = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(state, P1, 0),
        symbolId: first.id,
      }),
    );
    const result = advance(once, {
      type: "ABSORB_SYMBOL",
      playerId: P1,
      creatureId: creatureIdAt(state, P1, 1),
      symbolId: first.id,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("SYMBOL_UNAVAILABLE");
  });

  it("refuses to feed a symbol to an opposing creature", () => {
    const { state, symbols } = afterRoll();
    const [first] = symbols;
    if (first === undefined) throw new Error("expected a rolled symbol");

    const result = advance(state, {
      type: "ABSORB_SYMBOL",
      playerId: P1,
      creatureId: creatureIdAt(state, P2, 0),
      symbolId: first.id,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });

  it("refuses to energize a defeated creature", () => {
    const { state, symbols } = afterRoll();
    const [first] = symbols;
    if (first === undefined) throw new Error("expected a rolled symbol");
    const creatureId = creatureIdAt(state, P1, 0);

    const result = advance(withDefeatedCreature(state, creatureId), {
      type: "ABSORB_SYMBOL",
      playerId: P1,
      creatureId,
      symbolId: first.id,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("CREATURE_DEFEATED");
  });
});

/**
 * What absorbing actually buys. Bible §7 pays out at end of turn, which is also
 * why a creature can never attack on the turn it was fed.
 */
describe("what absorption pays out", () => {
  const absorbAll = (symbols: Parameters<typeof withSymbols>[2], creatureIndex = 0) => {
    const state = withSymbols(withPhase(newMatch(), "absorption"), P1, symbols, "rolled");
    const creatureId = creatureIdAt(state, P1, creatureIndex);
    const absorbed = Object.values(state.symbols).reduce(
      (current, symbol) =>
        expectOk(
          advance(current, { type: "ABSORB_SYMBOL", playerId: P1, creatureId, symbolId: symbol.id }),
        ),
      state,
    );
    return { creatureId, absorbed };
  };

  it("turns an absorbed attribute into a token at end of turn", () => {
    const { creatureId, absorbed } = absorbAll(["martial"]);

    expect(absorbed.creatures[creatureId]?.attributeTokens).toEqual({});

    const nextTurn = expectOk(advance(absorbed, { type: "END_TURN", playerId: P1 }));
    expect(nextTurn.creatures[creatureId]?.attributeTokens).toEqual({ martial: 1 });
  });

  it("turns an absorbed Shield into a shield immediately", () => {
    const { creatureId, absorbed } = absorbAll([SHIELD]);

    expect(absorbed.creatures[creatureId]?.shields).toBe(1);
    expect(absorbed.creatures[creatureId]?.attributeTokens).toEqual({});

    const nextTurn = expectOk(advance(absorbed, { type: "END_TURN", playerId: P1 }));
    // Still one — shields are not double-paid at end of turn.
    expect(nextTurn.creatures[creatureId]?.shields).toBe(1);
  });

  it("lets one creature absorb several symbols in a turn", () => {
    const { creatureId, absorbed } = absorbAll(["martial", "wild", SHIELD]);

    expect(absorbed.creatures[creatureId]?.shields).toBe(1);

    const nextTurn = expectOk(advance(absorbed, { type: "END_TURN", playerId: P1 }));
    const creature = nextTurn.creatures[creatureId];

    expect(creature?.attributeTokens).toEqual({ martial: 1, wild: 1 });
    expect(creature?.shields).toBe(1);
  });

  it("accumulates tokens across turns, so fuel is never lost", () => {
    const afterFirst = expectOk(
      advance(absorbAll(["martial"]).absorbed, { type: "END_TURN", playerId: P1 }),
    );
    const creatureId = creatureIdAt(afterFirst, P1, 0);

    // Back round to P1, who feeds the same creature a second, different symbol.
    const secondRoll = withSymbols(
      withPhase(withActivePlayer(afterFirst, P1), "absorption"),
      P1,
      ["wild"],
      "rolled",
    );
    const wild = Object.values(secondRoll.symbols).find((symbol) => symbol.symbol === "wild");
    if (wild === undefined) throw new Error("expected the given wild symbol");

    const afterSecond = play(
      secondRoll,
      { type: "ABSORB_SYMBOL", playerId: P1, creatureId, symbolId: wild.id },
      { type: "END_TURN", playerId: P1 },
    );

    expect(afterSecond.creatures[creatureId]?.attributeTokens).toEqual({ martial: 1, wild: 1 });
  });
});
