import { describe, expect, it } from "vitest";
import { LIVING_LIBRARY, TEMPER } from "../content/cards.js";
import type { PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { advance } from "./reduce.js";
import {
  expectOk,
  forgeAction,
  handCardIdAt,
  newMatch,
  P1,
  withAttributePool,
  withHand,
  withPhase,
} from "../testing/scenario.js";

function withForgeDiscount(
  state: GameState,
  playerId: PlayerId,
  amount: number,
): GameState {
  return {
    ...state,
    forgeDiscountThisTurn: { ...state.forgeDiscountThisTurn, [playerId]: amount },
  };
}

describe("FORGE_CARD pile cost", () => {
  it("natural forge installs without burning playCost", () => {
    const ready = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [TEMPER]),
      P1,
      { martial: 2 },
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [5])),
    );
    expect(forged.players[P1]?.attributePool).toEqual({ martial: 2 });
  });

  it("synthetic forge still burns playCost", () => {
    const ready = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [LIVING_LIBRARY]),
      P1,
      { arcane: 3 },
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(forged.players[P1]?.attributePool.arcane).toBe(2);
  });

  it("forge discount reduces synthetic forge cost and is consumed", () => {
    const ready = withForgeDiscount(
      withAttributePool(
        withHand(withPhase(newMatch(), "actions"), P1, [LIVING_LIBRARY]),
        P1,
        { arcane: 1 },
      ),
      P1,
      1,
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(forged.players[P1]?.attributePool.arcane ?? 0).toBe(1);
    expect(forged.forgeDiscountThisTurn[P1]).toBeUndefined();
  });

  it("natural forge leaves forgeDiscountThisTurn for a later synthetic", () => {
    let state = withForgeDiscount(
      withAttributePool(
        withHand(withPhase(newMatch(), "actions"), P1, [TEMPER, LIVING_LIBRARY]),
        P1,
        { martial: 2, arcane: 2 },
      ),
      P1,
      1,
    );
    expect(state.forgeDiscountThisTurn[P1]).toBe(1);

    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const temperId = handCardIdAt(state, P1, 0);
    state = expectOk(advance(state, forgeAction(state, P1, temperId, dieId, [5])));
    expect(state.forgeDiscountThisTurn[P1]).toBe(1);
    expect(state.players[P1]?.attributePool.martial).toBe(2);

    const libraryId = handCardIdAt(state, P1, 0);
    state = expectOk(advance(state, forgeAction(state, P1, libraryId, dieId, [4])));
    expect(state.forgeDiscountThisTurn[P1]).toBeUndefined();
    // Living Library playCost 2, discount 1 → burn 1 arcane from 2, then
    // synthetic forge bank +1 arcane.
    expect(state.players[P1]?.attributePool.arcane).toBe(2);
  });
});
