import { describe, expect, it } from "vitest";
import { asPlayerId } from "../model/ids.js";
import {
  TEST_DECK_FILLER_IDS,
  TEST_LEGEND,
  TEST_PLAYABLE,
  TEST_SQUAD,
} from "../testing/fixtures/index.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withPile,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

describe("deck draw", () => {
  it("a generate-and-draw instant draws when the deck has cards", () => {
    const filler = TEST_DECK_FILLER_IDS[0];
    if (filler === undefined) throw new Error("filler");
    const deck = [TEST_PLAYABLE, TEST_PLAYABLE, TEST_PLAYABLE, filler, filler, filler];
    const match = newMatch({
      config: { ...newMatch().config, deckMinCards: 0 },
      players: [
        {
          id: P1,
          squad: TEST_SQUAD,
          deck,
        },
        { id: asPlayerId("p2"), squad: TEST_SQUAD, deck: [] },
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

  it("legendary creature is the test legend", () => {
    const state = newMatch();
    expect(Object.values(state.creatures).some((c) => c.definitionId === TEST_LEGEND)).toBe(true);
  });
});
