import { describe, expect, it } from "vitest";
import { COG_DRAFT, MENDING_LIGHT, TWIN_CAM } from "../content/cards.js";
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
      withHand(withPhase(newMatch(), "actions"), P1, [MENDING_LIGHT]),
      P1,
      { luminar: 2 },
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [5])),
    );
    expect(forged.players[P1]?.attributePool).toEqual({ luminar: 2 });
  });

  it("synthetic forge still burns playCost", () => {
    const ready = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]),
      P1,
      { mechanical: 3 },
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(forged.players[P1]?.attributePool.mechanical).toBe(2);
  });

  it("forge discount reduces synthetic forge cost and is consumed", () => {
    const ready = withForgeDiscount(
      withAttributePool(
        withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]),
        P1,
        { mechanical: 1 },
      ),
      P1,
      1,
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(forged.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
    expect(forged.forgeDiscountThisTurn[P1]).toBeUndefined();
  });

  it("Twin Cam with Discount 1 spends the last Mechanical (no synthetic-bank refund)", () => {
    const ready = withForgeDiscount(
      withAttributePool(
        withHand(withPhase(newMatch(), "actions"), P1, [TWIN_CAM]),
        P1,
        { mechanical: 1 },
      ),
      P1,
      1,
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(forged.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
    expect(
      forged.log.some(
        (entry) =>
          entry.event.type === "attribute-tokens-discarded" &&
          entry.event.discarded.mechanical === 1,
      ),
    ).toBe(true);
  });

  it("natural forge leaves forgeDiscountThisTurn for a later synthetic", () => {
    let state = withForgeDiscount(
      withAttributePool(
        withHand(withPhase(newMatch(), "actions"), P1, [MENDING_LIGHT, COG_DRAFT]),
        P1,
        { luminar: 2, mechanical: 1 },
      ),
      P1,
      1,
    );
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    state = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [5])),
    );
    expect(state.forgeDiscountThisTurn[P1]).toBe(1);
    state = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4])),
    );
    expect(state.forgeDiscountThisTurn[P1]).toBeUndefined();
    expect(state.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
  });
});
