import { describe, expect, it } from "vitest";
import {
  ARCANE_ECHO,
  ECLIPSE,
  ETERNAL_DARKNESS,
  LIVING_LIBRARY,
  PROTOTYPE_DECK,
  WAR_AXE,
  getCard,
} from "../content/cards.js";
import { handOf, graveyardOf, ritualsOf, searchableInDeck } from "../rules/cards.js";
import {
  creatureIdAt,
  eventTypes,
  handCardIdAt,
  newMatchWithDecks,
  newMatch,
  P1,
  P2,
  withEnergy,
  withHand,
  withPhase,
  withSymbols,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

/**
 * The effect region. Playing a card costs Energy and can therefore end the turn
 * (bible §18), which is the pacing pressure that makes a hand of cheap cards
 * different from a hand of expensive ones.
 */

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][], energy = 10) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

describe("playing a card for its effect", () => {
  it("resolves the effect and spends the Energy", () => {
    const state = actionsReady([ECLIPSE]);
    const cardInstanceId = handCardIdAt(state, P1, 0);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.energy).toEqual({ holderId: P1, value: 7 });
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
    expect(result.state.pendingDecision).toEqual({
      type: "discard-cards",
      controllerId: P1,
      amount: 1,
      turnEnds: false,
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

describe("Energy and the turn", () => {
  it("ends the turn when the cost pushes the marker past zero", () => {
    const state = actionsReady([ECLIPSE], 2);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
      declaredTargetCreatureId: creatureIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Empty deck → no draw → no discard pending → turn ends immediately.
    expect(result.state.activePlayerId).toBe(P2);
    expect(result.state.energy).toEqual({ holderId: P2, value: 3 });
    expect(result.state.phase).toBe("roll");
    expect(eventTypes(result.state)).toContain("turn-ended");
  });

  it("does not end the turn on landing exactly on zero", () => {
    const state = actionsReady([ECLIPSE], 3);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.activePlayerId).toBe(P1);
    expect(result.state.energy).toEqual({ holderId: P1, value: 0 });
  });

  it("defers the Energy overshoot until the discard is chosen", () => {
    const ready = withEnergy(
      withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE, ECLIPSE]),
      P1,
      1,
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
    expect(played.state.deferredTurnEndPlayerId).toBe(P1);
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
    expect(resolved.state.activePlayerId).toBe(P2);
    expect(resolved.state.energy).toEqual({ holderId: P2, value: 4 });
    expect(eventTypes(resolved.state)).toContain("card-discarded");
    expect(eventTypes(resolved.state)).toContain("turn-ended");
  });

  it("refuses a spend by the player who does not hold the marker", () => {
    const state = withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]), P2, 10);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INSUFFICIENT_ENERGY");
  });
});

