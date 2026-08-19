import { describe, expect, it } from "vitest";
import { ECLIPSE, LIVING_LIBRARY, LUMINAR_PRISM } from "../content/cards.js";
import { faceIdForSymbol, getFaceCard, naturalFaceId, SHADOW_ECHO, INSIGHT_RUNE } from "../content/faces.js";
import { overloadsOnFace } from "../rules/cards.js";
import { symbolCountsOn } from "../rules/dice.js";
import {
  eventTypes,
  forgeAction,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withEnergy,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

/**
 * The forge region: bible §13's face installation, reached through the card
 * layer. Forging is the only way an engine changes, so these are the tests that
 * say the game is an engine-builder at all.
 */

const forgeReady = (cards = [ECLIPSE]) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

const dieIdOf = (state: ReturnType<typeof forgeReady>, index = 0) => {
  const id = state.players[P1]?.dieIds[index];
  if (id === undefined) throw new Error("test: no die");
  return id;
};

const forge = (
  state: ReturnType<typeof forgeReady>,
  cardIndex = 0,
  dieId?: ReturnType<typeof dieIdOf>,
  slots: readonly number[] = [4],
) =>
  advance(
    state,
    forgeAction(state, P1, handCardIdAt(state, P1, cardIndex), dieId ?? dieIdOf(state), slots),
  );

describe("forging a face", () => {
  it("replaces the named slot with the card's face", () => {
    const state = forgeReady();
    const dieId = dieIdOf(state);
    expect(getFaceCard(state.dice[dieId]?.slots[4]?.faceCardId ?? naturalFaceId("martial"))?.symbol)
      .toBe("shield");

    const result = forge(state);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const slot = result.state.dice[dieId]?.slots[4];
    expect(slot?.faceCardId).toBe(SHADOW_ECHO);
    expect(slot?.faceCardOwnerId).toBe(P1);
    expect(eventTypes(result.state)).toContain("face-forged");
  });

  it("leaves the other five faces untouched", () => {
    const state = forgeReady();
    const dieId = dieIdOf(state);
    const result = forge(state);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const before = state.dice[dieId]?.slots ?? [];
    const after = result.state.dice[dieId]?.slots ?? [];
    expect(after).toHaveLength(6);
    for (const index of [0, 1, 2, 3, 5]) {
      expect(after[index]?.faceCardId).toBe(before[index]?.faceCardId);
    }
  });

  it("installs a synthetic face when the card says synthetic", () => {
    const state = forgeReady([LIVING_LIBRARY]);
    const dieId = dieIdOf(state);
    const result = forge(state);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.dice[dieId]?.slots[4]?.faceCardId).toBe(INSIGHT_RUNE);
    expect(getFaceCard(INSIGHT_RUNE)?.kind).toBe("synthetic");
  });

  it("spends the card's Energy cost and sends it to the graveyard", () => {
    const state = forgeReady();
    const cardInstanceId = handCardIdAt(state, P1, 0);
    const result = forge(state);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.energy).toEqual({ holderId: P1, value: 7 });
    expect(result.state.cards[cardInstanceId]?.zone).toBe("graveyard");
    expect(result.state.players[P1]?.hand).toHaveLength(0);
    expect(result.state.players[P1]?.graveyard).toEqual([cardInstanceId]);
  });

  it("draws one card per face forged", () => {
    const state = forgeReady();
    const withDeck = withHand(state, P1, [ECLIPSE, LUMINAR_PRISM, LIVING_LIBRARY]);
    const deckPlayer = withDeck.players[P1];
    if (deckPlayer === undefined) throw new Error("test: no player");
    const [forgeCardId, ...deckIds] = deckPlayer.hand;
    if (forgeCardId === undefined) throw new Error("test: no forge card");
    const seeded = {
      ...withDeck,
      cards: Object.fromEntries(
        Object.entries(withDeck.cards).map(([id, card]) => [
          id,
          deckIds.includes(card.id) ? { ...card, zone: "deck" as const } : card,
        ]),
      ),
      players: {
        ...withDeck.players,
        [P1]: { ...deckPlayer, hand: [forgeCardId], deck: deckIds },
      },
    };

    const result = advance(seeded, forgeAction(seeded, P1, forgeCardId, dieIdOf(seeded), [4]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[P1]?.hand).toHaveLength(1);
    expect(result.state.players[P1]?.deck).toHaveLength(1);
    expect(eventTypes(result.state)).toContain("card-drawn");
  });

  it("leaves face-card overloads alone when another die still shows that face", () => {
    const state = forgeReady([LUMINAR_PRISM]);
    const die0 = dieIdOf(state, 0);
    const luminarFace = faceIdForSymbol("luminar");

    const attached = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
      declaredFaceCardId: luminarFace,
    });
    expect(attached.ok).toBe(true);
    if (!attached.ok) return;

    const forgeReadyState = withEnergy(
      withHand(withPhase(attached.state, "actions"), P1, [LIVING_LIBRARY]),
      P1,
      10,
    );
    const result = advance(
      forgeReadyState,
      forgeAction(forgeReadyState, P1, handCardIdAt(forgeReadyState, P1, 0), die0, [3]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(overloadsOnFace(result.state, P1, luminarFace)).toHaveLength(1);
  });
});

