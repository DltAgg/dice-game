import { describe, expect, it } from "vitest";
import { ECLIPSE, PARADOX, WAR_AXE } from "../content/cards.js";
import { graveyardOf, handOf, ritualsOf } from "../rules/cards.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withPile,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: Parameters<typeof withHand>[2], pileTokens = 10) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, pileTokens);

describe("Paradox GY replay", () => {
  it("replays a GY tactic's effect without paying play cost or Requires", () => {
    const ready = actionsReady([PARADOX, ECLIPSE, ECLIPSE, ECLIPSE]);
    const paradoxId = handCardIdAt(ready, P1, 0);
    const eclipseId = handCardIdAt(ready, P1, 1);
    const deckA = handCardIdAt(ready, P1, 2);
    const deckB = handCardIdAt(ready, P1, 3);
    const seeded = {
      ...ready,
      cards: {
        ...ready.cards,
        [eclipseId]: { ...ready.cards[eclipseId]!, zone: "graveyard" as const },
        [deckA]: { ...ready.cards[deckA]!, zone: "deck" as const },
        [deckB]: { ...ready.cards[deckB]!, zone: "deck" as const },
      },
      players: {
        ...ready.players,
        [P1]: {
          ...ready.players[P1]!,
          hand: [paradoxId],
          graveyard: [eclipseId],
          deck: [deckA, deckB],
        },
      },
    };

    const placed = expectOk(
      advance(seeded, { type: "PLAY_CARD", playerId: P1, cardInstanceId: paradoxId }),
    );
    const ritualId = ritualsOf(placed, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("expected Paradox on the field");

    const activated = expectOk(
      advance(withPhase(placed, "actions"), {
        type: "ACTIVATE_RITUAL",
        playerId: P1,
        cardInstanceId: ritualId,
      }),
    );
    expect(activated.pendingDecision?.type).toBe("replay-graveyard-tactic");
    expect(activated.players[P1]?.attributePool.darkness).toBe(7);

    const replayed = expectOk(
      advance(activated, {
        type: "RESOLVE_REPLAY_GRAVEYARD",
        playerId: P1,
        cardInstanceId: eclipseId,
      }),
    );
    expect(graveyardOf(replayed, P1).map((card) => card.id)).toContain(eclipseId);
    expect(replayed.pendingDecision?.type).toBe("discard-cards");
    expect(handOf(replayed, P1).length).toBeGreaterThanOrEqual(2);
  });

  it("refuses a GY card with no effect region", () => {
    const ready = actionsReady([PARADOX, WAR_AXE]);
    const paradoxId = handCardIdAt(ready, P1, 0);
    const axeId = handCardIdAt(ready, P1, 1);
    const seeded = {
      ...ready,
      cards: {
        ...ready.cards,
        [axeId]: { ...ready.cards[axeId]!, zone: "graveyard" as const },
      },
      players: {
        ...ready.players,
        [P1]: {
          ...ready.players[P1]!,
          hand: [paradoxId],
          graveyard: [axeId],
        },
      },
    };

    const placed = expectOk(
      advance(seeded, { type: "PLAY_CARD", playerId: P1, cardInstanceId: paradoxId }),
    );
    const ritualId = ritualsOf(placed, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("expected Paradox on the field");

    const activated = expectOk(
      advance(withPhase(placed, "actions"), {
        type: "ACTIVATE_RITUAL",
        playerId: P1,
        cardInstanceId: ritualId,
      }),
    );
    expect(activated.pendingDecision).toBeNull();
  });
});
