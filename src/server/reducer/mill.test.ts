import { describe, expect, it } from "vitest";
import { COG_DRAFT, SHIM_KIT } from "../content/cards.js";
import { LODESTAR_ARTIFICER, TEMPO_SQUAD } from "../content/creatures.js";
import { ENGINE_TEST_FACE_DECK } from "../content/faces.js";
import { asPlayerId } from "../model/ids.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withPile,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

describe("Tempo deck draw", () => {
  it("Cog Draft draws when the deck has cards", () => {
    const deck = [COG_DRAFT, COG_DRAFT, COG_DRAFT, SHIM_KIT, SHIM_KIT, SHIM_KIT];
    const match = newMatch({
      config: { ...newMatch().config, deckMinCards: 0 },
      players: [
        {
          id: P1,
          squad: TEMPO_SQUAD,
          deck,
          faceDeck: ENGINE_TEST_FACE_DECK,
        },
        { id: asPlayerId("p2"), squad: TEMPO_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
      ],
    });
    const player = match.players[P1];
    if (player === undefined) throw new Error("player");
    const handCard = player.hand[0];
    const deckTop = player.deck[0];
    if (handCard === undefined || deckTop === undefined) throw new Error("deck");
    const state = withPile(
      {
        ...match,
        phase: "actions" as const,
        players: {
          ...match.players,
          [P1]: { ...player, hand: [handCard], deck: [deckTop] },
        },
      },
      P1,
      10,
    );
    const after = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    expect(after.players[P1]?.hand.length).toBe(1);
  });

  it("legendary creature is Lodestar Artificer", () => {
    const state = newMatch();
    expect(Object.values(state.creatures).some((c) => c.definitionId === LODESTAR_ARTIFICER)).toBe(
      true,
    );
  });
});
