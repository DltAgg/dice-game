import { describe, expect, it } from "vitest";
import {
  BURY_THE_NAME,
  CONSULT,
  ECLIPSE,
  GRAVE_WHISPER,
  WAR_AXE,
} from "../content/cards.js";
import { CONTROL_SQUAD } from "../content/creatures.js";
import { ENGINE_TEST_FACE_DECK, legacyStartingLayout } from "../content/faces.js";
import type { CardInstance } from "../model/cards.js";
import { asCardInstanceId, asSymbolInstanceId, type CardId, type PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { equipmentOf, graveyardOf } from "../rules/cards.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withEnergy,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

function controlReady(cards: Parameters<typeof withHand>[2]): GameState {
  const match = newMatch({
    players: [
      {
        id: P1,
        squad: CONTROL_SQUAD,
        deck: [],
        faceDeck: ENGINE_TEST_FACE_DECK,
        startingDice: legacyStartingLayout(),
      },
      {
        id: P2,
        squad: CONTROL_SQUAD,
        deck: [],
        faceDeck: ENGINE_TEST_FACE_DECK,
        startingDice: legacyStartingLayout(),
      },
    ],
  });
  return withEnergy(withHand(withPhase(match, "actions"), P1, cards), P1, 10);
}

function withDeck(state: GameState, playerId: PlayerId, cardIds: readonly CardId[]): GameState {
  const player = state.players[playerId];
  if (player === undefined) throw new Error("expected player");
  const instances: Record<string, CardInstance> = {};
  const deck = cardIds.map((cardId, index) => {
    const id = asCardInstanceId(`given-${playerId}-deck-${String(index)}-${cardId}`);
    instances[id] = {
      id,
      cardId,
      ownerId: playerId,
      zone: "deck",
      attachedToCreatureId: null,
      attachedToFaceCardId: null,
      ritualOrientation: null,
      ritualProgress: null,
      ritualProgressCreditedThisTurn: null,
    };
    return id;
  });
  return {
    ...state,
    cards: { ...state.cards, ...instances },
    players: { ...state.players, [playerId]: { ...player, deck } },
  };
}

describe("Bury the Name", () => {
  it("mills the top 3 cards of the opponent's deck", () => {
    const ready = withDeck(actionsReady([BURY_THE_NAME]), P2, [WAR_AXE, ECLIPSE, WAR_AXE, ECLIPSE]);
    const topThree = ready.players[P2]?.deck.slice(0, 3) ?? [];
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.players[P2]?.deck).toHaveLength(1);
    expect(graveyardOf(after, P2).map((card) => card.id)).toEqual(topThree);
    expect(eventTypes(after)).toContain("cards-milled");
    expect(eventTypes(after)).not.toContain("card-discarded");
  });

  it("mills remaining cards when the deck is shorter than the amount", () => {
    const ready = withDeck(actionsReady([BURY_THE_NAME]), P2, [WAR_AXE]);
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.players[P2]?.deck).toHaveLength(0);
    expect(graveyardOf(after, P2)).toHaveLength(1);
  });

  it("whiffs legally when the opponent's deck is empty", () => {
    const ready = withDeck(actionsReady([BURY_THE_NAME]), P2, []);
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(eventTypes(after)).not.toContain("cards-milled");
    expect(graveyardOf(after, P2)).toHaveLength(0);
  });
});

describe("Grave Whisper", () => {
  it("mills 1 from the opponent on absorb Darkness once per turn", () => {
    const base = controlReady([GRAVE_WHISPER]);
    const bearerId = creatureIdAt(base, P1, 0);
    const equipped = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredTargetCreatureId: bearerId,
      }),
    );
    expect(equipmentOf(equipped, P1)).toHaveLength(1);
    const seeded = withDeck(equipped, P2, [WAR_AXE, ECLIPSE]);
    const top = seeded.players[P2]?.deck[0];
    const symbolId = asSymbolInstanceId("sym-dark-whisper");
    const withSymbol: GameState = {
      ...seeded,
      symbols: {
        ...seeded.symbols,
        [symbolId]: {
          id: symbolId,
          ownerId: P1,
          symbol: "darkness",
          status: "rolled",
          sourceDieId: null,
          absorbedByCreatureId: null,
        },
      },
    };
    const after = expectOk(
      advance(withPhase(withSymbol, "actions"), {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: bearerId,
        symbolId,
      }),
    );
    expect(graveyardOf(after, P2).map((card) => card.id)).toEqual([top]);
    expect(after.players[P2]?.deck).toHaveLength(1);
  });
});

describe("Consult", () => {
  it("opens look-top-deck for the top 3 cards", () => {
    const ready = withDeck(actionsReady([CONSULT]), P1, [ECLIPSE, WAR_AXE, ECLIPSE, WAR_AXE]);
    const top = ready.players[P1]?.deck.slice(0, 3) ?? [];
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("look-top-deck");
    if (played.pendingDecision?.type !== "look-top-deck") return;
    expect(played.pendingDecision.cardInstanceIds).toEqual(top);
  });
});
