import { describe, expect, it } from "vitest";
import type { DieState } from "../model/dice.js";
import type { DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { testCard, testFace } from "../testing/fixtures/index.js";
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

const CONVERT_STRIKE = testFace({
  id: "face-test-convert-strike",
  kind: "synthetic",
  symbol: "arcane",
  convertRoll: true,
  pips: { arcane: 2 },
  onRoll: [{ type: "damage", amount: 2, target: { kind: "choose-enemy" } }],
});

const REQUIRED_DISCARD = testCard({
  id: "card-test-required-discard",
  playCost: { darkness: 2 },
  attribute: "darkness",
  effect: {
    effects: [
      { type: "search-deck", amount: 2, filter: ["instant", "ritual"] },
      { type: "discard-cards", amount: 1 },
    ],
  },
});

const HAND_FILLER = testCard({
  id: "card-test-discard-filler",
  playCost: { arcane: 2 },
  attribute: "arcane",
  effect: { effects: [{ type: "grant-shield", amount: 1, target: { kind: "choose-ally" } }] },
});

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

function installConvert(state: GameState): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((slot, index) =>
    index === ARCANE_SLOT
      ? { ...slot, faceCardId: CONVERT_STRIKE.id, faceCardOwnerId: P1 }
      : slot,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function rollConvert(state: GameState): GameState {
  let rolled = withPhase(state, "roll");
  rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: ARCANE_SLOT });
  rolled = withDie(rolled, dieIdOf(rolled, 1), { retained: true, rolledSlotIndex: SHIELD_SLOT });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
}

describe("optional pending choices", () => {
  it("convert roll opens Choose one before Strike", () => {
    const rolled = rollConvert(installConvert(newMatch()));
    expect(rolled.pendingDecision).toMatchObject({
      type: "choose-effect-mode",
      modeLabels: ["Bank this die's pips", "Strike 2"],
    });
    expect(rolled.players[P1]?.attributePool.arcane ?? 0).toBe(0);
    const payoff = expectOk(
      advance(rolled, {
        type: "RESOLVE_CHOOSE_EFFECT_MODE",
        playerId: P1,
        modeIndex: 1,
      }),
    );
    expect(payoff.pendingDecision).toMatchObject({
      type: "choose-creature",
    });
  });

  it("required discard cannot be declined", () => {
    const ready = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [REQUIRED_DISCARD.id, HAND_FILLER.id]),
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
