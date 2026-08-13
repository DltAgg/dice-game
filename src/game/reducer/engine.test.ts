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

const REFRACT = asAbilityId("ability-refract");
const RUNE_ECHO = asAbilityId("ability-rune-echo");
const BULWARK = asAbilityId("ability-bulwark");
const MEND = asAbilityId("ability-mend");

/** Warden is creature 0, Lumin Adept is 1, Rune Binder is 2. */
const engineState = (symbols: Parameters<typeof withSymbols>[2]) =>
  withSymbols(withPhase(newMatch(), "engine"), P1, symbols);

describe("engine resolution", () => {
  it("consumes the required symbol and produces the ability's effect", () => {
    const state = engineState(["luminar"]);
    const adeptId = creatureIdAt(state, P1, 1);

    const resolved = expectOk(
      advance(state, {
        type: "RESOLVE_ENGINE_ABILITY",
        playerId: P1,
        creatureId: adeptId,
        abilityId: REFRACT,
      }),
    );

    expect(availableSymbolCounts(resolved, P1)).toEqual({ arcane: 1 });
  });

  it("lets a symbol produced by one effect feed the next, so order matters", () => {
    const state = engineState(["luminar"]);
    const adeptId = creatureIdAt(state, P1, 1);
    const binderId = creatureIdAt(state, P1, 2);
    const wardenId = creatureIdAt(state, P1, 0);

    // luminar --Refract--> arcane --Rune Echo--> martial --Bulwark--> a shield
    const chained = [
      { creatureId: adeptId, abilityId: REFRACT },
      { creatureId: binderId, abilityId: RUNE_ECHO },
      { creatureId: wardenId, abilityId: BULWARK },
    ].reduce(
      (current, link) =>
        expectOk(advance(current, { type: "RESOLVE_ENGINE_ABILITY", playerId: P1, ...link })),
      state,
    );

    expect(chained.creatures[wardenId]?.shields).toBe(1);
    expect(usableSymbols(chained, P1)).toEqual([]);
  });

  it("cannot run the same chain in the reverse order", () => {
    const state = engineState(["luminar"]);
    const binderId = creatureIdAt(state, P1, 2);

    const result = advance(state, {
      type: "RESOLVE_ENGINE_ABILITY",
      playerId: P1,
      creatureId: binderId,
      abilityId: RUNE_ECHO,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INSUFFICIENT_SYMBOLS");
  });

  it("refuses an ability whose symbol cost cannot be paid", () => {
    const state = engineState(["martial"]);
    const adeptId = creatureIdAt(state, P1, 1);

    const result = advance(state, {
      type: "RESOLVE_ENGINE_ABILITY",
      playerId: P1,
      creatureId: adeptId,
      abilityId: REFRACT,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INSUFFICIENT_SYMBOLS");
    expect(result.state).toBe(state);
  });

  it("cannot be paid with a symbol a creature absorbed", () => {
    const pending = withSymbols(withPhase(newMatch(), "absorption"), P1, ["luminar"], "rolled");
    const adeptId = creatureIdAt(pending, P1, 1);
    const theSymbol = Object.values(pending.symbols)[0];
    if (theSymbol === undefined) throw new Error("expected one pending symbol");

    const engine = expectOk(
      advance(
        expectOk(
          advance(pending, {
            type: "ABSORB_SYMBOL",
            playerId: P1,
            creatureId: adeptId,
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
      creatureId: adeptId,
      abilityId: REFRACT,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INSUFFICIENT_SYMBOLS");
  });

  it("heals damage without exceeding the creature's maximum life", () => {
    const base = engineState(["arcane", "arcane"]);
    const binderId = creatureIdAt(base, P1, 2);
    const damaged = withDamage(base, binderId, 1);

    const healed = expectOk(
      advance(damaged, {
        type: "RESOLVE_ENGINE_ABILITY",
        playerId: P1,
        creatureId: binderId,
        abilityId: MEND,
      }),
    );

    expect(healed.creatures[binderId]?.damage).toBe(0);
  });

  it("refuses to resolve an ability on an opposing creature", () => {
    const state = engineState(["luminar"]);

    const result = advance(state, {
      type: "RESOLVE_ENGINE_ABILITY",
      playerId: P1,
      creatureId: creatureIdAt(state, P2, 1),
      abilityId: REFRACT,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });

  it("refuses an ability the creature does not have", () => {
    const state = engineState(["arcane"]);

    const result = advance(state, {
      type: "RESOLVE_ENGINE_ABILITY",
      playerId: P1,
      creatureId: creatureIdAt(state, P1, 0),
      abilityId: RUNE_ECHO,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("CARD_NOT_AVAILABLE");
  });

  it("refuses engine abilities outside the engine phase", () => {
    const state = withSymbols(withPhase(newMatch(), "combat"), P1, ["luminar"]);

    const result = advance(state, {
      type: "RESOLVE_ENGINE_ABILITY",
      playerId: P1,
      creatureId: creatureIdAt(state, P1, 1),
      abilityId: REFRACT,
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
    const wardenId = creatureIdAt(state, P1, 0);

    const shielded = expectOk(
      advance(state, {
        type: "RESOLVE_ENGINE_ABILITY",
        playerId: P1,
        creatureId: wardenId,
        abilityId: BULWARK,
      }),
    );
    const nextTurn = expectOk(advance(shielded, { type: "END_TURN", playerId: P1 }));

    expect(Object.values(nextTurn.symbols)).toEqual([]);
    expect(nextTurn.creatures[wardenId]?.shields).toBe(1);
  });
});
