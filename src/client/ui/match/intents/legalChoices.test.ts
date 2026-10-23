import { describe, expect, it } from "vitest";
import {
  asCardInstanceId,
  asPlayerId,
  type CardInstance,
  type GameState,
} from "@server";
import { installSharedBehaviorCards, TEST_PLAYABLE } from "@server/testing/fixtures/index.js";
import { replayableGyCards } from "./legalChoices.js";

installSharedBehaviorCards();

const P1 = asPlayerId("p1");

function gyCard(id: string): CardInstance {
  return {
    id: asCardInstanceId(id),
    cardId: TEST_PLAYABLE,
    ownerId: P1,
    zone: "graveyard",
    attachedToCreatureId: null,
    attachedToFaceCardId: null,
    ritualOrientation: null,
  };
}

function gyState(cards: readonly CardInstance[]): GameState {
  return {
    players: {
      [P1]: { graveyard: cards.map((card) => card.id) },
    },
    cards: Object.fromEntries(cards.map((card) => [card.id, card])),
  } as unknown as GameState;
}

describe("replayableGyCards", () => {
  it("excludes the replaying source instance", () => {
    const source = gyCard("source-1");
    const other = gyCard("other-1");
    const listed = replayableGyCards(gyState([other, source]), P1, source.id);
    expect(listed.map((card) => card.id)).toEqual([other.id]);
  });
});
