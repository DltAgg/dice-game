import { describe, expect, it } from "vitest";
import { COUPLING, PACK_SURGE, POUNCE } from "../content/cards.js";
import { SHIELD, type SymbolInstance } from "../model/symbols.js";
import { usableSymbols } from "../rules/symbols.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  play,
  withActivePlayer,
  withDefeatedCreature,
  withEnergy,
  withHand,
  withPhase,
  withSymbols,
} from "../testing/scenario.js";
import { advanceResolvingChain as advance } from "../testing/scenario.js";

const roll = { type: "ROLL_DICE", playerId: P1 } as const;

/** Rolls, then hands back the state plus the symbols now awaiting a decision. */
function afterRoll(): { state: ReturnType<typeof newMatch>; symbols: SymbolInstance[] } {
  const state = expectOk(advance(newMatch(), roll));
  return { state, symbols: Object.values(state.symbols) };
}

describe("creature absorb during actions", () => {
  it("removes the absorbed symbol from engine resolution", () => {
    const { state, symbols } = afterRoll();
    const [first] = symbols;
    if (first === undefined) throw new Error("expected a rolled symbol");
    expect(state.phase).toBe("actions");
    const creatureId = creatureIdAt(state, P1, 0);

    const absorbed = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, creatureId, symbolId: first.id }),
    );

    expect(absorbed.symbols[first.id]?.status).toBe("absorbed");
    expect(usableSymbols(absorbed, P1).map((symbol) => symbol.id)).not.toContain(first.id);
  });

  it("leaves unabsorbed symbols in the shared spend-or-absorb pool", () => {
    const { state, symbols } = afterRoll();
    const [first, second] = symbols;
    if (first === undefined || second === undefined) throw new Error("expected two symbols");
    const creatureId = creatureIdAt(state, P1, 0);

    const engine = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, creatureId, symbolId: first.id }),
    );

    expect(engine.symbols[second.id]?.status).toBe("rolled");
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

  it("lets the player absorb throughout actions, including after other actions", () => {
    const { state, symbols } = afterRoll();
    const [first] = symbols;
    if (first === undefined) throw new Error("expected a rolled symbol");
    const creatureId = creatureIdAt(state, P1, 0);

    expect(state.phase).toBe("actions");
    const result = advance(state, {
      type: "ABSORB_SYMBOL",
      playerId: P1,
      creatureId,
      symbolId: first.id,
    });

    expect(result.ok).toBe(true);
  });

  it("lets the player absorb an effect-generated symbol created mid-actions", () => {
    const ready = withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [PACK_SURGE]), P1, 10);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const generated = usableSymbols(played, P1).find(
      (symbol) => symbol.symbol === "wild" && symbol.sourceDieId === null,
    );
    if (generated === undefined) throw new Error("expected generated Wild");
    const creatureId = creatureIdAt(played, P1, 0);

    const absorbed = expectOk(
      advance(played, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId,
        symbolId: generated.id,
      }),
    );

    expect(absorbed.symbols[generated.id]?.status).toBe("absorbed");
    expect(usableSymbols(absorbed, P1).map((symbol) => symbol.id)).not.toContain(generated.id);
  });

  it("refuses to absorb during roll", () => {
    const state = withSymbols(withPhase(newMatch(), "roll"), P1, ["martial"], "rolled");
    const first = Object.values(state.symbols)[0];
    if (first === undefined) throw new Error("expected a rolled symbol");
    const creatureId = creatureIdAt(state, P1, 0);

    const result = advance(state, {
      type: "ABSORB_SYMBOL",
      playerId: P1,
      creatureId,
      symbolId: first.id,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_PHASE");
    expect(result.state).toBe(state);
  });

  it("spending a symbol for Requires removes it from the absorb pool", () => {
    const state = withEnergy(
      withHand(
        withSymbols(
          withPhase(newMatch(), "actions"),
          P1,
          ["mechanical", "mechanical"],
          "rolled",
        ),
        P1,
        [COUPLING],
      ),
      P1,
      10,
    );
    const [first] = Object.values(state.symbols).filter((symbol) => symbol.symbol === "mechanical");
    if (first === undefined) throw new Error("expected mechanical");
    const played = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );

    expect(played.symbols[first.id]?.status).toBe("consumed");
    const result = advance(played, {
      type: "ABSORB_SYMBOL",
      playerId: P1,
      creatureId: creatureIdAt(played, P1, 0),
      symbolId: first.id,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("SYMBOL_UNAVAILABLE");
  });

  it("absorbing a symbol means it cannot pay Requires", () => {
    const state = withEnergy(
      withHand(withSymbols(withPhase(newMatch(), "actions"), P1, ["wild"], "rolled"), P1, [POUNCE]),
      P1,
      10,
    );
    const wild = Object.values(state.symbols).find((symbol) => symbol.symbol === "wild");
    if (wild === undefined) throw new Error("expected wild");
    const absorbed = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(state, P1, 0),
        symbolId: wild.id,
      }),
    );

    const result = advance(absorbed, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(absorbed, P1, 0),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INSUFFICIENT_SYMBOLS");
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

  it("ADVANCE_PHASE from roll enters actions; the last phase is left only via END_TURN", () => {
    const start = newMatch();
    const skipped = expectOk(advance(start, { type: "ADVANCE_PHASE", playerId: P1 }));
    expect(skipped.phase).toBe("actions");

    const refused = advance(skipped, { type: "ADVANCE_PHASE", playerId: P1 });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INVALID_PHASE");
    expect(refused.state).toBe(skipped);
  });
});

/**
 * What absorbing actually buys. Bible §7 pays out at end of turn, which is also
 * why a creature can never attack on the turn it was fed.
 */
describe("what absorb pays out", () => {
  const absorbAll = (symbols: Parameters<typeof withSymbols>[2], creatureIndex = 0) => {
    const state = withSymbols(withPhase(newMatch(), "actions"), P1, symbols, "rolled");
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
      withPhase(withActivePlayer(afterFirst, P1), "actions"),
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
