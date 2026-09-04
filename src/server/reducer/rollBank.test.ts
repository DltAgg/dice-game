import { describe, expect, it } from "vitest";
import type { DieState } from "../model/dice.js";
import type { DieId, FaceCardId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { HALO_LAMP, SUNWARD_LENS } from "../content/faces.js";
import {
  advanceResolvingChain as advance,
  expectOk,
  newMatch,
  P1,
  withPhase,
} from "../testing/scenario.js";

function dieIdOf(state: GameState, playerId: PlayerId = P1, index = 0): DieId {
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
  it("Sunward Lens banks 1 Luminar and 1 Mechanical on roll", () => {
    const state = rollRetainedSlots(installFaceOnDie(newMatch(), SUNWARD_LENS, 0), [0, 4]);
    expect(state.players[P1]?.attributePool.luminar ?? 0).toBe(1);
    expect(state.players[P1]?.attributePool.mechanical ?? 0).toBe(1);
  });

  it("Halo Lamp banks 2 Luminar on roll", () => {
    const state = rollRetainedSlots(installFaceOnDie(newMatch(), HALO_LAMP, 0), [0, 4]);
    expect(state.players[P1]?.attributePool.luminar ?? 0).toBe(2);
  });
});