describe("rituals on the field", () => {
  it("places a Ritual preparing without checking Active when yet", () => {
    const state = actionsReady([LIVING_LIBRARY]);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [ritual] = ritualsOf(result.state, P1);
    expect(ritual?.zone).toBe("ritual");
    expect(ritual?.ritualOrientation).toBe("preparing");
    expect(eventTypes(result.state)).toContain("ritual-placed");
  });

  it("banks Active-when progress when a rolled symbol is absorbed onto the ritual", () => {
    const placed = advance(actionsReady([LIVING_LIBRARY]), {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(actionsReady([LIVING_LIBRARY]), P1, 0),
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const ritualId = ritualsOf(placed.state, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("test: no ritual");

    // Pool leftovers do not auto-credit — rituals stay empty until assigned.
    const skipped = advance(
      withSymbols(withPhase(placed.state, "absorption"), P1, ["arcane", "arcane"], "rolled"),
      { type: "ADVANCE_PHASE", playerId: P1 },
    );
    expect(skipped.ok).toBe(true);
    if (!skipped.ok) return;
    expect(ritualsOf(skipped.state, P1)[0]?.ritualOrientation).toBe("preparing");
    expect(ritualsOf(skipped.state, P1)[0]?.ritualProgress).toEqual({});

    const absorbing = withSymbols(
      withPhase(placed.state, "absorption"),
      P1,
      ["arcane", "arcane"],
      "rolled",
    );
    const [firstArcane, secondArcane] = Object.values(absorbing.symbols).filter(
      (symbol) => symbol.status === "rolled" && symbol.symbol === "arcane",
    );
    if (firstArcane === undefined || secondArcane === undefined) {
      throw new Error("test: missing arcane symbols");
    }

    const first = advance(absorbing, {
      type: "ABSORB_SYMBOL_TO_RITUAL",
      playerId: P1,
      cardInstanceId: ritualId,
      symbolId: firstArcane.id,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(ritualsOf(first.state, P1)[0]?.ritualOrientation).toBe("preparing");
    expect(ritualsOf(first.state, P1)[0]?.ritualProgress).toEqual({ arcane: 1 });
    expect(first.state.symbols[firstArcane.id]?.status).toBe("consumed");

    // Second Arcane the same turn is refused (one pip per attribute per turn).
    const sameTurn = advance(first.state, {
      type: "ABSORB_SYMBOL_TO_RITUAL",
      playerId: P1,
      cardInstanceId: ritualId,
      symbolId: secondArcane.id,
    });
    expect(sameTurn.ok).toBe(false);

    // Next owner turn clears the per-turn credit; a second Arcane finishes the gate.
    const afterSkip = advance(first.state, { type: "ADVANCE_PHASE", playerId: P1 });
    expect(afterSkip.ok).toBe(true);
    if (!afterSkip.ok) return;
    const afterP1End = advance(afterSkip.state, { type: "END_TURN", playerId: P1 });
    expect(afterP1End.ok).toBe(true);
    if (!afterP1End.ok) return;
    const afterP2End = advance(afterP1End.state, { type: "END_TURN", playerId: P2 });
    expect(afterP2End.ok).toBe(true);
    if (!afterP2End.ok) return;

    const nextAbsorb = withSymbols(withPhase(afterP2End.state, "absorption"), P1, ["arcane"], "rolled");
    const nextArcane = Object.values(nextAbsorb.symbols).find(
      (symbol) => symbol.status === "rolled" && symbol.symbol === "arcane",
    );
    if (nextArcane === undefined) throw new Error("test: missing next arcane");

    const second = advance(nextAbsorb, {
      type: "ABSORB_SYMBOL_TO_RITUAL",
      playerId: P1,
      cardInstanceId: ritualId,
      symbolId: nextArcane.id,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(ritualsOf(second.state, P1)[0]?.ritualOrientation).toBe("ready");
    expect(ritualsOf(second.state, P1)[0]?.ritualProgress).toEqual({ arcane: 2 });
    expect(eventTypes(second.state)).toContain("ritual-orientation-changed");
  });

  it("activates a ready Instant ritual and opens a deck search", () => {
    const base = withEnergy(
      withHand(withPhase(newMatch(), "actions"), P1, [LIVING_LIBRARY, ECLIPSE, ECLIPSE]),
      P1,
      10,
    );
    const player = base.players[P1];
    if (player === undefined) throw new Error("test: no player");
    // Put two Eclipses in the deck so the search has targets.
    const [ritualHand, ...deckIds] = player.hand;
    if (ritualHand === undefined) throw new Error("test: no ritual");
    const seeded = {
      ...base,
      cards: Object.fromEntries(
        Object.entries(base.cards).map(([id, card]) => [
          id,
          deckIds.includes(card.id) ? { ...card, zone: "deck" as const } : card,
        ]),
      ),
      players: {
        ...base.players,
        [P1]: { ...player, hand: [ritualHand], deck: deckIds },
      },
    };

    const placed = advance(seeded, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: ritualHand,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const ritualId = ritualsOf(placed.state, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("test: no ritual");

    const ready = withSymbols(withPhase(placed.state, "actions"), P1, ["arcane", "arcane"]);
    const oriented = {
      ...ready,
      cards: {
        ...ready.cards,
        [ritualId]: {
          ...ready.cards[ritualId]!,
          ritualOrientation: "ready" as const,
          ritualProgress: { arcane: 2 },
        },
      },
    };

    const activated = advance(oriented, {
      type: "ACTIVATE_RITUAL",
      playerId: P1,
      cardInstanceId: ritualId,
    });

    expect(activated.ok).toBe(true);
    if (!activated.ok) return;
    expect(eventTypes(activated.state)).toContain("ritual-activated");
    expect(eventTypes(activated.state)).toContain("search-started");
    expect(activated.state.pendingDecision).toEqual({
      type: "search-deck",
      controllerId: P1,
      amount: 2,
      filter: ["instant", "ritual"],
    });
    expect(ritualsOf(activated.state, P1)).toHaveLength(0);
    expect(graveyardOf(activated.state, P1).some((card) => card.id === ritualId)).toBe(true);

    const picks = activated.state.players[P1]?.deck.slice(0, 2) ?? [];
    const resolved = advance(activated.state, {
      type: "RESOLVE_SEARCH",
      playerId: P1,
      cardInstanceIds: picks,
    });

    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.state.pendingDecision).toBeNull();
    expect(resolved.state.players[P1]?.hand).toHaveLength(2);
    expect(eventTypes(resolved.state)).toContain("search-resolved");
  });

  it("Living Library search only offers Instant and Ritual cards", () => {
    const base = withEnergy(
      withHand(withPhase(newMatch(), "actions"), P1, [
        LIVING_LIBRARY,
        ECLIPSE,
        WAR_AXE,
        LIVING_LIBRARY,
      ]),
      P1,
      10,
    );
    const player = base.players[P1];
    if (player === undefined) throw new Error("test: no player");
    const [ritualHand, ...deckIds] = player.hand;
    if (ritualHand === undefined) throw new Error("test: no ritual");
    const seeded = {
      ...base,
      cards: Object.fromEntries(
        Object.entries(base.cards).map(([id, card]) => [
          id,
          deckIds.includes(card.id) ? { ...card, zone: "deck" as const } : card,
        ]),
      ),
      players: {
        ...base.players,
        [P1]: { ...player, hand: [ritualHand], deck: deckIds },
      },
    };

    const placed = advance(seeded, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: ritualHand,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const ritualId = ritualsOf(placed.state, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("test: no ritual");

    const oriented = {
      ...withSymbols(withPhase(placed.state, "actions"), P1, ["arcane", "arcane"]),
      cards: {
        ...placed.state.cards,
        [ritualId]: {
          ...placed.state.cards[ritualId]!,
          ritualOrientation: "ready" as const,
          ritualProgress: { arcane: 2 },
        },
      },
    };

    const activated = advance(oriented, {
      type: "ACTIVATE_RITUAL",
      playerId: P1,
      cardInstanceId: ritualId,
    });
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;

    expect(activated.state.pendingDecision).toEqual({
      type: "search-deck",
      controllerId: P1,
      amount: 2,
      filter: ["instant", "ritual"],
    });

    const eligible = searchableInDeck(activated.state, P1, ["instant", "ritual"]);
    expect(eligible).toHaveLength(2);
    for (const id of eligible) {
      const instance = activated.state.cards[id];
      const definition = instance !== undefined ? getCard(instance.cardId) : undefined;
      expect(definition?.type === "instant" || definition?.type === "ritual").toBe(true);
    }

    const axeId = deckIds.find((id) => activated.state.cards[id]?.cardId === WAR_AXE);
    if (axeId === undefined) throw new Error("test: no axe in deck");
    const rejected = advance(activated.state, {
      type: "RESOLVE_SEARCH",
      playerId: P1,
      cardInstanceIds: [axeId, eligible[0]!],
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error).toBe("INVALID_SEARCH");
  });

  it("refuses other actions while a search is pending", () => {
    const placed = advance(actionsReady([LIVING_LIBRARY]), {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(actionsReady([LIVING_LIBRARY]), P1, 0),
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const ritualId = ritualsOf(placed.state, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("test: no ritual");

    // Force ready with an empty deck — amount 0 auto-completes; seed one card.
    const withDeck = withEnergy(
      withHand(withPhase(placed.state, "actions"), P1, [ECLIPSE]),
      P1,
      10,
    );
    const p = withDeck.players[P1];
    if (p === undefined) throw new Error("test: no player");
    const [deckCard] = p.hand;
    if (deckCard === undefined) throw new Error("test: no deck card");
    const waiting = {
      ...withDeck,
      cards: {
        ...withDeck.cards,
        [deckCard]: { ...withDeck.cards[deckCard]!, zone: "deck" as const },
        [ritualId]: {
          ...withDeck.cards[ritualId]!,
          zone: "ritual" as const,
          ritualOrientation: "ready" as const,
          ritualProgress: { arcane: 2 },
        },
      },
      players: {
        ...withDeck.players,
        [P1]: {
          ...p,
          hand: [],
          deck: [deckCard],
          ritual: [...(placed.state.players[P1]?.ritual ?? [])],
        },
      },
      symbols: withSymbols(withDeck, P1, ["arcane", "arcane"]).symbols,
    };

    const activated = advance(waiting, {
      type: "ACTIVATE_RITUAL",
      playerId: P1,
      cardInstanceId: ritualId,
    });
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;
    expect(activated.state.pendingDecision?.type).toBe("search-deck");
    if (activated.state.pendingDecision?.type === "search-deck") {
      expect(activated.state.pendingDecision.amount).toBe(1);
    }

    const blocked = advance(activated.state, { type: "END_TURN", playerId: P1 });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toBe("PENDING_DECISION");
  });

  it("refuses activation while still preparing", () => {
    const placed = advance(actionsReady([LIVING_LIBRARY]), {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(actionsReady([LIVING_LIBRARY]), P1, 0),
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const ritualId = ritualsOf(placed.state, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("test: no ritual");

    const result = advance(withPhase(placed.state, "actions"), {
      type: "ACTIVATE_RITUAL",
      playerId: P1,
      cardInstanceId: ritualId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("CARD_NOT_AVAILABLE");
  });

  it("places Eternal Darkness as a Ritual from hand", () => {
    const state = actionsReady([ETERNAL_DARKNESS]);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(ritualsOf(result.state, P1)[0]?.ritualOrientation).toBe("preparing");
  });

  it("returns up to three cards from the graveyard when Eternal Darkness activates", () => {
    const base = actionsReady([ETERNAL_DARKNESS, ECLIPSE, ECLIPSE]);
    const player = base.players[P1];
    if (player === undefined) throw new Error("test: no player");
    const [ritualHand, ...rest] = player.hand;
    if (ritualHand === undefined) throw new Error("test: no ritual");

    const seeded = {
      ...base,
      cards: Object.fromEntries(
        Object.entries(base.cards).map(([id, card]) => [
          id,
          rest.includes(card.id) ? { ...card, zone: "graveyard" as const } : card,
        ]),
      ),
      players: {
        ...base.players,
        [P1]: { ...player, hand: [ritualHand], graveyard: rest, deck: player.deck },
      },
    };

    const placed = advance(seeded, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: ritualHand,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const ritualId = ritualsOf(placed.state, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("test: no ritual");

    const ready = withSymbols(withPhase(placed.state, "actions"), P1, [
      "darkness",
      "darkness",
    ]);
    const oriented = {
      ...ready,
      cards: {
        ...ready.cards,
        [ritualId]: {
          ...ready.cards[ritualId]!,
          ritualOrientation: "ready" as const,
          ritualProgress: { darkness: 2 },
        },
      },
    };

    const activated = advance(oriented, {
      type: "ACTIVATE_RITUAL",
      playerId: P1,
      cardInstanceId: ritualId,
    });
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;
    expect(activated.state.pendingDecision).toMatchObject({
      type: "search-graveyard",
      controllerId: P1,
      amount: 2,
    });

    const gy = activated.state.players[P1]?.graveyard ?? [];
    // Instant ritual already moved to GY after opening the search; prefer the Eclipses.
    const picks = gy.filter((id) => id !== ritualId).slice(0, 2);
    expect(picks).toHaveLength(2);

    const resolved = advance(activated.state, {
      type: "RESOLVE_SEARCH",
      playerId: P1,
      cardInstanceIds: picks,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(handOf(resolved.state, P1).map((card) => card.id).sort()).toEqual([...picks].sort());
    expect(resolved.state.pendingDecision).toBeNull();
  });
});

describe("what playing refuses", () => {
  it("refuses a card whose effect is not modelled", () => {
    const state = actionsReady([ARCANE_ECHO]);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("CARD_HAS_NO_EFFECT");
  });

  it("refuses outside the actions phase", () => {
    const state = withEnergy(withHand(withPhase(newMatch(), "absorption"), P1, [ECLIPSE]), P1, 10);

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

  it("draws one on entering your own turn", () => {
    const state = newMatchWithDecks();

    const result = advance(state, { type: "END_TURN", playerId: P1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[P2]?.hand).toHaveLength(6);
    // The outgoing player is not topped up.
    expect(result.state.players[P1]?.hand).toHaveLength(5);
    expect(eventTypes(result.state)).toContain("card-drawn");
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
