import { describe, expect, it } from "vitest";
import { TEST_LEGAL_DECK, TEST_PLAYABLE, testCard } from "../testing/fixtures/index.js";
import { handOf, graveyardOf } from "../rules/cards.js";
import {
  eventTypes,
  handCardIdAt,
  newMatchWithDecks,
  newMatch,
  P1,
  P2,
  withAttributePool,
  withPile,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const STAMP = testCard({
  id: "card-test-stamp",
  name: "Test Stamp",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  effect: { effects: [{ type: "reapply-die-modifiers" }] },
});

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][], fuel = 10) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, fuel);

describe("playing a card for its effect", () => {
  it("resolves the effect and spends the play cost", () => {
    const state = actionsReady([TEST_PLAYABLE]);
    const cardInstanceId = handCardIdAt(state, P1, 0);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[P1]?.attributePool.mechanical).toBe(10);
    expect(eventTypes(result.state)).toContain("card-played");
    expect(graveyardOf(result.state, P1).map((card) => card.id)).toEqual([cardInstanceId]);
  });

  it("sends the card to the graveyard", () => {
    const state = actionsReady([TEST_PLAYABLE]);
    const cardInstanceId = handCardIdAt(state, P1, 0);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(handOf(result.state, P1)).toHaveLength(0);
    expect(graveyardOf(result.state, P1).map((card) => card.id)).toEqual([cardInstanceId]);
  });

  it("draws one when the deck has cards", () => {
    const ready = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE, TEST_PLAYABLE]),
      P1,
      10,
    );
    const player = ready.players[P1];
    if (player === undefined) throw new Error("test: no player");
    const deckCardId = handCardIdAt(ready, P1, 1);
    const seeded = {
      ...ready,
      cards: {
        ...ready.cards,
        [deckCardId]: { ...ready.cards[deckCardId]!, zone: "deck" as const },
      },
      players: {
        ...ready.players,
        [P1]: { ...player, hand: [handCardIdAt(ready, P1, 0)], deck: [deckCardId] },
      },
    };

    const result = advance(seeded, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(seeded, P1, 0),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(eventTypes(result.state).filter((type) => type === "card-drawn")).toHaveLength(1);
    expect(result.state.players[P1]?.hand).toHaveLength(1);
  });
});

describe("play cost and the pile", () => {
  it("refuses when the pile lacks the play cost", () => {
    const state = withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INSUFFICIENT_SYMBOLS");
  });

  it("does not end the turn automatically after playing", () => {
    const state = actionsReady([TEST_PLAYABLE]);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.activePlayerId).toBe(P1);
    expect(eventTypes(result.state)).not.toContain("turn-ended");
  });

  it("refuses PLAY_CARD from a non-active player", () => {
    const state = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]),
      P1,
      10,
    );
    const p2Turn = { ...state, activePlayerId: P2 };

    const result = advance(p2Turn, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(p2Turn, P1, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("NOT_ACTIVE_PLAYER");
  });

  it("a 2-cost play with exactly 2 Mechanical spends the header once", () => {
    const state = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [STAMP.id]),
      P1,
      { mechanical: 2 },
    );

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
  });

  it("a 2-cost play does not burn a third Mechanical", () => {
    const state = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [STAMP.id]),
      P1,
      { mechanical: 3 },
    );

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[P1]?.attributePool.mechanical).toBe(1);
  });

  it("a 2-cost play fails when the pile cannot cover the header", () => {
    const state = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]),
      P1,
      { mechanical: 1 },
    );

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INSUFFICIENT_SYMBOLS");
  });

  it("a stamp instant spends header 2 Mechanical", () => {
    const state = withAttributePool(
      withHand(withPhase(newMatch(), "actions"), P1, [STAMP.id]),
      P1,
      { mechanical: 2 },
    );

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
  });
});

describe("what playing refuses", () => {
  it("plays a stamp instant and resolves", () => {
    const state = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [STAMP.id]),
      P1,
      10,
    );

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(graveyardOf(result.state, P1)).toHaveLength(1);
  });

  it("refuses outside the actions phase", () => {
    const state = withPile(withHand(withPhase(newMatch(), "roll"), P1, [TEST_PLAYABLE]), P1, 10);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_PHASE");
  });

  it("refuses another player's card", () => {
    const state = withPile(
      withHand(withHand(withPhase(newMatch(), "actions"), P2, [TEST_PLAYABLE]), P1, []),
      P1,
      10,
    );

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("CARD_NOT_AVAILABLE");
  });
});

describe("drawing", () => {
  it("deals the opening five and leaves the rest in the deck", () => {
    const state = newMatchWithDecks();

    expect(state.players[P1]?.hand).toHaveLength(5);
    expect(state.players[P1]?.deck).toHaveLength(TEST_LEGAL_DECK.length - 5);
    expect(state.players[P2]?.hand).toHaveLength(5);
  });

  it("shuffles the two decks differently from one seed", () => {
    const state = newMatchWithDecks({ seed: 4242 });

    const first = (state.players[P1]?.hand ?? []).map((id) => state.cards[id]?.cardId);
    const second = (state.players[P2]?.hand ?? []).map((id) => state.cards[id]?.cardId);

    expect(first).not.toEqual(second);
  });

  it("draws two on entering your own turn", () => {
    const state = newMatchWithDecks();

    const result = advance(state, { type: "END_TURN", playerId: P1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[P2]?.hand).toHaveLength(7);
    expect(result.state.players[P1]?.hand).toHaveLength(5);
    expect(eventTypes(result.state).filter((type) => type === "card-drawn")).toHaveLength(2);
  });

  it("stops quietly once the deck is empty", () => {
    const state = newMatchWithDecks();
    const player = state.players[P2];
    if (player === undefined) throw new Error("test: no player");
    const emptied = {
      ...state,
      players: { ...state.players, [P2]: { ...player, deck: [] } },
    };

    const result = advance(emptied, { type: "END_TURN", playerId: P1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("in-progress");
    expect(eventTypes(result.state)).toContain("deck-empty");
  });
});
