import { describe, expect, it } from "vitest";
import type { DieState } from "../model/dice.js";
import type { DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import {
  TEST_OVERCHARGE_ARCANE,
  TEST_SYNTHETIC_MECHANICAL_A,
  testCard,
} from "../testing/fixtures/index.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  overchargeAction,
  P1,
  withHand,
  withPhase,
  withPile,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const SHIELD_SLOT = 4;

const STAMP = testCard({
  id: "card-test-stamp-die",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  effect: { effects: [{ type: "reapply-die-modifiers" }] },
});

const DISCOUNT_OVERLOAD = testCard({
  id: "card-test-stamp-overload",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  type: "overload",
  overload: { faceSymbols: ["mechanical"], onRoll: [{ type: "play-cost-discount", amount: 1 }] },
});

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

function dieIdOf(state: GameState, index = 0): DieId {
  const id = state.players[P1]?.dieIds[index];
  if (id === undefined) throw new Error("expected a die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("expected die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function installFace(state: GameState): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((slot, index) =>
    index === 0
      ? { ...slot, faceCardId: TEST_SYNTHETIC_MECHANICAL_A, faceCardOwnerId: P1 }
      : slot,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function rollShowingSynthetic(state: GameState): GameState {
  let rolled = withPhase(state, "roll");
  rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: 0 });
  rolled = withDie(rolled, dieIdOf(rolled, 1), { retained: true, rolledSlotIndex: SHIELD_SLOT });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
}

function playStampOnDie(state: GameState, dieId: DieId): GameState {
  const punched = expectOk(
    advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    }),
  );
  return expectOk(
    advance(punched, { type: "RESOLVE_CHOOSE_DIE", playerId: P1, dieId }),
  );
}

describe("[Stamp] reapply-die-modifiers", () => {
  it("re-fires On roll and overload generate without a new rolled pip", () => {
    const base = installFace(actionsReady([DISCOUNT_OVERLOAD.id, STAMP.id]));
    const attached = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: TEST_SYNTHETIC_MECHANICAL_A,
      }),
    );
    const rolled = rollShowingSynthetic(attached);
    const dieId = dieIdOf(rolled);
    const mechAfterRoll = rolled.players[P1]?.attributePool.mechanical ?? 0;
    const lumAfterRoll = rolled.players[P1]?.attributePool.luminar ?? 0;
    const rolledSymbolsBefore = Object.values(rolled.symbols).filter(
      (symbol) => symbol.sourceDieId === dieId,
    ).length;

    const stamped = playStampOnDie(rolled, dieId);

    expect(stamped.players[P1]?.attributePool.mechanical ?? 0).toBe(mechAfterRoll - 1);
    expect(stamped.players[P1]?.attributePool.luminar ?? 0).toBe(lumAfterRoll);
    expect(
      Object.values(stamped.symbols).filter((symbol) => symbol.sourceDieId === dieId).length,
    ).toBe(rolledSymbolsBefore);
  });

  it("re-fires Overcharge generate", () => {
    let state = installFace(actionsReady([TEST_OVERCHARGE_ARCANE, STAMP.id]));
    state = expectOk(
      advance(state, overchargeAction(P1, handCardIdAt(state, P1, 0), TEST_SYNTHETIC_MECHANICAL_A)),
    );
    const rolled = rollShowingSynthetic(state);
    const dieId = dieIdOf(rolled);
    const arcaneBefore = rolled.players[P1]?.attributePool.arcane ?? 0;

    const stamped = playStampOnDie(rolled, dieId);

    expect(stamped.players[P1]?.attributePool.arcane ?? 0).toBe(arcaneBefore + 1);
  });
});
