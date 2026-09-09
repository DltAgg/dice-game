import { describe, expect, it } from "vitest";
import type { PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { canAffordForge } from "../rules/cards.js";
import { TEST_NATURAL_FORGE, TEST_PLAYABLE } from "../testing/fixtures/index.js";
import { getCard } from "../content/cards.js";
import { advance } from "./reduce.js";
import {
  expectOk,
  forgeAction,
  handCardIdAt,
  newMatch,
  P1,
  P2,
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

function withSyntheticForgedThisTurn(state: GameState, playerId: PlayerId): GameState {
  return {
    ...state,
    syntheticForgedThisTurn: { ...state.syntheticForgedThisTurn, [playerId]: true },
  };
}

function discardedMechanical(state: GameState): number {
  return state.log.reduce((sum, entry) => {
    if (entry.event.type !== "attribute-tokens-discarded") return sum;
    return sum + (entry.event.discarded.mechanical ?? 0);
  }, 0);
}

describe("FORGE_CARD pile cost", () => {
  it("natural forge installs without burning playCost", () => {
    const ready = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [TEST_NATURAL_FORGE]),
      P1,
      { luminar: 2 },
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [5])),
    );
    expect(forged.players[P1]?.attributePool).toEqual({ luminar: 2 });
    expect(forged.syntheticForgedThisTurn[P1]).toBeUndefined();
  });

  it("first synthetic forge this turn does not burn playCost and still banks", () => {
    const ready = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]),
      P1,
      { mechanical: 3 },
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(forged.players[P1]?.attributePool.mechanical).toBe(4);
    expect(discardedMechanical(forged)).toBe(0);
    expect(forged.syntheticForgedThisTurn[P1]).toBe(true);
  });

  it("second synthetic forge this turn burns playCost", () => {
    const ready = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE, TEST_PLAYABLE]),
      P1,
      { mechanical: 3 },
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const first = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(first.players[P1]?.attributePool.mechanical).toBe(4);
    const second = expectOk(
      advance(first, forgeAction(first, P1, handCardIdAt(first, P1, 0), dieId, [5])),
    );
    expect(second.players[P1]?.attributePool.mechanical).toBe(3);
  });

  it("forge discount reduces a paid synthetic forge cost and is consumed", () => {
    const ready = withForgeDiscount(
      withSyntheticForgedThisTurn(
        withAttributePool(
          withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]),
          P1,
          { mechanical: 1 },
        ),
        P1,
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

  it("Discount 1 spends the last Mechanical on a paid 2-cost synthetic forge", () => {
    const ready = withForgeDiscount(
      withSyntheticForgedThisTurn(
        withAttributePool(
          withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]),
          P1,
          { mechanical: 1 },
        ),
        P1,
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

  it("first synthetic is free even with forgeDiscountThisTurn armed", () => {
    const ready = withForgeDiscount(
      withAttributePool(
        withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]),
        P1,
        { mechanical: 3 },
      ),
      P1,
      1,
    );
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(discardedMechanical(forged)).toBe(0);
    expect(forged.players[P1]?.attributePool.mechanical).toBe(4);
    expect(forged.syntheticForgedThisTurn[P1]).toBe(true);
    expect(forged.forgeDiscountThisTurn[P1]).toBe(1);
  });

  it("natural forge then first synthetic stay free and leave forgeDiscountThisTurn", () => {
    let state = withForgeDiscount(
      withAttributePool(
        withHand(withPhase(newMatch(), "actions"), P1, [
          TEST_NATURAL_FORGE,
          TEST_PLAYABLE,
          TEST_PLAYABLE,
        ]),
        P1,
        { luminar: 2, mechanical: 1 },
      ),
      P1,
      1,
    );
    const dieId = state.players[P1]?.dieIds[0];
    const otherDieId = state.players[P1]?.dieIds[1];
    if (dieId === undefined || otherDieId === undefined) throw new Error("expected dice");
    state = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [5])),
    );
    expect(state.forgeDiscountThisTurn[P1]).toBe(1);
    expect(state.syntheticForgedThisTurn[P1]).toBeUndefined();
    state = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4])),
    );
    expect(state.forgeDiscountThisTurn[P1]).toBe(1);
    expect(state.syntheticForgedThisTurn[P1]).toBe(true);
    expect(state.players[P1]?.attributePool.mechanical ?? 0).toBe(2);
    state = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), otherDieId, [4])),
    );
    expect(state.forgeDiscountThisTurn[P1]).toBeUndefined();
    expect(state.players[P1]?.attributePool.mechanical ?? 0).toBe(1);
  });

  it("END_TURN clears the waiver so the next turn’s first synthetic is free again", () => {
    const playable = getCard(TEST_PLAYABLE);
    if (playable === undefined) throw new Error("playable");
    let state = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE, TEST_PLAYABLE]),
      P1,
      {},
    );
    const dieId = state.players[P1]?.dieIds[0];
    const otherDieId = state.players[P1]?.dieIds[1];
    if (dieId === undefined || otherDieId === undefined) throw new Error("expected dice");
    state = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4])),
    );
    expect(state.syntheticForgedThisTurn[P1]).toBe(true);
    state = expectOk(advance(state, { type: "END_TURN", playerId: P1 }));
    expect(state.syntheticForgedThisTurn[P1]).toBeUndefined();
    state = expectOk(advance(state, { type: "END_TURN", playerId: P2 }));
    state = withPhase(state, "actions");
    expect(canAffordForge(state, P1, playable)).toBe(true);
    state = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), otherDieId, [4])),
    );
    expect(state.syntheticForgedThisTurn[P1]).toBe(true);
    expect(state.players[P1]?.attributePool.mechanical ?? 0).toBe(2);
  });
});
