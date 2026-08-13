import { describe, expect, it } from "vitest";
import { asAbilityId } from "../model/ids.js";
import { availableSymbolCounts, usableSymbols } from "../rules/symbols.js";
import {
  creatureIdAt,
  expectOk,
  newMatch,
  P1,
  P2,
  withDamage,
  withPhase,
  withSymbols,
} from "../testing/scenario.js";
import { advanceResolvingChain as advance } from "../testing/scenario.js";

const HUNT_CALL = asAbilityId("ability-varcolac-hunt-call");
const BULWARK = asAbilityId("ability-minotaur-bulwark");
const MEND = asAbilityId("ability-garuda-mend");

/** Minotaur is creature 0, Varcolac is 1, Garuda is 2. */
const engineState = (symbols: Parameters<typeof withSymbols>[2]) =>
  withSymbols(withPhase(newMatch(), "engine"), P1, symbols);

describe("engine resolution", () => {
  it("consumes the required symbol and produces the ability's effect", () => {
    const state = engineState(["wild"]);
    const varcolacId = creatureIdAt(state, P1, 1);

    const resolved = expectOk(
      advance(state, {
        type: "RESOLVE_ENGINE_ABILITY",
        playerId: P1,
        creatureId: varcolacId,
        abilityId: HUNT_CALL,
      }),
    );

    expect(availableSymbolCounts(resolved, P1)).toEqual({ martial: 1 });
  });

  it("lets a symbol produced by one effect feed the next, so order matters", () => {
    const state = engineState(["wild"]);
    const varcolacId = creatureIdAt(state, P1, 1);
    const minotaurId = creatureIdAt(state, P1, 0);

    // wild --Hunt Call--> martial --Bulwark--> a shield
    const chained = [
      { creatureId: varcolacId, abilityId: HUNT_CALL },
      { creatureId: minotaurId, abilityId: BULWARK },
    ].reduce(
      (current, link) =>
        expectOk(advance(current, { type: "RESOLVE_ENGINE_ABILITY", playerId: P1, ...link })),
      state,
    );

    expect(chained.creatures[minotaurId]?.shields).toBe(1);
    expect(usableSymbols(chained, P1)).toEqual([]);
  });

  it("cannot run the same chain in the reverse order", () => {
    const state = engineState(["wild"]);
    const minotaurId = creatureIdAt(state, P1, 0);

    const result = advance(state, {
      type: "RESOLVE_ENGINE_ABILITY",
      playerId: P1,
      creatureId: minotaurId,
      abilityId: BULWARK,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INSUFFICIENT_SYMBOLS");
  });

  it("refuses an ability whose symbol cost cannot be paid", () => {
    const state = engineState(["martial"]);
    const varcolacId = creatureIdAt(state, P1, 1);

    const result = advance(state, {
      type: "RESOLVE_ENGINE_ABILITY",
      playerId: P1,
      creatureId: varcolacId,
      abilityId: HUNT_CALL,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INSUFFICIENT_SYMBOLS");
    expect(result.state).toBe(state);
  });

  it("cannot be paid with a symbol a creature absorbed", () => {
    const pending = withSymbols(withPhase(newMatch(), "absorption"), P1, ["wild"], "rolled");
    const varcolacId = creatureIdAt(pending, P1, 1);
    const theSymbol = Object.values(pending.symbols)[0];
    if (theSymbol === undefined) throw new Error("expected one pending symbol");

    const engine = expectOk(
      advance(
        expectOk(
          advance(pending, {
            type: "ABSORB_SYMBOL",
            playerId: P1,
            creatureId: varcolacId,
            symbolId: theSymbol.id,
          }),
        ),
        { type: "ADVANCE_PHASE", playerId: P1 },
      ),
    );

    expect(usableSymbols(engine, P1)).toEqual([]);

    const result = advance(engine, {
      type: "RESOLVE_ENGINE_ABILITY",
      playerId: P1,
      creatureId: varcolacId,
      abilityId: HUNT_CALL,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INSUFFICIENT_SYMBOLS");
  });

  it("heals damage without exceeding the creature's maximum life", () => {
    const base = engineState(["wild", "wild"]);
    const garudaId = creatureIdAt(base, P1, 2);
    const damaged = withDamage(base, garudaId, 1);

    const healed = expectOk(
      advance(damaged, {
        type: "RESOLVE_ENGINE_ABILITY",
        playerId: P1,
        creatureId: garudaId,
        abilityId: MEND,
      }),
    );

    expect(healed.creatures[garudaId]?.damage).toBe(0);
  });

  it("refuses to resolve an ability on an opposing creature", () => {
    const state = engineState(["wild"]);

    const result = advance(state, {
      type: "RESOLVE_ENGINE_ABILITY",
      playerId: P1,
      creatureId: creatureIdAt(state, P2, 1),
      abilityId: HUNT_CALL,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });

  it("refuses an ability the creature does not have", () => {
    const state = engineState(["wild"]);

    const result = advance(state, {
      type: "RESOLVE_ENGINE_ABILITY",
      playerId: P1,
      creatureId: creatureIdAt(state, P1, 0),
      abilityId: HUNT_CALL,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("CARD_NOT_AVAILABLE");
  });

  it("refuses engine abilities outside the engine phase", () => {
    const state = withSymbols(withPhase(newMatch(), "combat"), P1, ["wild"]);

    const result = advance(state, {
      type: "RESOLVE_ENGINE_ABILITY",
      playerId: P1,
      creatureId: creatureIdAt(state, P1, 1),
      abilityId: HUNT_CALL,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_PHASE");
  });
});

describe("symbols never outlive the turn", () => {
  it("expires every unspent symbol, with nothing exempt", () => {
    const state = withSymbols(withPhase(newMatch(), "engine"), P1, ["arcane", "martial"]);

    const nextTurn = expectOk(advance(state, { type: "END_TURN", playerId: P1 }));

    expect(Object.values(nextTurn.symbols)).toEqual([]);
  });

  it("keeps what a creature converted into a shield", () => {
    const state = engineState(["martial"]);
    const minotaurId = creatureIdAt(state, P1, 0);

    const shielded = expectOk(
      advance(state, {
        type: "RESOLVE_ENGINE_ABILITY",
        playerId: P1,
        creatureId: minotaurId,
        abilityId: BULWARK,
      }),
    );
    const nextTurn = expectOk(advance(shielded, { type: "END_TURN", playerId: P1 }));

    expect(Object.values(nextTurn.symbols)).toEqual([]);
    expect(nextTurn.creatures[minotaurId]?.shields).toBe(1);
  });
});
