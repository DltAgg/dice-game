import { describe, expect, it } from "vitest";
import {
  BURN_DECK,
  BURN_FACE_DECK,
  BURN_SQUAD,
  COMBO_MECHANICAL_DECK,
  COMBO_MECHANICAL_FACE_DECK,
  COMBO_MECHANICAL_SQUAD,
  CONTROL_DECK,
  CONTROL_FACE_DECK,
  CONTROL_SQUAD,
  PROTOTYPE_DECK,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_SQUAD,
  PROTOTYPE_STARTING_DICE,
  TEMPO_DECK,
  TEMPO_FACE_DECK,
  TEMPO_SQUAD,
} from "@server";
import { DEFAULT_RULES_CONFIG } from "@server/model/config.js";
import { createMemoryDeckRepository } from "./memoryRepo.js";
import {
  buildBuiltinDecks,
  BURN_SAVED_DECK_ID,
  COMBO_MECHANICAL_SAVED_DECK_ID,
  CONTROL_SAVED_DECK_ID,
  PROTOTYPE_SAVED_DECK_ID,
  TEMPO_SAVED_DECK_ID,
} from "./prototype.js";
import { validateSavedDeck } from "./validate.js";

const TEMPO_SQUAD_IDS = [
  "creature-torque-wright",
  "creature-dawn-warden",
  "creature-lodestar-artificer",
] as const;

const CONTROL_SQUAD_IDS = [
  "creature-riftscribe-adept",
  "creature-gravemarrow-shade",
  "creature-duskthrone-oracle",
] as const;

describe("memory DeckRepository", () => {
  it("lists the Tempo and Control builtin loadouts", () => {
    const repo = createMemoryDeckRepository();
    const listed = repo.list();
    expect(listed.map((deck) => deck.id)).toEqual([
      TEMPO_SAVED_DECK_ID,
      CONTROL_SAVED_DECK_ID,
    ]);
    expect(listed.every((deck) => deck.builtin === true)).toBe(true);
  });

  it("round-trips a legal save", () => {
    const repo = createMemoryDeckRepository();
    const saved = repo.save({
      name: "My deck",
      squad: PROTOTYPE_SQUAD,
      deck: PROTOTYPE_DECK,
      faceDeck: PROTOTYPE_FACE_DECK,
      startingDice: PROTOTYPE_STARTING_DICE,
    });
    expect(repo.get(saved.id)?.name).toBe("My deck");
    expect(repo.list()).toHaveLength(3);
  });

  it("persists an illegal draft for later editing", () => {
    const repo = createMemoryDeckRepository();
    const saved = repo.save({
      name: "WIP",
      squad: PROTOTYPE_SQUAD,
      deck: PROTOTYPE_DECK.slice(0, 10),
      faceDeck: PROTOTYPE_FACE_DECK,
      startingDice: PROTOTYPE_STARTING_DICE,
    });
    expect(repo.get(saved.id)?.deck).toHaveLength(10);
  });

  it("cannot delete builtins", () => {
    const repo = createMemoryDeckRepository();
    expect(repo.remove(TEMPO_SAVED_DECK_ID)).toBe(false);
    expect(repo.remove(CONTROL_SAVED_DECK_ID)).toBe(false);
    expect(repo.list()).toHaveLength(2);
  });
});

describe("builtin loadouts", () => {
  it("validates all builtins under current rules", () => {
    for (const deck of buildBuiltinDecks()) {
      expect(validateSavedDeck(deck), deck.name).toEqual({ ok: true });
    }
  });

  it("fields the Control Arcane/Darkness trio and legal pools", () => {
    expect(CONTROL_SQUAD).toEqual(CONTROL_SQUAD_IDS);
    expect(CONTROL_SQUAD).not.toEqual(TEMPO_SQUAD);
    expect(CONTROL_DECK).not.toEqual(TEMPO_DECK);
    expect(CONTROL_FACE_DECK).not.toEqual(TEMPO_FACE_DECK);
    expect(CONTROL_DECK.length).toBe(40);
    expect(CONTROL_FACE_DECK).toHaveLength(6);
  });

  it("fields the tempo Mech/Luminar trio and a legal tactics/face pool", () => {
    expect(TEMPO_SQUAD).toEqual(TEMPO_SQUAD_IDS);
    expect(TEMPO_DECK.length).toBeGreaterThanOrEqual(DEFAULT_RULES_CONFIG.deckMinCards);
    expect(TEMPO_DECK.length).toBeLessThanOrEqual(DEFAULT_RULES_CONFIG.deckMaxCards);
    expect(TEMPO_FACE_DECK.length).toBeLessThanOrEqual(DEFAULT_RULES_CONFIG.faceDeckMaxCards);
    expect(TEMPO_FACE_DECK).toHaveLength(6);
    expect(new Set(TEMPO_FACE_DECK).size).toBe(6);
  });

  it("aliases Combo Mechanical to Tempo while names remain distinct", () => {
    expect(COMBO_MECHANICAL_SQUAD).toEqual(TEMPO_SQUAD);
    expect(COMBO_MECHANICAL_DECK).toEqual(TEMPO_DECK);
    expect(COMBO_MECHANICAL_FACE_DECK).toEqual(TEMPO_FACE_DECK);
    expect(COMBO_MECHANICAL_FACE_DECK).toHaveLength(6);
  });

  it("aliases Burn to Tempo while names remain distinct", () => {
    expect(BURN_SQUAD).toEqual(TEMPO_SQUAD);
    expect(BURN_DECK).toEqual(TEMPO_DECK);
    expect(BURN_FACE_DECK).toEqual(TEMPO_FACE_DECK);
    expect(new Set(BURN_FACE_DECK).size).toBe(BURN_FACE_DECK.length);
  });

  it("keeps unreconstructed saved-deck ids pointed at Tempo", () => {
    expect(PROTOTYPE_SAVED_DECK_ID).toBe(TEMPO_SAVED_DECK_ID);
    expect(CONTROL_SAVED_DECK_ID).toBe("deck-control");
    expect(COMBO_MECHANICAL_SAVED_DECK_ID).toBe(TEMPO_SAVED_DECK_ID);
    expect(BURN_SAVED_DECK_ID).toBe(TEMPO_SAVED_DECK_ID);
  });
});
