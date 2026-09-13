import { describe, expect, it } from "vitest";
import type { DieState } from "../model/dice.js";
import type { DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { ritualsOf } from "../rules/cards.js";
import { advance } from "./reduce.js";
import {
  TEST_FACE_DECK,
  TEST_PLAYABLE,
  TEST_SYNTHETIC_MECHANICAL_A,
  TEST_SYNTHETIC_MECHANICAL_B,
  TEST_SYNTHETIC_MECHANICAL_C,
  testCard,
} from "../testing/fixtures/index.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  resolveOpenChain,
  withPile,
  withHand,
  withPhase,
} from "../testing/scenario.js";

const CROSS_FORGE_CHOICE = testCard({
  id: "card-test-assembly-cross-choice",
  playCost: { mechanical: 2, any: 1 },
  attribute: "mechanical",
  forge: { faces: 2, kind: "synthetic", attribute: "mechanical", target: "own-die" },
  effect: {
    requires: { mechanical: 2 },
    effects: [
      {
        type: "choose-effect-mode",
        modes: [
          [
            {
              type: "replace-synthetic-face",
              faces: 2,
              attribute: "luminar",
              fromAttribute: "mechanical",
            },
          ],
          [
            {
              type: "replace-synthetic-face",
              faces: 2,
              attribute: "mechanical",
              fromAttribute: "luminar",
            },
          ],
        ],
        modeLabels: ["Mechanical → Luminar", "Luminar → Mechanical"],
      },
    ],
  },
});

const FORGE_DISCOUNT_RITUAL = testCard({
  id: "card-test-assembly-forge-discount-ritual",
  playCost: { mechanical: 2, any: 1 },
  attribute: "mechanical",
  type: "ritual",
  subtypes: ["continuous"],
  ritual: {
    spend: { mechanical: 1 },
    effects: [{ type: "arm-forge-discount", amount: 1 }],
  },
});

const STANDING_RITUAL = testCard({
  id: "card-test-assembly-standing-ritual",
  playCost: { mechanical: 1, any: 1 },
  attribute: "mechanical",
  type: "ritual",
  subtypes: ["continuous"],
  ritual: {
    spend: { mechanical: 1, any: 1 },
    effects: [{ type: "reapply-die-modifiers" }],
    standingAbilities: [
      {
        type: "on-roll-symbol",
        symbol: "martial",
        rollingPlayer: "controller",
        effects: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
      },
    ],
  },
});

const DOUBLE_NEXT = testCard({
  id: "card-test-assembly-double",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  effect: {
    effects: [
      { type: "arm-resolve-next-face-effect-twice" },
      { type: "arm-resolve-next-face-effect-twice" },
    ],
  },
});

const REFORGE = testCard({
  id: "card-test-assembly-reforge",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  forge: { faces: 2, kind: "synthetic", attribute: "mechanical", target: "own-die" },
  effect: {
    effects: [{ type: "replace-synthetic-face", faces: 2, attribute: "mechanical" }],
  },
});

const SILENCE = testCard({
  id: "card-test-assembly-silence",
  playCost: { mechanical: 2, any: 1 },
  attribute: "mechanical",
  effect: {
    effects: [
      {
        type: "silence",
        hosts: ["face"],
        target: { kind: "choose-opponent-silence-host", hosts: ["face"] },
      },
    ],
  },
});

const playCard = (state: ReturnType<typeof newMatch>, index = 0) =>
  resolveOpenChain(
    expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, index),
      }),
    ),
  );

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][]) =>
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

describe("mechanical assembly", () => {
  it("choose-effect-mode opens for Cross forge", () => {
    const ready = actionsReady([CROSS_FORGE_CHOICE.id]);
    const played = playCard(ready);
    expect(played.pendingDecision?.type).toBe("choose-effect-mode");
  });

  it("a ritual places and can activate to arm forge discount", () => {
    const ready = actionsReady([FORGE_DISCOUNT_RITUAL.id]);
    const placed = playCard(ready);
    expect(ritualsOf(placed, P1)).toHaveLength(1);
    const ritualId = ritualsOf(placed, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("ritual");
    let activated = expectOk(
      advance(
        {
          ...placed,
          cards: {
            ...placed.cards,
            [ritualId]: { ...placed.cards[ritualId]!, ritualOrientation: "ready" },
          },
          players: {
            ...placed.players,
            [P1]: { ...placed.players[P1]!, attributePool: { mechanical: 4 } },
          },
        },
        { type: "ACTIVATE_RITUAL", playerId: P1, cardInstanceId: ritualId },
      ),
    );
    activated = resolveOpenChain(activated);
    expect(activated.log.some((entry) => entry.event.type === "ritual-activated")).toBe(true);
    expect(ritualsOf(activated, P1)).toHaveLength(1);
    expect(ritualsOf(activated, P1)[0]?.ritualOrientation).toBe("exhausted");
  });

  it("a standing ritual generates Mechanical on roll when active", () => {
    const ready = actionsReady([STANDING_RITUAL.id]);
    const placed = playCard(ready);
    let rolled = withPhase(placed, "roll");
    rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, 1), { retained: true, rolledSlotIndex: 4 });
    const after = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("Double arms the next face effect", () => {
    const after = playCard(actionsReady([DOUBLE_NEXT.id]));
    expect(after.resolveNextFaceEffectTwice[P1]).toBe(true);
  });

  it("Reforge opens replace-synthetic-face for any faces on one die", () => {
    let state = actionsReady([REFORGE.id]);
    const dieId = dieIdOf(state);
    state = {
      ...state,
      dice: {
        ...state.dice,
        [dieId]: {
          ...state.dice[dieId]!,
          slots: state.dice[dieId]!.slots.map((slot, index) =>
            index === 0
              ? { ...slot, faceCardId: TEST_SYNTHETIC_MECHANICAL_A, faceCardOwnerId: P1 }
              : slot,
          ),
        },
      },
    };
    const played = playCard(state);
    expect(played.pendingDecision?.type).toBe("replace-synthetic-face");
  });

  it("the test face deck lists the mechanical trio", () => {
    expect(TEST_FACE_DECK).toEqual(
      expect.arrayContaining([
        TEST_SYNTHETIC_MECHANICAL_A,
        TEST_SYNTHETIC_MECHANICAL_B,
        TEST_SYNTHETIC_MECHANICAL_C,
      ]),
    );
  });

  it("a generate-and-draw instant fuels the pile", () => {
    const after = playCard(actionsReady([TEST_PLAYABLE]));
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("Silence opens a host choice after play", () => {
    const after = playCard(actionsReady([SILENCE.id]));
    expect(after.pendingDecision?.type).toBe("choose-silence-host");
  });
});
