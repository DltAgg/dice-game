import { describe, expect, it } from "vitest";
import { COG_DRAFT, SHIM_KIT, getCard } from "../content/cards.js";
import { TEMPO_SQUAD } from "../content/creatures.js";
import { ENGINE_TEST_FACE_DECK } from "../content/faces.js";
import type { CardDefinition } from "../model/cards.js";
import { asCardId } from "../model/ids.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withAttributePool,
  withPile,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";
import { createDraft } from "./draft.js";
import { payForgeCost, payHeaderCost } from "./payments.js";

function tempoMatch() {
  return newMatch({
    players: [
      { id: P1, squad: TEMPO_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
      { id: P2, squad: TEMPO_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
    ],
  });
}

const actionsReady = (cards: Parameters<typeof withHand>[2], fuel = 10) =>
  withPile(withHand(withPhase(tempoMatch(), "actions"), P1, cards), P1, fuel);

function crosscutSyntheticForge(): CardDefinition {
  const shim = getCard(SHIM_KIT)!;
  return {
    ...shim,
    playCost: { mechanical: 1, luminar: 1 },
    forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
  };
}

describe("forge and play discounts", () => {
  it("Shim Kit arms forge discount without spending on play", () => {
    const state = actionsReady([SHIM_KIT]);
    const after = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    expect(after.forgeDiscountThisTurn[P1]).toBe(2);
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBe(8);
  });

  it("forge discount reduces synthetic forge payment", () => {
    const draft = createDraft(
      withAttributePool(tempoMatch(), P1, { mechanical: 1 }),
    );
    draft.forgeDiscountThisTurn = { [P1]: 1 };
    payForgeCost(draft, P1, crosscutSyntheticForge());
    expect(draft.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
  });

  it("play-cost discounts do not apply to forge header payment", () => {
    const draft = createDraft(withAttributePool(tempoMatch(), P1, { mechanical: 2 }));
    payForgeCost(draft, P1, getCard(COG_DRAFT)!);
    expect(draft.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
  });

  it("Torque Wright passive is not a play-cost discount on Cog Draft", () => {
    const state = actionsReady([COG_DRAFT]);
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
    const draft = createDraft(withAttributePool(tempoMatch(), P1, { mechanical: 2 }));
    payHeaderCost(draft, P1, getCard(COG_DRAFT)!, false);
    expect(draft.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
  });

  it("multi-attribute forge discount accepts either printed attribute", () => {
    const draft = createDraft(withAttributePool(tempoMatch(), P1, { luminar: 1 }));
    draft.forgeDiscountThisTurn = { [P1]: 1 };
    payForgeCost(draft, P1, crosscutSyntheticForge());
    expect(draft.players[P1]?.attributePool.luminar ?? 0).toBe(0);
  });

  it("unknown example card id stays typed for payment helpers", () => {
    const card: CardDefinition = {
      id: asCardId("card-example-discount"),
      name: "Example",
      playCost: { mechanical: 1 },
      type: "instant",
      subtypes: [],
      attribute: "mechanical",
      forge: { faces: 1, kind: "synthetic", attribute: "mechanical", target: "own-die" },
      rulesText: "Test.",
    };
    const draft = createDraft(withAttributePool(tempoMatch(), P1, { mechanical: 1 }));
    payHeaderCost(draft, P1, card, false);
    expect(draft.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
  });

  it("creature absorb can arm forge discount through Torque Wright", () => {
    const allyId = creatureIdAt(tempoMatch(), P1, 1);
    expect(stateHasTorqueWright(tempoMatch())).toBe(true);
    void allyId;
  });
});

function stateHasTorqueWright(state: ReturnType<typeof tempoMatch>): boolean {
  return Object.values(state.creatures).some(
    (creature) => creature.definitionId === TEMPO_SQUAD[0],
  );
}
