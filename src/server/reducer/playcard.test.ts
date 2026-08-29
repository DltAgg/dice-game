import { describe, expect, it } from "vitest";
import {
  ARCANE_ECHO,
  ECLIPSE,
  PROTOTYPE_DECK,
} from "../content/cards.js";
import { handOf, graveyardOf } from "../rules/cards.js";
import {
  eventTypes,
  handCardIdAt,
  newMatchWithDecks,
  newMatch,
  P1,
  P2,
  withEnergy,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

/**
 * The effect region. Playing a card spends from the attribute pile (spec `016`).
 */

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][], fuel = 10) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, fuel);

describe("playing a card for its effect", () => {
  it("resolves the effect and spends the play cost", () => {
    const state = actionsReady([ECLIPSE]);
    const cardInstanceId = handCardIdAt(state, P1, 0);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[P1]?.attributePool.darkness).toBe(8);
    expect(eventTypes(result.state)).toContain("card-played");
    expect(graveyardOf(result.state, P1).map((card) => card.id)).toEqual([cardInstanceId]);
  });

  it("sends the card to the graveyard", () => {
    const state = actionsReady([ECLIPSE]);
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

  it("draws two and discards one for Eclipse", () => {
    // newMatch() has an empty deck, so seed two cards for the draw and leave
    // Eclipse alone in hand.
    const ready = withEnergy(
      withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE, ECLIPSE, ECLIPSE]),
      P1,
      10,
    );
    const player = ready.players[P1];
    if (player === undefined) throw new Error("test: no player");
    const deckCardA = handCardIdAt(ready, P1, 1);
    const deckCardB = handCardIdAt(ready, P1, 2);
    const seeded = {
      ...ready,
      cards: {
        ...ready.cards,
        [deckCardA]: { ...ready.cards[deckCardA]!, zone: "deck" as const },
        [deckCardB]: { ...ready.cards[deckCardB]!, zone: "deck" as const },
      },
      players: {
        ...ready.players,
        [P1]: {
          ...player,
          hand: [handCardIdAt(ready, P1, 0)],
          deck: [deckCardA, deckCardB],
        },
      },
    };

    const result = advance(seeded, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(seeded, P1, 0),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(eventTypes(result.state).filter((type) => type === "card-drawn")).toHaveLength(2);
    expect(result.state.pendingDecision).toMatchObject({
      type: "discard-cards",
      controllerId: P1,
      amount: 1,
    });

    const hand = result.state.players[P1]?.hand ?? [];
    expect(hand).toHaveLength(2);
    const discarded = advance(result.state, {
      type: "RESOLVE_DISCARD",
      playerId: P1,
      cardInstanceIds: [hand[0]!],
    });
    expect(discarded.ok).toBe(true);
    if (!discarded.ok) return;
    expect(eventTypes(discarded.state)).toContain("card-discarded");
    expect(discarded.state.pendingDecision).toBeNull();
    expect(discarded.state.players[P1]?.hand).toHaveLength(1);
  });
});

describe("play cost and the pile", () => {
  it("refuses when the pile lacks the play cost", () => {
    const state = withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INSUFFICIENT_SYMBOLS");
  });

  it("does not end the turn automatically after playing", () => {
    const state = actionsReady([ECLIPSE]);

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

  it("keeps the turn through a discard pending decision", () => {
    const ready = withEnergy(
      withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE, ECLIPSE]),
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

    const played = advance(seeded, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(seeded, P1, 0),
    });
    expect(played.ok).toBe(true);
    if (!played.ok) return;
    expect(played.state.activePlayerId).toBe(P1);
    expect(played.state.pendingDecision).toMatchObject({
      type: "discard-cards",
      amount: 1,
    });

    const hand = played.state.players[P1]?.hand ?? [];
    const resolved = advance(played.state, {
      type: "RESOLVE_DISCARD",
      playerId: P1,
      cardInstanceIds: [hand[0]!],
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.state.activePlayerId).toBe(P1);
    expect(eventTypes(resolved.state)).toContain("card-discarded");
    expect(eventTypes(resolved.state)).not.toContain("turn-ended");
  });

  it("refuses PLAY_CARD from a non-active player", () => {
    const state = withEnergy(
      withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]),
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
});

describe.skip("rituals on the field", () => {
  it("parked — 016 Phase 4 ritual content", () => {});
});

describe("what playing refuses", () => {
  it("plays Arcane Echo and asks which die to re-apply", () => {
    const state = actionsReady([ARCANE_ECHO]);

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
    const state = withEnergy(withHand(withPhase(newMatch(), "roll"), P1, [ECLIPSE]), P1, 10);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_PHASE");
  });

  it("refuses another player's card", () => {
    const state = withEnergy(
      withHand(withHand(withPhase(newMatch(), "actions"), P2, [ECLIPSE]), P1, []),
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
    expect(state.players[P1]?.deck).toHaveLength(PROTOTYPE_DECK.length - 5);
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
    // The outgoing player is not topped up.
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
