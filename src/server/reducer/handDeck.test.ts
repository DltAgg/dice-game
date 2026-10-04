import { describe, expect, it } from "vitest";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import type { CardId, CreatureId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { advance } from "../reducer/reduce.js";
import { graveyardOf, handOf, ritualsOf } from "../rules/cards.js";
import { validateLoadout, validateTacticsDeck } from "../rules/loadout.js";
import { asTestCreatureId, testCard } from "../testing/fixtures/builders.js";
import { TEST_FACE_DECK, TEST_SQUAD, TEST_STARTING_DICE } from "../testing/fixtures/kit.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withHand,
  withPhase,
} from "../testing/scenario.js";

const PRESSURE = testCard({ id: "card-test-hand-pressure" }).id;
const OTHER = testCard({ id: "card-test-hand-other" }).id;

const STAY = testCard({
  id: "card-test-persistent",
  lifecycle: "persistent",
  effect: { effects: [{ type: "grant-shield", amount: 1, target: { kind: "declared-target" } }] },
});

const ONE_SHOT = testCard({
  id: "card-test-oneshot",
  effect: { effects: [{ type: "grant-shield", amount: 1, target: { kind: "declared-target" } }] },
});

const TO_DECK = testCard({
  id: "card-test-to-deck",
  afterResolveZone: "deck",
  effect: { effects: [{ type: "grant-shield", amount: 1, target: { kind: "declared-target" } }] },
});

const BLOCK = testCard({
  id: "card-test-block",
  effect: { effects: [{ type: "grant-shield", amount: 1, target: { kind: "declared-target" } }] },
});

const BLOCK_DRAW = testCard({
  id: "card-test-block-draw",
  effect: {
    effects: [
      { type: "grant-shield", amount: 1, target: { kind: "declared-target" } },
      { type: "draw-cards", amount: 1 },
    ],
  },
});

const MAGNUS_CARD = testCard({
  id: "card-test-magnus-card",
  fighterRestriction: asTestCreatureId("not-on-this-team"),
  effect: { effects: [{ type: "grant-shield", amount: 1, target: { kind: "declared-target" } }] },
});

function activeOf(state: GameState): CreatureId {
  const id = state.players[P1]?.activeCreatureId;
  if (id === undefined) throw new Error("missing active");
  return id;
}

function pile(card: CardId, count: number): CardId[] {
  return Array.from({ length: count }, () => card);
}

function matchWith(
  config: Partial<typeof DEFAULT_RULES_CONFIG>,
  decks: readonly [readonly CardId[], readonly CardId[]],
) {
  return newMatch({
    config: { ...DEFAULT_RULES_CONFIG, deckMinCards: 0, deckMaxCopiesPerCard: 12, ...config },
    players: [
      { id: P1, squad: TEST_SQUAD, deck: decks[0] },
      { id: P2, squad: TEST_SQUAD, deck: decks[1] },
    ],
  });
}

