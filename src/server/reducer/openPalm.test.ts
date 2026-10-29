import { describe, expect, it } from "vitest";
import { getCard } from "../content/cards.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import { asCardId, type DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { legalModifyPlays } from "../rules/cardBehavior.js";
import { advance } from "./reduce.js";
import { testCard } from "../testing/fixtures/builders.js";
import { TEST_SQUAD } from "../testing/fixtures/kit.js";
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

const OPEN_PALM = asCardId("card-open-palm");
const STOCK = testCard({ id: "card-test-open-palm-stock" }).id;

function withMeter(state: GameState, meter: number): GameState {
  const player = state.players[P1];
  if (player === undefined) throw new Error("missing p1");
  return { ...state, players: { ...state.players, [P1]: { ...player, meter } } };
}

function show(state: GameState, dieIndex: number, slotIndex: number): GameState {
  const id = state.players[P1]?.dieIds[dieIndex];
  if (id === undefined) throw new Error("missing die");
  const die = state.dice[id];
  if (die === undefined) throw new Error("missing die");
  return {
    ...state,
    dice: { ...state.dice, [id]: { ...die, rolledSlotIndex: slotIndex } },
  };
}

function ready(meter: number): GameState {
  const stocked = newMatch({
    config: {
      ...DEFAULT_RULES_CONFIG,
      deckMinCards: 0,
      deckMaxCopiesPerCard: 12,
      openingHandSize: 0,
      cardsDrawnPerTurn: 0,
      deckOutEnabled: false,
    },
    players: [
      { id: P1, squad: TEST_SQUAD, deck: Array.from({ length: 5 }, () => STOCK) },
      { id: P2, squad: TEST_SQUAD, deck: Array.from({ length: 5 }, () => STOCK) },
    ],
  });
  return withMeter(show(show(withHand(withPhase(stocked, "actions"), P1, [OPEN_PALM]), 0, 0), 1, 0), meter);
}

function dieAt(state: GameState, index: number): DieId {
  const id = state.players[P1]?.dieIds[index];
  if (id === undefined) throw new Error("missing die");
  return id;
}

describe("Open Palm", () => {
  it("spends 2 Meter and changes a die that is not the Active Fighter's", () => {
    const definition = getCard(OPEN_PALM);
    if (definition === undefined) throw new Error("open palm");
    const state = ready(2);
    const activeId = state.players[P1]?.activeCreatureId;
    const reserve = dieAt(state, 1);
    expect(state.dice[reserve]?.boundCreatureId).not.toBe(activeId);

    const offers = legalModifyPlays(state, P1, definition);
    expect(offers.map((choice) => choice.dieId)).toContain(dieAt(state, 0));
    expect(offers.map((choice) => choice.dieId)).toContain(reserve);

    const played = resolveOpenChain(
      expectOk(
        advance(state, {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(state, P1, 0),
          dieId: reserve,
          slotIndex: 2,
        }),
      ),
    );
    expect(played.players[P1]?.meter).toBe(0);
    expect(played.dice[reserve]?.rolledSlotIndex).toBe(2);
    expect(played.dice[dieAt(played, 0)]?.rolledSlotIndex).toBe(0);
  });

  it("refuses the play when Meter is under 2", () => {
    const definition = getCard(OPEN_PALM);
    if (definition === undefined) throw new Error("open palm");
    const state = ready(1);
    expect(legalModifyPlays(state, P1, definition)).toEqual([]);
    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
      dieId: dieAt(state, 1),
      slotIndex: 2,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INSUFFICIENT_METER");
    expect(state.dice[dieAt(state, 1)]?.rolledSlotIndex).toBe(0);
    expect(state.players[P1]?.meter).toBe(1);
  });
});
