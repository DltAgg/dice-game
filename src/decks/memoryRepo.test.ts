import { describe, expect, it } from "vitest";
import { PROTOTYPE_DECK, PROTOTYPE_FACE_DECK, PROTOTYPE_SQUAD } from "@/game";
import { createMemoryDeckRepository } from "./memoryRepo.js";
import { PROTOTYPE_SAVED_DECK_ID } from "./prototype.js";

describe("memory DeckRepository", () => {
  it("always lists the builtin prototype", () => {
    const repo = createMemoryDeckRepository();
    const listed = repo.list();
    expect(listed[0]?.id).toBe(PROTOTYPE_SAVED_DECK_ID);
    expect(listed[0]?.builtin).toBe(true);
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
    expect(repo.list()).toHaveLength(2);
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

  it("cannot delete the prototype", () => {
    const repo = createMemoryDeckRepository();
    expect(repo.remove(PROTOTYPE_SAVED_DECK_ID)).toBe(false);
    expect(repo.list()).toHaveLength(1);
  });
});