describe("hand, deck, and lifecycle", () => {
  it("deals the same opening hand to both players", () => {
    const state = matchWith({ openingHandSize: 5, cardsDrawnPerTurn: 0 }, [pile(PRESSURE, 8), pile(OTHER, 8)]);
    expect(state.players[P1]?.hand).toHaveLength(5);
    expect(state.players[P2]?.hand).toHaveLength(5);
    expect(state.players[P1]?.creatureIds).toHaveLength(3);
    expect(state.players[P1]?.deck).toBeDefined();
    expect(state.players[P2]?.deck).toBeDefined();
  });

  it("follows openingHandSize", () => {
    const state = matchWith({ openingHandSize: 3, cardsDrawnPerTurn: 0 }, [pile(PRESSURE, 6), pile(OTHER, 6)]);
    expect(state.players[P1]?.hand).toHaveLength(3);
    expect(state.players[P2]?.hand).toHaveLength(3);
  });

  it("draws at the start of every turn, including the first, by the configured amount", () => {
    const opened = matchWith({ openingHandSize: 5, cardsDrawnPerTurn: 1 }, [pile(PRESSURE, 8), pile(OTHER, 8)]);
    expect(opened.players[P1]?.hand).toHaveLength(6);
    expect(opened.players[P2]?.hand).toHaveLength(5);

    const second = expectOk(advance(opened, { type: "END_TURN", playerId: P1 }));
    expect(second.players[P2]?.hand).toHaveLength(6);
    expect(second.players[P1]?.hand).toHaveLength(6);

    const extra = matchWith({ openingHandSize: 5, cardsDrawnPerTurn: 2 }, [pile(PRESSURE, 10), pile(OTHER, 10)]);
    expect(extra.players[P1]?.hand).toHaveLength(7);
    expect(extra.players[P2]?.hand).toHaveLength(5);
  });

  it("does not discard to a hand limit", () => {
    const state = matchWith(
      { openingHandSize: 5, cardsDrawnPerTurn: 3, maxHandSize: 2 },
      [pile(PRESSURE, 12), pile(OTHER, 12)],
    );
    expect(state.players[P1]?.hand.length).toBe(8);
    expect(state.players[P1]?.graveyard).toHaveLength(0);
    expect(state.config.maxHandSize).toBe(2);
  });

  it("keeps one deck for the team and allows different lists for the same fighters", () => {
    const config = { ...DEFAULT_RULES_CONFIG, deckMinCards: 0 };
    const shared = {
      squad: TEST_SQUAD,
      faceDeck: TEST_FACE_DECK,
      startingDice: TEST_STARTING_DICE,
    };
    expect(validateLoadout({ ...shared, deck: [PRESSURE, OTHER] }, config).ok).toBe(true);
    expect(validateLoadout({ ...shared, deck: [OTHER, OTHER] }, config).ok).toBe(true);
    expect(validateLoadout({ ...shared, deck: [MAGNUS_CARD.id] }, config).ok).toBe(true);
    expect(validateTacticsDeck([MAGNUS_CARD.id], config).ok).toBe(true);
  });

  it("plays a fighter-specific card only when that fighter is on the team", () => {
    const state = withHand(withPhase(newMatch(), "actions"), P1, [MAGNUS_CARD.id]);
    const played = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
      declaredTargetCreatureId: activeOf(state),
    });
    expect(played.ok).toBe(false);
    if (!played.ok) expect(played.error).toBe("INVALID_TARGET");
  });

  it("discards a one-shot and keeps a persistent card in play", () => {
    const oneReady = withHand(withPhase(newMatch(), "actions"), P1, [ONE_SHOT.id]);
    const one = resolveOpenChain(
      expectOk(
        advance(oneReady, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(oneReady, P1, 0),
          declaredTargetCreatureId: activeOf(oneReady),
        }),
      ),
    );
    expect(handOf(one, P1).some((card) => card.cardId === ONE_SHOT.id)).toBe(false);
    expect(graveyardOf(one, P1).some((card) => card.cardId === ONE_SHOT.id)).toBe(true);

    const ready = withHand(withPhase(newMatch(), "actions"), P1, [STAY.id]);
    const stayed = resolveOpenChain(
      expectOk(
        advance(ready, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(ready, P1, 0),
          declaredTargetCreatureId: activeOf(ready),
        }),
      ),
    );
    expect(ritualsOf(stayed, P1).some((card) => card.cardId === STAY.id)).toBe(true);
    expect(graveyardOf(stayed, P1).some((card) => card.cardId === STAY.id)).toBe(false);
    const shielded = stayed.players[P1]?.activeCreatureId;
    expect(shielded === undefined ? 0 : stayed.creatures[shielded]?.shields).toBe(0);
  });

  it("sends a one-shot to the zone that card names", () => {
    const ready = withHand(withPhase(newMatch(), "actions"), P1, [TO_DECK.id]);
    const resolved = resolveOpenChain(
      expectOk(
        advance(ready, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(ready, P1, 0),
          declaredTargetCreatureId: activeOf(ready),
        }),
      ),
    );
    const card = Object.values(resolved.cards).find((entry) => entry.cardId === TO_DECK.id);
    expect(card?.zone).toBe("deck");
    expect(graveyardOf(resolved, P1).some((entry) => entry.cardId === TO_DECK.id)).toBe(false);
  });

  it("draws from a block only when that card says so", () => {
    const stocked = matchWith(
      { openingHandSize: 0, cardsDrawnPerTurn: 0, deckOutEnabled: false },
      [pile(PRESSURE, 3), pile(OTHER, 3)],
    );
    const plain = withHand(withPhase(stocked, "actions"), P1, [BLOCK.id]);
    const deckBefore = plain.players[P1]?.deck.length ?? 0;
    const blocked = resolveOpenChain(
      expectOk(
        advance(plain, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(plain, P1, 0),
          declaredTargetCreatureId: activeOf(plain),
        }),
      ),
    );
    expect(blocked.players[P1]?.deck).toHaveLength(deckBefore);

    const drawing = withHand(withPhase(stocked, "actions"), P1, [BLOCK_DRAW.id]);
    const drawn = resolveOpenChain(
      expectOk(
        advance(drawing, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(drawing, P1, 0),
          declaredTargetCreatureId: activeOf(drawing),
        }),
      ),
    );
    expect(drawn.players[P1]?.deck.length).toBe(deckBefore - 1);
    expect(handOf(drawn, P1).length).toBe(1);
  });

  it("loses on an empty-deck draw only when deck-out is enabled", () => {
    const lost = matchWith(
      { openingHandSize: 1, cardsDrawnPerTurn: 1, deckOutEnabled: true },
      [pile(PRESSURE, 1), pile(OTHER, 3)],
    );
    expect(lost.status).toBe("finished");
    expect(lost.winner).toBe(P2);
    const active = lost.players[P1]?.activeCreatureId;
    expect(active === undefined ? 0 : lost.creatures[active]?.damage).toBe(0);
    expect(lost.players[P1]?.deck).toHaveLength(0);

    const quiet = matchWith(
      { openingHandSize: 1, cardsDrawnPerTurn: 1, deckOutEnabled: false },
      [pile(PRESSURE, 1), pile(OTHER, 3)],
    );
    expect(quiet.status).toBe("in-progress");
    expect(quiet.winner).toBeNull();
    expect(quiet.players[P1]?.hand).toHaveLength(1);
    expect(quiet.players[P1]?.deck).toHaveLength(0);
    expect(quiet.log.some((entry) => entry.event.type === "deck-empty")).toBe(true);
  });
});
