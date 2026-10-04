import { describe, expect, it } from "vitest";
import { getCard } from "../content/cards.js";
import { canAffordForge } from "../rules/cards.js";
import { TEST_NATURAL_FORGE, TEST_PLAYABLE } from "../testing/fixtures/index.js";
import { advance } from "./reduce.js";
import {
  expectOk,
  forgeAction,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withHand,
  withPhase,
} from "../testing/scenario.js";

describe("FORGE_CARD without pile spend", () => {
  it("natural forge installs a face on the die", () => {
    const ready = withHand(withPhase(newMatch(), "actions"), P1, [TEST_NATURAL_FORGE]);
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [5])),
    );
    expect(forged.syntheticForgedThisTurn[P1]).toBeUndefined();
    expect(forged.dice[dieId]?.slots[5]?.faceCardId).toBeDefined();
  });

  it("a forge does not mark syntheticForgedThisTurn", () => {
    const ready = withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]);
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const forged = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    expect(forged.syntheticForgedThisTurn[P1]).toBeUndefined();
  });

  it("second synthetic forge still succeeds without pile payment", () => {
    const ready = withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE, TEST_PLAYABLE]);
    const dieId = ready.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");
    const first = expectOk(
      advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4])),
    );
    const second = expectOk(
      advance(first, forgeAction(first, P1, handCardIdAt(first, P1, 0), dieId, [5])),
    );
    expect(second.syntheticForgedThisTurn[P1]).toBeUndefined();
    expect(second.dice[dieId]?.slots[5]?.faceCardId).toBeDefined();
  });

  it("END_TURN leaves the flag unset and a later forge still succeeds", () => {
    const playable = getCard(TEST_PLAYABLE);
    if (playable === undefined) throw new Error("playable");
    let state = withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE, TEST_PLAYABLE]);
    const dieId = state.players[P1]?.dieIds[0];
    const otherDieId = state.players[P1]?.dieIds[1];
    if (dieId === undefined || otherDieId === undefined) throw new Error("expected dice");
    state = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4])),
    );
    expect(state.syntheticForgedThisTurn[P1]).toBeUndefined();
    state = expectOk(advance(state, { type: "END_TURN", playerId: P1 }));
    expect(state.syntheticForgedThisTurn[P1]).toBeUndefined();
    state = expectOk(advance(state, { type: "END_TURN", playerId: P2 }));
    state = withPhase(state, "actions");
    expect(canAffordForge(state, P1, playable)).toBe(true);
    state = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), otherDieId, [4])),
    );
    expect(state.syntheticForgedThisTurn[P1]).toBeUndefined();
  });
});
