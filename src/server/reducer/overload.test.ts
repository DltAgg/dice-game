import { describe, expect, it } from "vitest";
import type { DieState } from "../model/dice.js";
import type { DieId, FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { overloadsOf } from "../rules/cards.js";
import {
  TEST_SYNTHETIC_LUMINAR_A,
  TEST_SYNTHETIC_MECHANICAL_A,
  testCard,
} from "../testing/fixtures/index.js";
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

const MECHANICAL_OVERLOAD = testCard({
  id: "card-test-overload-mechanical",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  type: "overload",
  overload: { faceSymbols: ["mechanical"], onRoll: [{ type: "play-cost-discount", amount: 1 }] },
});

const MECHANICAL_OVERLOAD_B = testCard({
  id: "card-test-overload-mechanical-b",
  playCost: { mechanical: 2, any: 1 },
  attribute: "mechanical",
  type: "overload",
  overload: {
    faceSymbols: ["mechanical"],
    faceKinds: ["synthetic"],
    onRoll: [{ type: "desynthesize", target: { kind: "choose-any-synthetic-slot" } }],
  },
});

const LUMINAR_OVERLOAD = testCard({
  id: "card-test-overload-luminar",
  playCost: { luminar: 3, any: 1 },
  attribute: "luminar",
  type: "overload",
  overload: {
    faceSymbols: ["luminar"],
    onRoll: [
      { type: "grant-shield", amount: 2, target: { kind: "choose-ally" } },
      { type: "next-attack-bonus", amount: 1 },
    ],
  },
});

const GENERATE_OVERLOAD = testCard({
  id: "card-test-overload-generate",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  type: "overload",
  overload: {
    faceSymbols: ["mechanical"],
    onRoll: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
  },
});

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

function installFace(state: GameState, faceId: FaceCardId): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((slot, index) =>
    index === 0 ? { ...slot, faceCardId: faceId, faceCardOwnerId: P1 } : slot,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

describe("overloads", () => {
  it("attaches to a Mechanical face", () => {
    const base = installFace(actionsReady([MECHANICAL_OVERLOAD.id]), TEST_SYNTHETIC_MECHANICAL_A);
    const attached = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: TEST_SYNTHETIC_MECHANICAL_A,
      }),
    );
    expect(overloadsOf(attached, P1)).toHaveLength(1);
  });

  it("a second Mechanical overload also attaches", () => {
    const base = installFace(actionsReady([MECHANICAL_OVERLOAD_B.id]), TEST_SYNTHETIC_MECHANICAL_A);
    const attached = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: TEST_SYNTHETIC_MECHANICAL_A,
      }),
    );
    expect(overloadsOf(attached, P1)).toHaveLength(1);
  });

  it("attaches to a Luminar face slot", () => {
    const base = installFace(actionsReady([LUMINAR_OVERLOAD.id]), TEST_SYNTHETIC_LUMINAR_A);
    const attached = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: TEST_SYNTHETIC_LUMINAR_A,
      }),
    );
    expect(overloadsOf(attached, P1)).toHaveLength(1);
  });

  it("on-roll generates Mechanical", () => {
    const base = installFace(actionsReady([GENERATE_OVERLOAD.id]), TEST_SYNTHETIC_MECHANICAL_A);
    const attached = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: TEST_SYNTHETIC_MECHANICAL_A,
      }),
    );
    let rolled = withPhase(attached, "roll");
    rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, 1), { retained: true, rolledSlotIndex: 4 });
    const after = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });
});
