import { describe, expect, it } from "vitest";
import {
  COMBO_MECHANICAL_DECK,
  COMBO_MECHANICAL_FACE_DECK,
  COMBO_MECHANICAL_SQUAD,
  CONTROL_DECK,
  CONTROL_FACE_DECK,
  CONTROL_SQUAD,
  PROTOTYPE_DECK,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_SQUAD,
  TEMPO_DECK,
  TEMPO_FACE_DECK,
  TEMPO_SQUAD,
} from "@/game";
import { createMemoryDeckRepository } from "./memoryRepo.js";
import {
  buildBuiltinDecks,
  COMBO_MECHANICAL_SAVED_DECK_ID,
  CONTROL_SAVED_DECK_ID,
  PROTOTYPE_SAVED_DECK_ID,
  TEMPO_SAVED_DECK_ID,
} from "./prototype.js";
import { validateSavedDeck } from "./validate.js";

describe("memory DeckRepository", () => {
  it("always lists builtin Aggro, Control, Tempo, and Combo Mechanical", () => {
    const repo = createMemoryDeckRepository();
    const listed = repo.list();
    expect(listed.map((deck) => deck.id)).toEqual([
      PROTOTYPE_SAVED_DECK_ID,
      CONTROL_SAVED_DECK_ID,
      TEMPO_SAVED_DECK_ID,
      COMBO_MECHANICAL_SAVED_DECK_ID,
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
    });
    expect(repo.get(saved.id)?.name).toBe("My deck");
    expect(repo.list()).toHaveLength(5);
  });

  it("persists an illegal draft for later editing", () => {
    const repo = createMemoryDeckRepository();
    const saved = repo.save({
      name: "WIP",
      squad: PROTOTYPE_SQUAD,
      deck: PROTOTYPE_DECK.slice(0, 10),
      faceDeck: PROTOTYPE_FACE_DECK,
    });
    expect(repo.get(saved.id)?.deck).toHaveLength(10);
  });

  it("cannot delete builtins", () => {
    const repo = createMemoryDeckRepository();
    expect(repo.remove(PROTOTYPE_SAVED_DECK_ID)).toBe(false);
    expect(repo.remove(CONTROL_SAVED_DECK_ID)).toBe(false);
    expect(repo.remove(TEMPO_SAVED_DECK_ID)).toBe(false);
    expect(repo.remove(COMBO_MECHANICAL_SAVED_DECK_ID)).toBe(false);
    expect(repo.list()).toHaveLength(4);
  });
});

describe("builtin loadouts", () => {
  it("validates all builtins under current rules", () => {
    for (const deck of buildBuiltinDecks()) {
      expect(validateSavedDeck(deck), deck.name).toEqual({ ok: true });
    }
  });

  it("fields the control Arcane trio and a legal tactics/face pool", () => {
    expect(CONTROL_SQUAD).toEqual([
      "creature-archmage",
      "creature-corrupting-elder",
      "creature-void-summoner",
    ]);
    expect(CONTROL_DECK.length).toBeGreaterThanOrEqual(50);
    expect(CONTROL_DECK.length).toBeLessThanOrEqual(60);
    expect(CONTROL_FACE_DECK).toHaveLength(12);
    expect(new Set(CONTROL_FACE_DECK).size).toBe(12);
  });

  it("fields the tempo Mech/Luminar trio and a legal tactics/face pool", () => {
    expect(TEMPO_SQUAD).toEqual([
      "creature-cogwork-driver",
      "creature-prism-herald",
      "creature-aegis-link",
    ]);
    expect(TEMPO_DECK.length).toBeGreaterThanOrEqual(50);
    expect(TEMPO_DECK.length).toBeLessThanOrEqual(60);
    expect(TEMPO_FACE_DECK).toHaveLength(12);
    expect(new Set(TEMPO_FACE_DECK).size).toBe(12);
  });

  it("fields the combo mechanical trio and a legal tactics/face pool", () => {
    expect(COMBO_MECHANICAL_SQUAD).toEqual([
      "creature-servo-assembly",
      "creature-clockwork-dynamo",
      "creature-lens-choir",
    ]);
    expect(COMBO_MECHANICAL_DECK.length).toBeGreaterThanOrEqual(50);
    expect(COMBO_MECHANICAL_DECK.length).toBeLessThanOrEqual(60);
    expect(COMBO_MECHANICAL_FACE_DECK).toHaveLength(12);
    expect(new Set(COMBO_MECHANICAL_FACE_DECK).size).toBe(12);
  });
});
