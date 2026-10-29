import { describe, expect, it } from "vitest";
import { getCard } from "../content/cards.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import { asCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { advance } from "./reduce.js";
import { testCard } from "../testing/fixtures/builders.js";
import { TEST_SQUAD } from "../testing/fixtures/kit.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withHand,
  withPhase,
} from "../testing/scenario.js";

const ANCHOR_ID = asCardId("card-anchor");
const STOCK = testCard({ id: "card-test-anchor-stock" }).id;

function withMeter(state: GameState, meter: number): GameState {
  const player = state.players[P1];
  if (player === undefined) throw new Error("missing p1");
  return { ...state, players: { ...state.players, [P1]: { ...player, meter } } };
}

function ready(meter: number): GameState {
  const stocked = newMatch({
    config: {
      ...DEFAULT_RULES_CONFIG,
      deckMinCards: 0,
      deckMaxCopiesPerCard: 12,
      openingHandSize: 0,
      cardsDrawnPerTurn: 0,
      deckOutEnabled: false,
    },
    players: [
      { id: P1, squad: TEST_SQUAD, deck: Array.from({ length: 5 }, () => STOCK) },
      { id: P2, squad: TEST_SQUAD, deck: Array.from({ length: 5 }, () => STOCK) },
    ],
  });
  return withMeter(withHand(withPhase(stocked, "actions"), P1, [ANCHOR_ID]), meter);
}

function playAnchor(state: GameState): GameState {
  return resolveOpenChain(
    expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    ),
  );
}

function choose(state: GameState, modeIndex: number): GameState {
  return expectOk(
    advance(state, { type: "RESOLVE_CHOOSE_EFFECT_MODE", playerId: P1, modeIndex }),
  );
}

function discardOne(state: GameState): GameState {
  const hand = state.players[P1]?.hand ?? [];
  const cardInstanceId = hand[0];
  if (cardInstanceId === undefined) throw new Error("nothing to discard");
  return expectOk(
    advance(state, { type: "RESOLVE_DISCARD", playerId: P1, cardInstanceIds: [cardInstanceId] }),
  );
}

describe("Anchor", () => {
  it("offers draw 2 or spend 4 to draw 3, then discard 1", () => {
    const definition = getCard(ANCHOR_ID);
    expect(definition?.rulesText).toBe(
      "Choose one:\n· [Draw 2]; [Discard 1].\n· Spend 4 meter: [Draw 3]; [Discard 1].",
    );
    expect(definition?.lifecycle).toBe("one-shot");
    expect(definition?.equipment).toBeUndefined();

    const offered = playAnchor(ready(4));
    expect(offered.players[P1]?.meter).toBe(4);
    expect(offered.pendingDecision).toMatchObject({
      type: "choose-effect-mode",
      modeLabels: ["[Draw 2]; [Discard 1].", "Spend 4 meter: [Draw 3]; [Discard 1]."],
      modeMeterCosts: [0, 4],
    });

    const free = choose(offered, 0);
    expect(free.players[P1]?.meter).toBe(4);
    expect(free.players[P1]?.hand).toHaveLength(2);
    expect(free.pendingDecision).toMatchObject({ type: "discard-cards", amount: 1 });
    expect(discardOne(free).players[P1]?.hand).toHaveLength(1);

    const paid = choose(playAnchor(ready(4)), 1);
    expect(paid.players[P1]?.meter).toBe(0);
    expect(paid.players[P1]?.hand).toHaveLength(3);
    expect(paid.pendingDecision).toMatchObject({ type: "discard-cards", amount: 1 });
    expect(discardOne(paid).players[P1]?.hand).toHaveLength(2);
  });

  it("draws 2 and discards 1 when 4 Meter is not available", () => {
    const resolved = playAnchor(ready(3));
    expect(resolved.pendingDecision?.type).not.toBe("choose-effect-mode");
    expect(resolved.players[P1]?.meter).toBe(3);
    expect(resolved.players[P1]?.hand).toHaveLength(2);
    expect(resolved.pendingDecision).toMatchObject({ type: "discard-cards", amount: 1 });
    expect(discardOne(resolved).players[P1]?.hand).toHaveLength(1);
  });
});
