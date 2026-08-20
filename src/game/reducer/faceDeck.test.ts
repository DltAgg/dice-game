import { describe, expect, it } from "vitest";
import { ARCANE_ECHO, ECLIPSE, LIVING_LIBRARY, TOXIC_BLESSING } from "../content/cards.js";
import {
  ARCANE_ECHO_FACE,
  BLIGHT,
  CANKER,
  COMBO_MECHANICAL_FACE_DECK,
  CONTROL_FACE_DECK,
  ENGINE_TEST_FACE_DECK,
  GEAR,
  GREAT_SPARK,
  HEXBRAND,
  INFECTION,
  INSIGHT_RUNE,
  NIGHTWELL,
  PROTOTYPE_FACE_DECK,
  REKINDLE,
  RESONANCE_RUNE,
  RUNEFLARE,
  SEEP,
  CRUSH,
  SPECIAL_FACE_CARDS,
  SHADOW_ECHO,
  STAIN,
  TEMPO_FACE_DECK,
} from "../content/faces.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import type { DieId } from "../model/ids.js";
import { validateFaceDeck } from "../rules/faces.js";
import { advanceResolvingChain as advance } from "../testing/scenario.js";
import {
  forgeAction,
  handCardIdAt,
  newMatch,
  newMatchWithDecks,
  P1,
  withEnergy,
  withHand,
  withPhase,
} from "../testing/scenario.js";
import { eventTypes } from "../testing/scenario.js";

