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

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withHand(withPhase(newMatch(), "actions"), P1, cards);

describe("forge and play discounts", () => {
  it("a silence instant opens a host choice without pile payment", () => {
    const state = actionsReady([SILENCE_FACE.id]);
    const after = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    expect(after.pendingDecision?.type).toBe("choose-silence-host");
  });

  it("payment helpers are no-ops after pile removal", () => {
    const draft = createDraft(newMatch());
    draft.forgeDiscountThisTurn = { [P1]: 1 };
    expect(payForgeCost(draft, P1, CROSSCUT_SYNTHETIC)).toBeNull();
    expect(payHeaderCost(draft, P1, getCard(TEST_PLAYABLE)!, false)).toBeNull();
  });

  it("plays a header-cost instant without pile setup", () => {
    const state = actionsReady([TEST_PLAYABLE]);
    const after = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    expect(after.players[P1]?.hand).not.toContain(handCardIdAt(state, P1, 0));
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
    const draft = createDraft(newMatch());
    expect(payHeaderCost(draft, P1, card, false)).toBeNull();
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
    const ready = withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]);
    const armed = armOnRollDiscount(ready);
    expect(armed.playCostDiscountThisTurn[P1]).toBe(1);
    const after = expectOk(
      advance(armed, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.players[P1]?.hand).not.toContain(handCardIdAt(ready, P1, 0));
  });

  it("does not change forge payment helpers", () => {
    const draft = armOnRollDiscount(newMatch());
    expect(payForgeCost(draft, P1, getCard(TEST_PLAYABLE)!)).toBeNull();
    expect(draft.playCostDiscountThisTurn[P1]).toBe(1);
  });

  it("expires at end of turn if unspent", () => {
    const armed = armOnRollDiscount(withPhase(newMatch(), "actions"));
    expect(armed.playCostDiscountThisTurn[P1]).toBe(1);
    const after = expectOk(advance(armed, { type: "END_TURN", playerId: P1 }));
    expect(after.playCostDiscountThisTurn[P1]).toBeUndefined();
  });
});
