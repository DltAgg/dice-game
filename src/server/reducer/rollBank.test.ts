import { describe, expect, it } from "vitest";
import type { DieState } from "../model/dice.js";
import type { DieId, FaceCardId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { HEXBRAND, VITAL_SPARK } from "../content/faces.js";
import {
  advanceResolvingChain as advance,
  creatureIdAt,
  eventTypes,
  expectOk,
  newMatch,
  P1,
  P2,
  withDamage,
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
  it("resolves on-roll heal before on-absorb Shield when roll opens a choice", () => {
    const healTarget = creatureIdAt(newMatch(), P1, 0);
    const shieldTarget = creatureIdAt(newMatch(), P1, 1);
    let state = withDamage(installFaceOnDie(newMatch(), VITAL_SPARK, 0), healTarget, 2);
    state = withDamage(state, shieldTarget, 0);
    state = rollRetainedSlots(state, [0, 4]);

    expect(state.pendingDecision).toMatchObject({
      type: "choose-creature",
      filter: "ally",
    });
    expect(state.rollBankQueue.length).toBeGreaterThan(0);

    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: healTarget,
      }),
    );
    expect(state.creatures[healTarget]?.damage).toBe(1);

    expect(state.pendingDecision).toMatchObject({
      type: "choose-creature",
      filter: "ally",
    });
    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: shieldTarget,
      }),
    );
    expect(state.creatures[shieldTarget]?.shields).toBe(1);
    expect(state.rollBankQueue).toEqual([]);
  });

  it("each Drain on roll heals after its own enemy choice", () => {
    const allyA = creatureIdAt(newMatch(), P1, 0);
    const allyB = creatureIdAt(newMatch(), P1, 1);
    const enemy0 = creatureIdAt(newMatch(), P2, 0);
    const enemy1 = creatureIdAt(newMatch(), P2, 1);

    let state = withDamage(installFaceOnDie(newMatch(), HEXBRAND, 0), allyA, 4);
    state = withDamage(installFaceOnDie(state, HEXBRAND, 1), allyB, 2);
    state = rollRetainedSlots(state, [0, 0]);

    expect(state.pendingDecision?.type).toBe("choose-creature");

    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: enemy0,
      }),
    );
    expect(state.creatures[enemy0]?.damage).toBe(1);
    expect(state.creatures[allyA]?.damage).toBe(3);
    expect(eventTypes(state).filter((t) => t === "life-drained")).toHaveLength(1);

    expect(state.pendingDecision?.type).toBe("choose-creature");
    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: enemy1,
      }),
    );
    expect(state.creatures[enemy1]?.damage).toBe(1);
    expect(state.creatures[allyA]?.damage).toBe(2);
    expect(state.creatures[allyB]?.damage).toBe(2);
    expect(eventTypes(state).filter((t) => t === "life-drained")).toHaveLength(2);
    expect(eventTypes(state).filter((t) => t === "creature-healed")).toHaveLength(2);
  });
});
