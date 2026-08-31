import { describe, expect, it } from "vitest";
import {
  asCardId,
  asCardInstanceId,
  asPlayerId,
  type CardInstance,
  type GameState,
} from "@server";
import { replayableGyCards } from "./legalChoices.js";

const P1 = asPlayerId("p1");

function gyCard(id: string, cardId: string): CardInstance {
  return {
    id: asCardInstanceId(id),
    cardId: asCardId(cardId),
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
    const echo = gyCard("echo-1", "card-echo-of-the-buried");
    const cog = gyCard("cog-1", "card-cog-draft");
    const listed = replayableGyCards(gyState([cog, echo]), P1, echo.id);
    expect(listed.map((card) => card.id)).toEqual([cog.id]);
  });
});
