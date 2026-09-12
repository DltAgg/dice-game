import { describe, expect, it } from "vitest";
import { equipmentOf, ritualsOf } from "../rules/cards.js";
import { advance } from "./reduce.js";
import {
  TEST_BODY_A,
  TEST_BODY_B,
  TEST_PLAYABLE,
  TEST_REACTION_PREVENT,
  testCard,
} from "../testing/fixtures/index.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withPile,
  withHand,
  withPhase,
  withShowingFaces,
} from "../testing/scenario.js";
import { CRANK, DRIVE_SHAFT } from "../testing/tempoCatalogue.js";

const PREVENT_AND_DRAW = testCard({
  id: "card-test-control-prevent-draw",
  playCost: { luminar: 2 },
  attribute: "luminar",
  type: "reaction",
  effect: {
    effects: [
      { type: "grant-attack-prevent", amount: 1, target: { kind: "chain-attack-target" } },
      { type: "draw-cards", amount: 1 },
    ],
  },
});

const PREVENT_REFLECT = testCard({
  id: "card-test-control-prevent-reflect",
  playCost: { luminar: 3 },
  attribute: "luminar",
  type: "reaction",
  effect: { effects: [{ type: "prevent-attack-reflect" }] },
});

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

describe("control effects", () => {
  it("a prevent reaction stops the attack and can draw on prevent", () => {
    const base = withPhase(newMatch(), "actions");
    const attacker = creatureIdAt(base, P1, 0);
    const target = creatureIdAt(base, P2, 0);
    const combat = withHand(withPile(withShowingFaces(base, P1, ["mechanical"]), P2, 10), P2, [
      PREVENT_AND_DRAW.id,
    ]);
    const opened = expectOk(
      advance(combat, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: CRANK,
        targetId: target,
      }),
    );
    const judged = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(judged);
    expect(resolved.creatures[target]?.damage).toBe(0);
  });

  it("prevent-reflect reflects prevented attack damage", () => {
    const base = withPhase(newMatch(), "actions");
    const attacker = creatureIdAt(base, P1, 2);
    const target = creatureIdAt(base, P2, 0);
    const combat = withHand(
      withPile(withShowingFaces(base, P1, ["mechanical"]), P2, 10),
      P2,
      [PREVENT_REFLECT.id],
    );
    const opened = expectOk(
      advance(combat, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: DRIVE_SHAFT,
        targetId: target,
      }),
    );
    const judged = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(judged);
    expect(resolved.creatures[attacker]?.damage).toBeGreaterThan(0);
    expect(eventTypes(resolved)).toContain("damage-prevented");
  });

  it("a prevent reaction rejects non-attack chain tops", () => {
    const ready = withHand(
      withPile(withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]), P1, 10),
      P2,
      [TEST_REACTION_PREVENT],
    );
    const opened = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const denied = advance(opened, {
      type: "PLAY_CARD",
      playerId: P2,
      cardInstanceId: handCardIdAt(opened, P2, 0),
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error).toBe("INVALID_CHAIN_TARGET");
  });

  it("a prevent reaction in hand is not a field ritual or equipment", () => {
    expect(ritualsOf(actionsReady([TEST_REACTION_PREVENT]), P1)).toHaveLength(0);
    expect(equipmentOf(actionsReady([TEST_REACTION_PREVENT]), P1)).toHaveLength(0);
  });

  it("frontline creatures are the test bodies", () => {
    const state = newMatch();
    expect(state.creatures[creatureIdAt(state, P1, 0)]?.definitionId).toBe(TEST_BODY_A);
    expect(state.creatures[creatureIdAt(state, P1, 1)]?.definitionId).toBe(TEST_BODY_B);
  });
});
