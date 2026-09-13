import { describe, expect, it } from "vitest";
import { asFaceCardId } from "../model/ids.js";
import type { DieState } from "../model/dice.js";
import { attackIsUnlocked, showingAttributeCounts } from "./attackUnlock.js";
import { testAttack, testFace } from "../testing/fixtures/index.js";
import { newMatch, P1, P2, withPhase, withShowingFaces, withDie } from "../testing/scenario.js";

function dieIdOf(state: ReturnType<typeof newMatch>, playerId = P1, index = 0) {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("expected a die");
  return id;
}

function withSilencedShowingSlot(
  state: ReturnType<typeof newMatch>,
  dieId: ReturnType<typeof dieIdOf>,
): ReturnType<typeof newMatch> {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slotIndex = die.rolledSlotIndex;
  if (slotIndex === null) throw new Error("showing slot");
  const slots = die.slots.map((slot) =>
    slot.index === slotIndex ? { ...slot, silenceExpiresOnTurn: state.turn + 2 } : slot,
  );
  return withDie(state, dieId, { slots } satisfies Partial<DieState>);
}

describe("showingAttributeCounts", () => {
  it("counts +1 per owned die whose showing face is an Attribute", () => {
    const state = withShowingFaces(withPhase(newMatch(), "actions"), P1, [
      "mechanical",
      "luminar",
    ]);
    expect(showingAttributeCounts(state, P1)).toEqual({ mechanical: 1, luminar: 1 });
  });

  it("ignores Shield, untyped, and null showing slots", () => {
    const state = withShowingFaces(withPhase(newMatch(), "actions"), P1, ["shield"]);
    expect(showingAttributeCounts(state, P1)).toEqual({});
  });

  it("does not count opponent showing faces", () => {
    let state = withPhase(newMatch(), "actions");
    state = withShowingFaces(state, P2, ["mechanical", "mechanical"]);
    state = withShowingFaces(state, P1, ["shield", "shield"]);
    expect(showingAttributeCounts(state, P1)).toEqual({});
    expect(showingAttributeCounts(state, P2)).toEqual({ mechanical: 2 });
  });

  it("still counts a silenced showing slot", () => {
    let state = withShowingFaces(withPhase(newMatch(), "actions"), P1, ["mechanical"]);
    state = withSilencedShowingSlot(state, dieIdOf(state));
    expect(showingAttributeCounts(state, P1)).toEqual({ mechanical: 1 });
  });

  it("counts faces, not extra pips on the showing face", () => {
    const fat = testFace({
      id: asFaceCardId("face-test-fat-mechanical"),
      kind: "synthetic",
      symbol: "mechanical",
      pips: { mechanical: 3 },
    });
    let state = withPhase(newMatch(), "actions");
    const dieId = dieIdOf(state);
    const die = state.dice[dieId];
    if (die === undefined) throw new Error("die");
    const slots = die.slots.map((slot, index) =>
      index === 0 ? { ...slot, faceCardId: fat.id } : slot,
    );
    state = withDie(state, dieId, { slots, rolledSlotIndex: 0 });
    state = withDie(state, dieIdOf(state, P1, 1), { rolledSlotIndex: null });
    expect(showingAttributeCounts(state, P1)).toEqual({ mechanical: 1 });
  });
});

describe("attackIsUnlocked", () => {
  const crank = testAttack({ unlock: { mechanical: 1 } });
  const retool = testAttack({ unlock: { mechanical: 2 } });
  const dual = testAttack({ unlock: { mechanical: 1, luminar: 1 } });
  const empty = testAttack({ unlock: {} });
  const anyPip = testAttack({ unlock: { mechanical: 1, any: 1 } });

  it("unlocks a basic when one owned die shows the named attribute", () => {
    const state = withShowingFaces(withPhase(newMatch(), "actions"), P1, ["mechanical"]);
    expect(attackIsUnlocked(state, P1, crank)).toBe(true);
  });

  it("needs two showing Mechanical faces for { mechanical: 2 }", () => {
    const one = withShowingFaces(withPhase(newMatch(), "actions"), P1, ["mechanical", "shield"]);
    const two = withShowingFaces(withPhase(newMatch(), "actions"), P1, [
      "mechanical",
      "mechanical",
    ]);
    expect(attackIsUnlocked(one, P1, retool)).toBe(false);
    expect(attackIsUnlocked(two, P1, retool)).toBe(true);
  });

  it("needs both named attributes for a dual-color Unlock", () => {
    const onlyMech = withShowingFaces(withPhase(newMatch(), "actions"), P1, [
      "mechanical",
      "mechanical",
    ]);
    const both = withShowingFaces(withPhase(newMatch(), "actions"), P1, [
      "mechanical",
      "luminar",
    ]);
    expect(attackIsUnlocked(onlyMech, P1, dual)).toBe(false);
    expect(attackIsUnlocked(both, P1, dual)).toBe(true);
  });

  it("does not unlock from opponent showing faces", () => {
    let state = withPhase(newMatch(), "actions");
    state = withShowingFaces(state, P2, ["mechanical", "mechanical"]);
    expect(attackIsUnlocked(state, P1, crank)).toBe(false);
  });

  it("still unlocks when the showing slot is silenced", () => {
    let state = withShowingFaces(withPhase(newMatch(), "actions"), P1, ["mechanical"]);
    state = withSilencedShowingSlot(state, dieIdOf(state));
    expect(attackIsUnlocked(state, P1, crank)).toBe(true);
  });

  it("refuses an empty Unlock", () => {
    const state = withShowingFaces(withPhase(newMatch(), "actions"), P1, [
      "mechanical",
      "luminar",
    ]);
    expect(attackIsUnlocked(state, P1, empty)).toBe(false);
  });

  it("does not let Resonance wildcards cover Unlock", () => {
    let state = withShowingFaces(withPhase(newMatch(), "actions"), P1, ["shield", "shield"]);
    state = {
      ...state,
      requirementWildcardsThisTurn: { [P1]: [{ fromSymbol: "arcane" }, { fromSymbol: "arcane" }] },
    };
    expect(attackIsUnlocked(state, P1, crank)).toBe(false);
    expect(attackIsUnlocked(state, P1, retool)).toBe(false);
  });

  it("does not let any pips help Unlock", () => {
    const state = withShowingFaces(withPhase(newMatch(), "actions"), P1, [
      "mechanical",
      "luminar",
    ]);
    expect(attackIsUnlocked(state, P1, anyPip)).toBe(false);
  });

  it("recomputes after the showing face changes (reroll); Stamp would not", () => {
    const rolled = withShowingFaces(withPhase(newMatch(), "actions"), P1, ["mechanical"]);
    expect(attackIsUnlocked(rolled, P1, crank)).toBe(true);
    const rerolled = withShowingFaces(rolled, P1, ["shield"]);
    expect(attackIsUnlocked(rerolled, P1, crank)).toBe(false);
    const stamped = withShowingFaces(rerolled, P1, ["mechanical"]);
    expect(attackIsUnlocked(stamped, P1, crank)).toBe(true);
    expect(showingAttributeCounts(stamped, P1)).toEqual(showingAttributeCounts(rolled, P1));
  });
});
