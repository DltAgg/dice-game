import { describe, expect, it } from "vitest";
import { getCard } from "../content/cards.js";
import type { CardDefinition } from "../model/cards.js";
import { asCardId } from "../model/ids.js";
import {
  TEST_PLAYABLE,
  testCard,
} from "../testing/fixtures/index.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withAttributePool,
  withPile,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";
import { createDraft } from "./draft.js";
import { payForgeCost, payHeaderCost } from "./payments.js";
import { drainResolution, pushEffect } from "./resolution.js";

const SILENCE_FACE = testCard({
  id: "card-test-silence-face",
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

const CROSSCUT_SYNTHETIC = testCard({
  id: "card-test-crosscut-synthetic",
  playCost: { mechanical: 1, luminar: 1 },
  attribute: "mechanical",
  forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
});

const actionsReady = (cards: Parameters<typeof withHand>[2], fuel = 10) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, fuel);

describe("forge and play discounts", () => {
  it("a silence instant opens a host choice without consuming extra pile", () => {
    const state = actionsReady([SILENCE_FACE.id]);
    const after = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    expect(after.pendingDecision?.type).toBe("choose-silence-host");
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBe(8);
  });

  it("forge discount reduces synthetic forge payment", () => {
    const draft = createDraft(
      withAttributePool(newMatch(), P1, { mechanical: 1 }),
    );
    draft.forgeDiscountThisTurn = { [P1]: 1 };
    payForgeCost(draft, P1, CROSSCUT_SYNTHETIC);
    expect(draft.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
  });

  it("play-cost discounts do not apply to forge header payment", () => {
    const draft = createDraft(withAttributePool(newMatch(), P1, { mechanical: 2 }));
    payForgeCost(draft, P1, getCard(TEST_PLAYABLE)!);
    expect(draft.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
  });

  it("creature passives are not a play-cost discount on a 2-cost instant", () => {
    const state = actionsReady([TEST_PLAYABLE]);
    const first = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    expect(first.players[P1]?.attributePool.mechanical).toBe(10);
  });

  it("payHeaderCost consumes pile tokens", () => {
    const draft = createDraft(withAttributePool(newMatch(), P1, { mechanical: 2 }));
    payHeaderCost(draft, P1, getCard(TEST_PLAYABLE)!, false);
    expect(draft.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
  });

  it("multi-attribute forge discount accepts either printed attribute", () => {
    const draft = createDraft(withAttributePool(newMatch(), P1, { luminar: 1 }));
    draft.forgeDiscountThisTurn = { [P1]: 1 };
    payForgeCost(draft, P1, CROSSCUT_SYNTHETIC);
    expect(draft.players[P1]?.attributePool.luminar ?? 0).toBe(0);
  });

  it("unknown example card id stays typed for payment helpers", () => {
    const card: CardDefinition = {
      id: asCardId("card-test-example-discount"),
      name: "Example",
      playCost: { mechanical: 1 },
      type: "instant",
      subtypes: [],
      attribute: "mechanical",
      forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
      rulesText: "Test.",
    };
    const draft = createDraft(withAttributePool(newMatch(), P1, { mechanical: 1 }));
    payHeaderCost(draft, P1, card, false);
    expect(draft.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
  });
});

describe("On roll play-cost-discount", () => {
  function armOnRollDiscount(state: ReturnType<typeof newMatch>, amount = 1) {
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    const draft = createDraft(state);
    pushEffect(
      draft,
      P1,
      { type: "play-cost-discount", amount },
      null,
      null,
      null,
      dieId,
      0,
    );
    drainResolution(draft);
    return draft;
  }

  it("arms from the on-roll push path and cheapens the next play", () => {
    const ready = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]),
      P1,
      { mechanical: 1 },
    );
    const denied = advance(ready, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(ready, P1, 0),
    });
    expect(denied.ok).toBe(false);

    const armed = armOnRollDiscount(ready);
    expect(armed.playCostDiscountThisTurn[P1]).toBe(1);
    const after = expectOk(
      advance(armed, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBe(2);
    expect(after.playCostDiscountThisTurn[P1]).toBeUndefined();
  });

  it("does not cheapen synthetic forge", () => {
    const draft = armOnRollDiscount(withAttributePool(newMatch(), P1, { mechanical: 2 }));
    payForgeCost(draft, P1, getCard(TEST_PLAYABLE)!);
    expect(draft.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
    expect(draft.playCostDiscountThisTurn[P1]).toBe(1);
  });

  it("expires at end of turn if unspent", () => {
    const armed = armOnRollDiscount(withPhase(newMatch(), "actions"));
    expect(armed.playCostDiscountThisTurn[P1]).toBe(1);
    const after = expectOk(advance(armed, { type: "END_TURN", playerId: P1 }));
    expect(after.playCostDiscountThisTurn[P1]).toBeUndefined();
  });
});
