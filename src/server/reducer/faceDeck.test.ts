import { describe, expect, it } from "vitest";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import type { DieId } from "../model/ids.js";
import { validateFaceDeck } from "../rules/faces.js";
import {
  TEST_FACE_DECK,
  TEST_NATURAL_FORGE,
  TEST_PLAYABLE,
  TEST_SYNTHETIC_MECHANICAL_A,
  TEST_SYNTHETIC_MECHANICAL_B,
  TEST_SYNTHETIC_MECHANICAL_C,
  testNaturalFaceId,
} from "../testing/fixtures/index.js";
import {
  forgeAction,
  handCardIdAt,
  newMatch,
  P1,
  withPile,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

describe("face deck", () => {
  it("loads the test face deck into each player's face pool at setup", () => {
    const state = newMatch();
    expect(state.players[P1]?.facePool).toEqual([...TEST_FACE_DECK]);
    expect(validateFaceDeck(TEST_FACE_DECK, DEFAULT_RULES_CONFIG).ok).toBe(true);
  });

  it("keeps a six-card face deck legal under attribute caps", () => {
    expect(validateFaceDeck(TEST_FACE_DECK, DEFAULT_RULES_CONFIG).ok).toBe(true);
    expect(TEST_FACE_DECK.length).toBeLessThanOrEqual(DEFAULT_RULES_CONFIG.faceDeckMaxCards);
    expect(TEST_FACE_DECK).toHaveLength(6);
    expect(new Set(TEST_FACE_DECK).size).toBe(TEST_FACE_DECK.length);
  });

  it("refuses a face deck over the twelve-card cap", () => {
    const oversized = [
      ...TEST_FACE_DECK,
      TEST_SYNTHETIC_MECHANICAL_A,
      TEST_SYNTHETIC_MECHANICAL_B,
      TEST_SYNTHETIC_MECHANICAL_C,
      TEST_SYNTHETIC_MECHANICAL_A,
      TEST_SYNTHETIC_MECHANICAL_B,
      TEST_SYNTHETIC_MECHANICAL_C,
      TEST_SYNTHETIC_MECHANICAL_A,
    ];
    expect(oversized.length).toBeGreaterThan(DEFAULT_RULES_CONFIG.faceDeckMaxCards);
    const result = validateFaceDeck(oversized, DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/max 12/);
  });

  it("refuses more than three face cards of one attribute", () => {
    const tooMany = [
      TEST_SYNTHETIC_MECHANICAL_A,
      TEST_SYNTHETIC_MECHANICAL_B,
      TEST_SYNTHETIC_MECHANICAL_C,
      TEST_SYNTHETIC_MECHANICAL_A,
    ];
    const result = validateFaceDeck(tooMany, DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/mechanical/);
  });

  it("takes a face from the pool on first forge and leaves it out while installed", () => {
    const state = withPile(withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]), P1, 10);
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("test: no die");

    expect(state.players[P1]?.facePool).toContain(TEST_SYNTHETIC_MECHANICAL_A);

    const forged = advance(
      state,
      forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4]),
    );

    expect(forged.ok).toBe(true);
    if (!forged.ok) return;
    expect(forged.state.players[P1]?.facePool).not.toContain(TEST_SYNTHETIC_MECHANICAL_A);
    expect(forged.state.dice[dieId]?.slots[4]?.faceCardId).toBe(TEST_SYNTHETIC_MECHANICAL_A);
  });

  it("forges a natural Luminar face without burning its dual cost", () => {
    const state = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [TEST_NATURAL_FORGE]),
      P1,
      10,
    );
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("test: no die");
    const forged = advance(
      state,
      forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [5]),
    );
    expect(forged.ok).toBe(true);
    if (!forged.ok) return;
    expect(forged.state.dice[dieId]?.slots[5]?.faceCardId).toBe(testNaturalFaceId("luminar"));
    expect(forged.state.players[P1]?.attributePool.mechanical ?? 0).toBe(10);
  });

  it("installs a named synthetic from the pool via synthetic forge", () => {
    const state = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]),
      P1,
      10,
    );
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("test: no die");

    const forged = advance(
      state,
      forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4]),
    );

    expect(forged.ok).toBe(true);
    if (!forged.ok) return;
    expect(forged.state.dice[dieId]?.slots[4]?.faceCardId).toBe(TEST_SYNTHETIC_MECHANICAL_A);
  });

  it("returns a displaced starting face to the pool when its last copy is gone", () => {
    let state = withPile(withHand(withPhase(newMatch(), "actions"), P1, [TEST_PLAYABLE]), P1, 10);
    const dieIds = state.players[P1]?.dieIds ?? [];
    const shieldSlots: Array<{ dieId: DieId; slot: number }> = [];
    for (const dieId of dieIds) {
      const die = state.dice[dieId];
      if (die === undefined) continue;
      for (const slot of die.slots) {
        if (slot.faceCardId.includes("shield")) {
          shieldSlots.push({ dieId, slot: slot.index });
        }
      }
    }
    expect(shieldSlots.length).toBeGreaterThan(0);

    for (const { dieId, slot } of shieldSlots) {
      state = withPile(withHand(withPhase(state, "actions"), P1, [TEST_PLAYABLE]), P1, 10);
      const result = advance(
        state,
        forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [slot]),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      state = result.state;
    }

    expect(state.players[P1]?.facePool.some((id) => id.includes("shield"))).toBe(true);
  });
});
