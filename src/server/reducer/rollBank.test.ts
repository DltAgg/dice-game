import { describe, expect, it } from "vitest";
import type { DieState } from "../model/dice.js";
import type { DieId, FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { testFace } from "../testing/fixtures/index.js";
import {
  advanceResolvingChain as advance,
  expectOk,
  newMatch,
  P1,
  withPhase,
} from "../testing/scenario.js";

const DUAL_PIP = testFace({
  id: "face-test-bank-dual-pip",
  kind: "synthetic",
  symbol: "luminar",
  pips: { luminar: 1, mechanical: 1 },
});

const DOUBLE_LUMINAR = testFace({
  id: "face-test-bank-double-luminar",
  kind: "synthetic",
  symbol: "luminar",
  pips: { luminar: 2 },
});

function dieIdOf(state: GameState, playerId: typeof P1 = P1, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function installFaceOnDie(
  state: GameState,
  faceCardId: FaceCardId,
  dieIndex: 0 | 1,
  slot = 0,
): GameState {
  const dieId = dieIdOf(state, P1, dieIndex);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((s, index) =>
    index === slot ? { ...s, faceCardId, faceCardOwnerId: P1 } : s,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function rollRetainedSlots(state: GameState, slots: readonly [number, number]): GameState {
  let rolled = withPhase(state, "roll");
  rolled = withDie(rolled, dieIdOf(rolled, P1, 0), {
    retained: true,
    rolledSlotIndex: slots[0],
  });
  rolled = withDie(rolled, dieIdOf(rolled, P1, 1), {
    retained: true,
    rolledSlotIndex: slots[1],
  });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
}

describe("roll bank queue", () => {
  it("a dual-pip face banks 1 Luminar and 1 Mechanical on roll", () => {
    const state = rollRetainedSlots(installFaceOnDie(newMatch(), DUAL_PIP.id, 0), [0, 4]);
    expect(state.players[P1]?.attributePool.luminar ?? 0).toBe(1);
    expect(state.players[P1]?.attributePool.mechanical ?? 0).toBe(1);
  });

  it("a 2-pip Luminar face banks 2 Luminar on roll", () => {
    const state = rollRetainedSlots(installFaceOnDie(newMatch(), DOUBLE_LUMINAR.id, 0), [0, 4]);
    expect(state.players[P1]?.attributePool.luminar ?? 0).toBe(2);
  });
});
