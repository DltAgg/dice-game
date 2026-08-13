import { describe, expect, it } from "vitest";
import {
  CONTROL_DECK,
  CONTROL_FACE_DECK,
  CONTROL_SQUAD,
  PROTOTYPE_DECK,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_SQUAD,
} from "@/game";
import { createMemoryDeckRepository } from "./memoryRepo.js";
import {
  buildBuiltinDecks,
  CONTROL_SAVED_DECK_ID,
  PROTOTYPE_SAVED_DECK_ID,
} from "./prototype.js";
import { validateSavedDeck } from "./validate.js";

describe("memory DeckRepository", () => {
  it("always lists builtin Aggro and Control", () => {
    const repo = createMemoryDeckRepository();
    const listed = repo.list();
    expect(listed.map((deck) => deck.id)).toEqual([
      PROTOTYPE_SAVED_DECK_ID,
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
    });
    expect(repo.get(saved.id)?.deck).toHaveLength(10);
  });

  it("cannot delete builtins", () => {
    const repo = createMemoryDeckRepository();
    expect(repo.remove(PROTOTYPE_SAVED_DECK_ID)).toBe(false);
    expect(repo.remove(CONTROL_SAVED_DECK_ID)).toBe(false);
    expect(repo.list()).toHaveLength(2);
  });
});

describe("builtin loadouts", () => {
  it("validates Aggro and Control under current rules", () => {
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
});
