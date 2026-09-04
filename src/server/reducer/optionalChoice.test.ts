import { describe, expect, it } from "vitest";
import { GLOOMDRAFT, WARD_CHIT } from "../content/cards.js";
import { SIGIL_FLARE } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
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

const ARCANE_SLOT = 0;
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

function installSigil(state: GameState): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((slot, index) =>
    index === ARCANE_SLOT
      ? { ...slot, faceCardId: SIGIL_FLARE, faceCardOwnerId: P1 }
      : slot,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function rollSigil(state: GameState): GameState {
  let rolled = withPhase(state, "roll");
  rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: ARCANE_SLOT });
  rolled = withDie(rolled, dieIdOf(rolled, 1), { retained: true, rolledSlotIndex: SHIELD_SLOT });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
}

describe("optional pending choices", () => {
  it("Sigil Flare convert opens a Strike target choice", () => {
    const rolled = rollSigil(installSigil(newMatch()));
    expect(rolled.pendingDecision).toMatchObject({
      type: "choose-creature",
    });
    expect(rolled.players[P1]?.attributePool.arcane ?? 0).toBe(0);
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
