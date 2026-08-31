import { describe, expect, it } from "vitest";
import { IDLER_GEAR, PAWL_SPRING, CHOIRLIGHT } from "../content/cards.js";
import { COGTOOTH, HALO_LAMP } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { overloadsOf } from "../rules/cards.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withPile,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

function dieIdOf(state: GameState, index = 0): DieId {
  const id = state.players[P1]?.dieIds[index];
  if (id === undefined) throw new Error("die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function installFace(state: GameState, faceId: typeof COGTOOTH): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((slot, index) =>
    index === 0 ? { ...slot, faceCardId: faceId, faceCardOwnerId: P1 } : slot,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

describe("Tempo overloads", () => {
  it("Idler Gear attaches to a Mechanical face", () => {
    const base = installFace(actionsReady([IDLER_GEAR]), COGTOOTH);
    const attached = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: COGTOOTH,
      }),
    );
    expect(overloadsOf(attached, P1)).toHaveLength(1);
  });

  it("Pawl Spring attaches to a Mechanical face", () => {
    const base = installFace(actionsReady([PAWL_SPRING]), COGTOOTH);
    const attached = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: COGTOOTH,
      }),
    );
    expect(overloadsOf(attached, P1)).toHaveLength(1);
  });

  it("Choirlight attaches to a Luminar natural face slot", () => {
    const base = installFace(actionsReady([CHOIRLIGHT]), HALO_LAMP);
    const attached = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: HALO_LAMP,
      }),
    );
    expect(overloadsOf(attached, P1)).toHaveLength(1);
  });

  it("Idler Gear on-roll generates Mechanical", () => {
    const base = installFace(actionsReady([IDLER_GEAR]), COGTOOTH);
    const attached = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: COGTOOTH,
      }),
    );
    let rolled = withPhase(attached, "roll");
    rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, 1), { retained: true, rolledSlotIndex: 4 });
    const after = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });
});
