import { describe, expect, it } from "vitest";
import { GLOOMDRAFT, WARD_CHIT } from "../content/cards.js";
import { PYRE_OF_NAMES } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { handOf } from "../rules/cards.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withHand,
  withPhase,
  withPile,
  advanceResolvingChain,
} from "../testing/scenario.js";
import { advance } from "./reduce.js";

const DARKNESS_SLOT = 0;
const SHIELD_SLOT = 4;

function dieIdOf(state: GameState, index = 0): DieId {
  const id = state.players[P1]?.dieIds[index];
  if (id === undefined) throw new Error("expected a die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("expected die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function installPyre(state: GameState): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((slot, index) =>
    index === DARKNESS_SLOT
      ? { ...slot, faceCardId: PYRE_OF_NAMES, faceCardOwnerId: P1 }
      : slot,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function rollPyre(state: GameState): GameState {
  let rolled = withPhase(state, "roll");
  rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: DARKNESS_SLOT });
  rolled = withDie(rolled, dieIdOf(rolled, 1), { retained: true, rolledSlotIndex: SHIELD_SLOT });
  return expectOk(advanceResolvingChain(rolled, { type: "ROLL_DICE", playerId: P1 }));
}

describe("optional pending choices", () => {
  it("Pyre of Names opens an optional discard you can decline without striking", () => {
    const ready = installPyre(withHand(newMatch(), P1, [WARD_CHIT]));
    const rolled = rollPyre(ready);
    expect(rolled.pendingDecision).toMatchObject({
      type: "discard-cards",
      amount: 1,
      optional: true,
    });
    const handBefore = [...(rolled.players[P1]?.hand ?? [])];

    const declined = expectOk(
      advance(rolled, { type: "RESOLVE_DISCARD", playerId: P1, cardInstanceIds: [] }),
    );

    expect(declined.pendingDecision).toBeNull();
    expect(declined.players[P1]?.hand).toEqual(handBefore);
    expect(handOf(declined, P1).map((card) => card.cardId)).toEqual([WARD_CHIT]);
  });

  it("accepting Pyre of Names discard queues the Strike rider", () => {
    const ready = installPyre(withHand(newMatch(), P1, [WARD_CHIT]));
    const rolled = rollPyre(ready);
    const discarded = expectOk(
      advance(rolled, {
        type: "RESOLVE_DISCARD",
        playerId: P1,
        cardInstanceIds: [handCardIdAt(rolled, P1, 0)],
      }),
    );
    expect(discarded.pendingDecision?.type).toBe("choose-creature");
    expect(
      discarded.pendingDecision?.type === "choose-creature"
        ? discarded.pendingDecision.optional
        : undefined,
    ).not.toBe(true);
    expect(handOf(discarded, P1)).toHaveLength(0);
  });

  it("required Gloomdraft discard cannot be declined", () => {
    const ready = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [GLOOMDRAFT, WARD_CHIT]),
      P1,
      10,
    );
    const played = expectOk(
      advanceResolvingChain(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision).toMatchObject({ type: "discard-cards", amount: 1 });
    expect(
      played.pendingDecision?.type === "discard-cards"
        ? played.pendingDecision.optional
        : undefined,
    ).not.toBe(true);

    const declined = advance(played, {
      type: "RESOLVE_DISCARD",
      playerId: P1,
      cardInstanceIds: [],
    });
    expect(declined.ok).toBe(false);
    if (!declined.ok) expect(declined.error).toBe("INVALID_DISCARD");
  });
});