describe("face deck", () => {
  it("loads the engine-test face deck into each player's face pool at setup", () => {
    const state = newMatch();
    expect(state.players[P1]?.facePool).toEqual([...ENGINE_TEST_FACE_DECK]);
    expect(validateFaceDeck(ENGINE_TEST_FACE_DECK, DEFAULT_RULES_CONFIG).ok).toBe(true);
  });

  it("keeps the builtin aggro face deck legal under attribute caps", () => {
    expect(validateFaceDeck(PROTOTYPE_FACE_DECK, DEFAULT_RULES_CONFIG).ok).toBe(true);
    expect(PROTOTYPE_FACE_DECK.length).toBeLessThanOrEqual(DEFAULT_RULES_CONFIG.faceDeckMaxCards);
    expect(PROTOTYPE_FACE_DECK).toHaveLength(9);
    expect(new Set(PROTOTYPE_FACE_DECK).size).toBe(PROTOTYPE_FACE_DECK.length);
    expect(PROTOTYPE_FACE_DECK).not.toContain(INFECTION);
    expect(PROTOTYPE_FACE_DECK).not.toContain(STAIN);
    expect(PROTOTYPE_FACE_DECK).not.toContain(GREAT_SPARK);
    expect(PROTOTYPE_FACE_DECK).not.toContain(REKINDLE);
  });

  it("keeps the builtin control face deck legal under attribute caps", () => {
    expect(validateFaceDeck(CONTROL_FACE_DECK, DEFAULT_RULES_CONFIG).ok).toBe(true);
    expect(CONTROL_FACE_DECK).toHaveLength(DEFAULT_RULES_CONFIG.faceDeckMaxCards);
    expect(new Set(CONTROL_FACE_DECK).size).toBe(CONTROL_FACE_DECK.length);
    expect(CONTROL_FACE_DECK).toEqual(
      expect.arrayContaining([NIGHTWELL, RUNEFLARE, RESONANCE_RUNE, SHADOW_ECHO]),
    );
    expect(CONTROL_FACE_DECK).not.toContain(BLIGHT);
    expect(CONTROL_FACE_DECK).not.toContain(HEXBRAND);
    expect(CONTROL_FACE_DECK).not.toContain(CANKER);
    expect(CONTROL_FACE_DECK).not.toContain(STAIN);
    expect(CONTROL_FACE_DECK).not.toContain(GREAT_SPARK);
    expect(CONTROL_FACE_DECK).not.toContain(REKINDLE);
  });

  it("keeps the builtin tempo face deck legal under attribute caps", () => {
    expect(validateFaceDeck(TEMPO_FACE_DECK, DEFAULT_RULES_CONFIG).ok).toBe(true);
    expect(TEMPO_FACE_DECK).toHaveLength(DEFAULT_RULES_CONFIG.faceDeckMaxCards);
    expect(new Set(TEMPO_FACE_DECK).size).toBe(TEMPO_FACE_DECK.length);
  });

  it("keeps the builtin combo mechanical face deck legal under attribute caps", () => {
    expect(validateFaceDeck(COMBO_MECHANICAL_FACE_DECK, DEFAULT_RULES_CONFIG).ok).toBe(true);
    expect(COMBO_MECHANICAL_FACE_DECK).toHaveLength(DEFAULT_RULES_CONFIG.faceDeckMaxCards);
    expect(new Set(COMBO_MECHANICAL_FACE_DECK).size).toBe(COMBO_MECHANICAL_FACE_DECK.length);
  });

  it("refuses a face deck over the twelve-card cap", () => {
    const oversized = [...CONTROL_FACE_DECK, GEAR];
    const result = validateFaceDeck(oversized, DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/max 12/);
  });

  it("refuses more than three face cards of one attribute", () => {
    const tooMany = [
      STAIN,
      STAIN,
      STAIN,
      STAIN,
    ];
    const result = validateFaceDeck(tooMany, DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/corruption/);
  });

  it("takes a face from the pool on first forge and leaves it out while installed", () => {
    const state = withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]), P1, 10);
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("test: no die");

    expect(state.players[P1]?.facePool).toContain(SHADOW_ECHO);

    const forged = advance(
      state,
      forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4]),
    );

    expect(forged.ok).toBe(true);
    if (!forged.ok) return;
    expect(forged.state.players[P1]?.facePool).not.toContain(SHADOW_ECHO);
    expect(forged.state.dice[dieId]?.slots[4]?.faceCardId).toBe(SHADOW_ECHO);
  });

  it("forges a leftover builtin special and still draws", () => {
    const state = withEnergy(
      withHand(withPhase(newMatchWithDecks(), "actions"), P1, [TOXIC_BLESSING]),
      P1,
      10,
    );
    expect(state.players[P1]?.facePool).toContain(SEEP);
    expect(state.players[P1]?.facePool).not.toContain(CRUSH);
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("test: no die");
    expect(state.players[P1]?.deck.length).toBeGreaterThan(0);
    const forged = advance(
      state,
      forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [5]),
    );
    expect(forged.ok).toBe(true);
    if (!forged.ok) return;
    expect(forged.state.dice[dieId]?.slots[5]?.faceCardId).toBe(SEEP);
    expect(eventTypes(forged.state)).toContain("card-drawn");
  });

  it("installs a named synthetic when the card is not Echo-tagged", () => {
    const state = withEnergy(
      withHand(withPhase(newMatch(), "actions"), P1, [LIVING_LIBRARY]),
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
    expect(forged.state.dice[dieId]?.slots[4]?.faceCardId).toBe(INSIGHT_RUNE);
  });

  it("returns a displaced starting face to the pool when its last copy is gone", () => {
    let state = withEnergy(withHand(withPhase(newMatch(), "actions"), P1, [ECLIPSE]), P1, 10);
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
    expect(shieldSlots.length).toBe(4);

    for (const { dieId, slot } of shieldSlots) {
      state = withEnergy(withHand(withPhase(state, "actions"), P1, [ECLIPSE]), P1, 10);
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

  it("catalogues every printed special face", () => {
    expect(SPECIAL_FACE_CARDS.map((face) => face.name)).toEqual([
      "Arcane Echo",
      "Blade Rain",
      "Rending Claw",
      "Crush",
      "Forbidden Heritage",
      "Pestilent Plague",
      "Insight Rune",
      "Conversion Rune",
      "Resonance Rune",
      "Vital Spark",
      "Aegis",
      "Revelation",
      "Instinct",
      "Primordial Fury",
      "Pack",
      "Command",
      "Impact",
      "Formation",
      "Venom",
      "Spores",
      "Adaptive Toxin",
      "Stain",
      "Infection",
      "Decay",
      "Blight",
      "Hexbrand",
      "Canker",
      "Gear",
      "Catalyst",
      "Overcharge",
      "Flywheel",
      "Piston",
      "Shadow Echo",
      "Drain",
      "Sacrifice",
      "Nightwell",
      "Runeflare",
      "Warhorn",
      "Cleaving Strike",
      "Bloodscent",
      "Gore",
      "Needle",
      "Seep",
      "Marrow Rot",
      "Cinder",
      "Wasting Brand",
    ]);
  });

  it("lets only Echo-tagged tactics forge Arcane Echo", () => {
    const state = withEnergy(
      withHand(withPhase(newMatch(), "actions"), P1, [LIVING_LIBRARY, ARCANE_ECHO]),
      P1,
      10,
    );
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("test: no die");

    const library = advance(
      state,
      forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4]),
    );
    expect(library.ok).toBe(true);
    if (!library.ok) return;
    expect(library.state.dice[dieId]?.slots[4]?.faceCardId).toBe(INSIGHT_RUNE);

    const echoReady = withEnergy(
      withHand(withPhase(library.state, "actions"), P1, [ARCANE_ECHO]),
      P1,
      10,
    );
    const echo = advance(
      echoReady,
      forgeAction(echoReady, P1, handCardIdAt(echoReady, P1, 0), dieId, [5]),
    );
    expect(echo.ok).toBe(true);
    if (!echo.ok) return;
    expect(echo.state.dice[dieId]?.slots[5]?.faceCardId).toBe(ARCANE_ECHO_FACE);
  });
});
