import { describe, expect, it } from "vitest";
import {
  absorbSymbolError,
  canAbsorbSymbol,
  canAbsorbSymbolToCreature,
} from "./absorb.js";
import { creatureIdAt, newMatch, P1, P2, withPhase, withSymbols } from "../testing/scenario.js";

function base() {
  return withPhase(newMatch(), "actions");
}

describe("absorbSymbolError (pile-up)", () => {
  it("allows banking an attribute without a creature", () => {
    const state = withSymbols(base(), P1, ["martial"]);
    const pip = Object.values(state.symbols)[0]!;
    expect(canAbsorbSymbol(state, P1, pip.id)).toBe(true);
    expect(absorbSymbolError(state, P1, pip.id, undefined)).toBeNull();
  });

  it("ignores creatureId when banking an attribute", () => {
    const state = withSymbols(base(), P1, ["martial"]);
    const pip = Object.values(state.symbols)[0]!;
    const creatureId = creatureIdAt(state, P1, 0);
    expect(absorbSymbolError(state, P1, pip.id, creatureId)).toBeNull();
  });

  it("requires a living owned creature for Shield", () => {
    const state = withSymbols(base(), P1, ["shield"]);
    const pip = Object.values(state.symbols)[0]!;
    expect(absorbSymbolError(state, P1, pip.id, undefined)).toBe("INVALID_TARGET");
    const creatureId = creatureIdAt(state, P1, 0);
    expect(canAbsorbSymbolToCreature(state, P1, creatureId, pip.id)).toBe(true);
    const enemy = creatureIdAt(state, P2, 0);
    expect(absorbSymbolError(state, P1, pip.id, enemy)).toBe("INVALID_TARGET");
  });
});