describe("what forging refuses", () => {
  it("refuses a slot count the card does not forge", () => {
    const state = forgeReady();
    const result = forge(state, 0, dieIdOf(state), [3, 4]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("WRONG_FACE_COUNT");
  });

  it("refuses the same slot named twice", () => {
    const state = withEnergy(
      withHand(withPhase(newMatch(), "actions"), P1, [LIVING_LIBRARY]),
      P1,
      10,
    );
    const result = forge(state, 0, dieIdOf(state), [4, 4]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("WRONG_FACE_COUNT");
  });

  it("refuses an opponent's die", () => {
    const state = forgeReady();
    const opponentDieId = state.players[P2]?.dieIds[0];
    if (opponentDieId === undefined) throw new Error("test: no die");
    const result = forge(state, 0, opponentDieId, [4]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });

  it("refuses a fifth face of one attribute", () => {
    const state = forgeReady([LUMINAR_PRISM]);
    const dieId = dieIdOf(state);
    const die = state.dice[dieId];
    if (die === undefined) throw new Error("test: no die");
    const saturated = {
      ...state,
      dice: {
        ...state.dice,
        [dieId]: {
          ...die,
          slots: die.slots.map((slot) =>
            slot.index <= 3 ? { ...slot, faceCardId: naturalFaceId("luminar") } : slot,
          ),
        },
      },
    };
    expect(symbolCountsOn(saturated.dice[dieId]!).luminar).toBe(4);
    const result = forge(saturated, 0, dieId, [4]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("ATTRIBUTE_LIMIT_REACHED");
  });

  it("allows the fourth face of one attribute", () => {
    const state = forgeReady([LUMINAR_PRISM]);
    const dieId = dieIdOf(state);
    const die = state.dice[dieId];
    if (die === undefined) throw new Error("test: no die");
    const nearly = {
      ...state,
      dice: {
        ...state.dice,
        [dieId]: {
          ...die,
          slots: die.slots.map((slot) =>
            slot.index <= 1 ? { ...slot, faceCardId: naturalFaceId("luminar") } : slot,
          ),
        },
      },
    };
    const result = forge(nearly, 0, dieId, [4]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(symbolCountsOn(result.state.dice[dieId]!).luminar).toBe(4);
  });

  it("refuses a card that is not in hand", () => {
    const state = forgeReady();
    const cardInstanceId = handCardIdAt(state, P1, 0);
    const discarded = {
      ...state,
      cards: {
        ...state.cards,
        [cardInstanceId]: { ...state.cards[cardInstanceId]!, zone: "graveyard" as const },
      },
    };
    const result = advance(
      discarded,
      forgeAction(discarded, P1, cardInstanceId, dieIdOf(state), [4]),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("CARD_NOT_AVAILABLE");
  });

  it("refuses outside the actions phase", () => {
    const state = withEnergy(withHand(withPhase(newMatch(), "roll"), P1, [ECLIPSE]), P1, 10);
    const result = forge(state);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_PHASE");
  });
});

describe("what a forged face changes", () => {
  it("makes the new symbol rollable", () => {
    const state = forgeReady();
    const dieId = dieIdOf(state);
    const forged = forge(state);
    expect(forged.ok).toBe(true);
    if (!forged.ok) return;
    const counts = symbolCountsOn(forged.state.dice[dieId]!);
    expect(counts.darkness).toBe(1);
    expect(counts.shield).toBe(1);
  });
});
