import { describe, expect, it } from "vitest";
import {
  TEST_PLAYABLE,
  TEST_SYNTHETIC_MECHANICAL_A,
  testCard,
} from "../testing/fixtures/index.js";
import {
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withPile,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const STAMP = testCard({
  id: "card-test-utility-stamp",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  effect: { effects: [{ type: "reapply-die-modifiers" }] },
});

const SILENCE = testCard({
  id: "card-test-utility-silence",
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

const REFORGE = testCard({
  id: "card-test-utility-reforge",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  forge: { faces: 2, kind: "synthetic", attribute: "mechanical", target: "own-die" },
  effect: {
    effects: [{ type: "replace-synthetic-face", faces: 2, attribute: "mechanical" }],
  },
});

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

describe("generic utility", () => {
  it("a generate-and-draw instant generates and draws", () => {
    const after = expectOk(
      advance(actionsReady([TEST_PLAYABLE]), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(actionsReady([TEST_PLAYABLE]), P1, 0),
      }),
    );
    expect(eventTypes(after)).toContain("symbol-generated");
  });

  it("Stamp opens after play", () => {
    const after = expectOk(
      advance(actionsReady([STAMP.id]), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(actionsReady([STAMP.id]), P1, 0),
      }),
    );
    expect(eventTypes(after)).toContain("card-played");
  });

  it("Silence opens a host choice", () => {
    const ready = actionsReady([SILENCE.id]);
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.pendingDecision?.type).toBe("choose-silence-host");
  });

  it("Reforge opens replace-synthetic-face", () => {
    let state = actionsReady([REFORGE.id]);
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
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
    const played = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("replace-synthetic-face");
  });
});
