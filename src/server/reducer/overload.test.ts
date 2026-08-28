import { describe, expect, it } from "vitest";
import {
  ARCANE_RESONANCE,
  ECLIPSE,
  LUMINAR_PRISM,
  MARTIAL_BLESSING,
  PERSISTENT_INFECTION,
} from "../content/cards.js";
import { faceIdForSymbol } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { overloadsOf, overloadsOnFace, graveyardOf } from "../rules/cards.js";
import { advanceResolvingChain as advance } from "../testing/scenario.js";
import {
  eventTypes,
  forgeAction,
  handCardIdAt,
  newMatch,
  P1,
  withDamage,
  withEnergy,
  withHand,
  withPhase,
  creatureIdAt,
} from "../testing/scenario.js";

/**
 * Overloads attach to face cards. Die faces only reference those cards; every
 * die showing the overloaded face card fires it on roll.
 */

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][], energy = 10) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

const luminarSlot = 3;
const luminarFace = faceIdForSymbol("luminar");

function dieIdOf(state: GameState, index = 0): DieId {
  const id = state.players[P1]?.dieIds[index];
  if (id === undefined) throw new Error("test: no die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

describe("overload attachment", () => {
  it("attaches to a face card, not a physical die slot", () => {
    const state = actionsReady([LUMINAR_PRISM]);
    const cardInstanceId = handCardIdAt(state, P1, 0);

    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId,
      declaredFaceCardId: luminarFace,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [overload] = overloadsOf(result.state, P1);
    expect(overload?.zone).toBe("overload");
    expect(overload?.attachedToFaceCardId).toBe(luminarFace);
    expect(overloadsOnFace(result.state, P1, luminarFace)).toHaveLength(1);
    expect(eventTypes(result.state)).toContain("overload-attached");
    expect(result.state.players[P1]?.attributePool.luminar).toBe(8);
  });

  it("refuses a face that does not match the printed restriction", () => {
    const state = actionsReady([PERSISTENT_INFECTION]);
    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
      declaredFaceCardId: luminarFace,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });
});

describe("overload on roll", () => {
  it("heals the most damaged ally when any die shows the overloaded face card", () => {
    const base = actionsReady([LUMINAR_PRISM]);
    const dieId = dieIdOf(base);
    const targetId = creatureIdAt(base, P1, 0);
    const attached = advance(withDamage(base, targetId, 2), {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(base, P1, 0),
      declaredFaceCardId: luminarFace,
    });
    expect(attached.ok).toBe(true);
    if (!attached.ok) return;

    // Other die shows luminar — same face card, so Prism still fires.
    let rolled: GameState = withPhase(attached.state, "roll");
    rolled = withDie(rolled, dieId, { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, 1), { retained: true, rolledSlotIndex: luminarSlot });

    const result = advance(rolled, { type: "ROLL_DICE", playerId: P1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.creatures[targetId]?.damage).toBe(1);
    expect(eventTypes(result.state)).toContain("creature-healed");
  });

  it("does nothing visible when every ally is already at full life", () => {
    const base = actionsReady([LUMINAR_PRISM]);
    const attached = advance(base, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(base, P1, 0),
      declaredFaceCardId: luminarFace,
    });
    expect(attached.ok).toBe(true);
    if (!attached.ok) return;

    let rolled: GameState = withPhase(attached.state, "roll");
    rolled = withDie(rolled, dieIdOf(rolled, 0), { retained: true, rolledSlotIndex: luminarSlot });
    rolled = withDie(rolled, dieIdOf(rolled, 1), { retained: true, rolledSlotIndex: 0 });

    const result = advance(rolled, { type: "ROLL_DICE", playerId: P1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(eventTypes(result.state)).not.toContain("creature-healed");
  });

  it("fires on the roll even if that symbol is later absorbed", () => {
    const base = actionsReady([ARCANE_RESONANCE]);
    const arcaneFace = faceIdForSymbol("arcane");
    const attached = advance(base, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(base, P1, 0),
      declaredFaceCardId: arcaneFace,
    });
    expect(attached.ok).toBe(true);
    if (!attached.ok) return;

    let rolled: GameState = withPhase(attached.state, "roll");
    rolled = withDie(rolled, dieIdOf(rolled, 0), { retained: true, rolledSlotIndex: 2 });
    rolled = withDie(rolled, dieIdOf(rolled, 1), { retained: true, rolledSlotIndex: 0 });

    const afterRoll = advance(rolled, { type: "ROLL_DICE", playerId: P1 });
    expect(afterRoll.ok).toBe(true);
    if (!afterRoll.ok) return;

    const fromOverload = Object.values(afterRoll.state.symbols).filter(
      (symbol) => symbol.symbol === "arcane" && symbol.sourceDieId === null,
    );
    expect(fromOverload.length).toBeGreaterThanOrEqual(1);
  });

  it("applies once per die that shows the overloaded face card", () => {
    const base = actionsReady([LUMINAR_PRISM]);
    const targetId = creatureIdAt(base, P1, 0);

    const attached = advance(withDamage(base, targetId, 3), {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(base, P1, 0),
      declaredFaceCardId: luminarFace,
    });
    expect(attached.ok).toBe(true);
    if (!attached.ok) return;

    let rolled: GameState = withPhase(attached.state, "roll");
    for (const id of rolled.players[P1]?.dieIds ?? []) {
      rolled = withDie(rolled, id, { retained: true, rolledSlotIndex: luminarSlot });
    }

    const afterRoll = advance(rolled, { type: "ROLL_DICE", playerId: P1 });
    expect(afterRoll.ok).toBe(true);
    if (!afterRoll.ok) return;
    expect(afterRoll.state.creatures[targetId]?.damage).toBe(1);
    expect(eventTypes(afterRoll.state).filter((type) => type === "creature-healed")).toHaveLength(2);
  });
});

describe("forging and face-card overloads", () => {
  it("keeps overloads while another die face still references the card", () => {
    const base = actionsReady([LUMINAR_PRISM]);
    const die0 = dieIdOf(base, 0);
    const attached = advance(base, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(base, P1, 0),
      declaredFaceCardId: luminarFace,
    });
    expect(attached.ok).toBe(true);
    if (!attached.ok) return;

    const forgeReady = withEnergy(
      withHand(withPhase(attached.state, "actions"), P1, [ECLIPSE]),
      P1,
      10,
    );

    // Replace luminar on die0 only — die1 still shows the shared luminar face.
    const result = advance(
      forgeReady,
      forgeAction(forgeReady, P1, handCardIdAt(forgeReady, P1, 0), die0, [luminarSlot]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(overloadsOnFace(result.state, P1, luminarFace)).toHaveLength(1);
    expect(overloadsOf(result.state, P1)).toHaveLength(1);
  });

  it("clears overloads when the last copy of the face card leaves play", () => {
    const base = actionsReady([LUMINAR_PRISM]);
    const die0 = dieIdOf(base, 0);
    const die1 = dieIdOf(base, 1);

    const attached = advance(base, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(base, P1, 0),
      declaredFaceCardId: luminarFace,
    });
    expect(attached.ok).toBe(true);
    if (!attached.ok) return;

    const overloadId = overloadsOf(attached.state, P1)[0]?.id;
    if (overloadId === undefined) throw new Error("test: no overload");

    let forgeReady = withEnergy(
      withHand(withPhase(attached.state, "actions"), P1, [ECLIPSE, ECLIPSE]),
      P1,
      10,
    );

    const first = advance(
      forgeReady,
      forgeAction(forgeReady, P1, handCardIdAt(forgeReady, P1, 0), die0, [luminarSlot]),
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    forgeReady = withEnergy(
      withHand(withPhase(first.state, "actions"), P1, [ECLIPSE]),
      P1,
      10,
    );
    const second = advance(
      forgeReady,
      forgeAction(forgeReady, P1, handCardIdAt(forgeReady, P1, 0), die1, [luminarSlot]),
    );

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(overloadsOnFace(second.state, P1, luminarFace)).toEqual([]);
    expect(overloadsOf(second.state, P1)).toHaveLength(0);
    expect(graveyardOf(second.state, P1).some((card) => card.id === overloadId)).toBe(true);
    expect(eventTypes(second.state)).toContain("overload-detached");
  });
});

describe("former variable Energy costs (? → fixed play cost)", () => {
  it("pays the fixed catalogue play cost of 1 Martial for Martial Blessing", () => {
    const state = actionsReady([MARTIAL_BLESSING]);
    const result = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
      declaredFaceCardId: faceIdForSymbol("arcane"),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players[P1]?.attributePool.martial).toBe(9);
    expect(overloadsOf(result.state, P1)).toHaveLength(1);
  });
});
