import { describe, expect, it } from "vitest";
import { RUNIC_NULLIFICATION } from "../content/cards.js";
import { asCardInstanceId } from "../model/ids.js";
import type { CardInstance } from "../model/cards.js";
import {
  absorbSymbolToCreatureError,
  absorbSymbolToRitualError,
  canAbsorbSymbolToCreature,
  canAbsorbSymbolToRitual,
} from "./absorb.js";
import {
  creatureIdAt,
  newMatch,
  P1,
  P2,
  withPhase,
  withSymbols,
} from "../testing/scenario.js";

function symbolOf(
  state: ReturnType<typeof newMatch>,
  playerId: typeof P1,
  name: string,
) {
  const found = Object.values(state.symbols).find(
    (symbol) => symbol.ownerId === playerId && symbol.symbol === name,
  );
  if (found === undefined) throw new Error(`missing ${name} pip`);
  return found;
}

function withReadyRitual(
  state: ReturnType<typeof newMatch>,
  playerId: typeof P1,
): ReturnType<typeof newMatch> {
  const player = state.players[playerId];
  if (player === undefined) throw new Error("missing player");
  const id = asCardInstanceId("given-ritual-runic");
  const instance: CardInstance = {
    id,
    cardId: RUNIC_NULLIFICATION,
    ownerId: playerId,
    zone: "ritual",
    attachedToCreatureId: null,
    attachedToFaceCardId: null,
    ritualOrientation: "preparing",
    ritualProgress: {},
    ritualProgressCreditedThisTurn: [],
  };
  return {
    ...state,
    cards: { ...state.cards, [id]: instance },
    players: { ...state.players, [playerId]: { ...player, ritual: [...player.ritual, id] } },
  };
}

describe("absorb destination queries", () => {
  it("allows creature absorb of an unabsorbed pool pip", () => {
    const state = withPhase(withSymbols(newMatch(), P1, ["arcane"]), "actions");
    const creatureId = creatureIdAt(state, P1, 0);
    const pip = symbolOf(state, P1, "arcane");
    expect(canAbsorbSymbolToCreature(state, P1, creatureId, pip.id)).toBe(true);
    expect(absorbSymbolToCreatureError(state, P1, creatureId, pip.id)).toBeNull();
  });

  it("refuses a pip that is no longer in the pool", () => {
    const state = withPhase(withSymbols(newMatch(), P1, ["arcane"], "absorbed"), "actions");
    const creatureId = creatureIdAt(state, P1, 0);
    const pip = symbolOf(state, P1, "arcane");
    expect(absorbSymbolToCreatureError(state, P1, creatureId, pip.id)).toBe("SYMBOL_UNAVAILABLE");
  });

  it("refuses absorbing onto the opponent's creature", () => {
    const state = withPhase(withSymbols(newMatch(), P1, ["arcane"]), "actions");
    const enemy = creatureIdAt(state, P2, 0);
    const pip = symbolOf(state, P1, "arcane");
    expect(absorbSymbolToCreatureError(state, P1, enemy, pip.id)).toBe("INVALID_TARGET");
  });

  it("allows ritual absorb when the pip matches a missing Active-when pip", () => {
    const state = withReadyRitual(
      withPhase(withSymbols(newMatch(), P1, ["arcane"]), "actions"),
      P1,
    );
    const ritualId = asCardInstanceId("given-ritual-runic");
    const pip = symbolOf(state, P1, "arcane");
    expect(canAbsorbSymbolToRitual(state, P1, ritualId, pip.id)).toBe(true);
    expect(absorbSymbolToRitualError(state, P1, ritualId, pip.id)).toBeNull();
  });

  it("refuses Shield on a ritual and a mismatched attribute", () => {
    const state = withReadyRitual(
      withPhase(withSymbols(newMatch(), P1, ["shield", "martial"]), "actions"),
      P1,
    );
    const ritualId = asCardInstanceId("given-ritual-runic");
    const shield = symbolOf(state, P1, "shield");
    const martial = symbolOf(state, P1, "martial");
    expect(absorbSymbolToRitualError(state, P1, ritualId, shield.id)).toBe("INVALID_TARGET");
    expect(absorbSymbolToRitualError(state, P1, ritualId, martial.id)).toBe("INVALID_TARGET");
    expect(canAbsorbSymbolToRitual(state, P1, ritualId, martial.id)).toBe(false);
  });
});
