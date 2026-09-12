import { describe, expect, it } from "vitest";
import { ritualsOf } from "../rules/cards.js";
import {
  TEST_FACE_DECK,
  TEST_PLAYABLE,
  TEST_SYNTHETIC_MECHANICAL_A,
  TEST_SYNTHETIC_MECHANICAL_B,
  TEST_SYNTHETIC_MECHANICAL_C,
  testCard,
} from "../testing/fixtures/index.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withPile,
  withHand,
  withPhase,
  withShields,
  withShowingFaces,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";
import { CRANK } from "../testing/tempoCatalogue.js";

const SHIELD_AND_EMPOWER = testCard({
  id: "card-test-aggro-shield-empower",
  playCost: { luminar: 2 },
  attribute: "luminar",
  effect: {
    effects: [
      { type: "grant-shield", amount: 2, target: { kind: "choose-ally" } },
      { type: "next-attack-bonus", amount: 1 },
    ],
  },
});

const SILENCE_FACE = testCard({
  id: "card-test-aggro-silence",
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

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

describe("combat package", () => {
  it("grants shields and empowers", () => {
    const allyId = creatureIdAt(actionsReady([SHIELD_AND_EMPOWER.id]), P1, 0);
    const played = expectOk(
      advance(actionsReady([SHIELD_AND_EMPOWER.id]), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(actionsReady([SHIELD_AND_EMPOWER.id]), P1, 0),
      }),
    );
    const resolved = expectOk(
      advance(played, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: allyId,
      }),
    );
    expect(resolved.creatures[allyId]?.shields).toBe(2);
    expect(resolved.attackBonusThisTurn[P1]).toBe(1);
  });

  it("a generate-and-draw instant fuels the pile and draws", () => {
    const after = expectOk(
      advance(actionsReady([TEST_PLAYABLE]), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(actionsReady([TEST_PLAYABLE]), P1, 0),
      }),
    );
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("a silence instant opens a host choice on play", () => {
    const ready = actionsReady([SILENCE_FACE.id]);
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.pendingDecision?.type).toBe("choose-silence-host");
  });

  it("Crank damages through shields one point at a time", () => {
    const targetId = creatureIdAt(newMatch(), P2, 0);
    let state = withShields(withPhase(newMatch(), "actions"), targetId, 1);
    state = withShowingFaces(state, P1, ["mechanical"]);
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId: creatureIdAt(state, P1, 0),
        attackId: CRANK,
        targetId,
      }),
    );
    expect(after.creatures[targetId]?.damage).toBe(1);
    expect(after.creatures[targetId]?.shields).toBe(0);
  });
});

describe("face references", () => {
  it("the test face deck includes the mechanical specials", () => {
    expect(TEST_FACE_DECK).toEqual(
      expect.arrayContaining([
        TEST_SYNTHETIC_MECHANICAL_A,
        TEST_SYNTHETIC_MECHANICAL_B,
        TEST_SYNTHETIC_MECHANICAL_C,
      ]),
    );
  });

  it("has no continuous rituals in instant-only plays", () => {
    const after = expectOk(
      advance(actionsReady([TEST_PLAYABLE]), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(actionsReady([TEST_PLAYABLE]), P1, 0),
      }),
    );
    expect(ritualsOf(after, P1)).toHaveLength(0);
  });
});
