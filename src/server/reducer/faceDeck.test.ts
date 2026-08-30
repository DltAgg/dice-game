import { describe, expect, it } from "vitest";
import { COG_DRAFT, MENDING_LIGHT, TOOLING_ORDER } from "../content/cards.js";
import {
  COGTOOTH,
  ENGINE_TEST_FACE_DECK,
  GEAR_TRAIN,
  HALO_LAMP,
  LUCENT_CHOIR,
  MAINSPRING,
  SPECIAL_FACE_CARDS,
  SUNWARD_LENS,
  naturalFaceId,
} from "../content/faces.js";
import { TEMPO_FACE_DECK } from "../content/loadouts/index.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import type { DieId } from "../model/ids.js";
import { validateFaceDeck } from "../rules/faces.js";
import {
  forgeAction,
  handCardIdAt,
  newMatch,
  newMatchWithDecks,
  P1,
  withPile,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

describe("face deck", () => {
  it("loads the engine-test face deck into each player's face pool at setup", () => {
    const state = newMatch();
    expect(state.players[P1]?.facePool).toEqual([...ENGINE_TEST_FACE_DECK]);
    expect(validateFaceDeck(ENGINE_TEST_FACE_DECK, DEFAULT_RULES_CONFIG).ok).toBe(true);
  });

  it("keeps the Tempo face deck legal under attribute caps", () => {
    expect(validateFaceDeck(TEMPO_FACE_DECK, DEFAULT_RULES_CONFIG).ok).toBe(true);
    expect(TEMPO_FACE_DECK.length).toBeLessThanOrEqual(DEFAULT_RULES_CONFIG.faceDeckMaxCards);
    expect(TEMPO_FACE_DECK).toHaveLength(6);
    expect(new Set(TEMPO_FACE_DECK).size).toBe(TEMPO_FACE_DECK.length);
    expect(TEMPO_FACE_DECK).toEqual(
      expect.arrayContaining([COGTOOTH, GEAR_TRAIN, MAINSPRING, HALO_LAMP, LUCENT_CHOIR, SUNWARD_LENS]),
    );
  });

  it("refuses a face deck over the twelve-card cap", () => {
    const oversized = [...TEMPO_FACE_DECK, COGTOOTH, GEAR_TRAIN, MAINSPRING, HALO_LAMP, LUCENT_CHOIR, SUNWARD_LENS, COGTOOTH];
    expect(oversized.length).toBeGreaterThan(DEFAULT_RULES_CONFIG.faceDeckMaxCards);
    const result = validateFaceDeck(oversized, DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/max 12/);
  });

  it("refuses more than three face cards of one attribute", () => {
    const tooMany = [COGTOOTH, GEAR_TRAIN, MAINSPRING, COGTOOTH];
    const result = validateFaceDeck(tooMany, DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/mechanical/);
  });

  it("takes a face from the pool on first forge and leaves it out while installed", () => {
    const state = withPile(withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]), P1, 10);
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("test: no die");

    expect(state.players[P1]?.facePool).toContain(COGTOOTH);

    const forged = advance(
      state,
      forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4]),
    );

    expect(forged.ok).toBe(true);
    if (!forged.ok) return;
    expect(forged.state.players[P1]?.facePool).not.toContain(COGTOOTH);
    expect(forged.state.dice[dieId]?.slots[4]?.faceCardId).toBe(COGTOOTH);
  });

  it("forges a natural Luminar face via Mending Light and generates Mechanical", () => {
    const state = withPile(
      withHand(withPhase(newMatchWithDecks(), "actions"), P1, [MENDING_LIGHT]),
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
    expect(forged.state.dice[dieId]?.slots[5]?.faceCardId).toBe(naturalFaceId("luminar"));
    expect(forged.state.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("installs a named synthetic from the pool via Tooling Order", () => {
    const state = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [TOOLING_ORDER]),
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
    expect(forged.state.dice[dieId]?.slots[4]?.faceCardId).toBe(COGTOOTH);
  });

  it("returns a displaced starting face to the pool when its last copy is gone", () => {
    let state = withPile(withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]), P1, 10);
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
      state = withPile(withHand(withPhase(state, "actions"), P1, [COG_DRAFT]), P1, 10);
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

  it("catalogues every printed Tempo special face", () => {
    expect(SPECIAL_FACE_CARDS.map((face) => face.name)).toEqual([
      "Cogtooth",
      "Gear Train",
      "Mainspring",
      "Halo Lamp",
      "Lucent Choir",
      "Sunward Lens",
    ]);
  });
});
