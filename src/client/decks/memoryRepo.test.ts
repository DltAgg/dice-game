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
  TAG_SKIRMISH_LOADOUT,
  TEMPO_DECK,
  TEMPO_FACE_DECK,
  TEMPO_SQUAD,
} from "@server";
import { TAG_FIGHTER_RULES } from "@server/model/config.js";
import { createMemoryDeckRepository } from "./memoryRepo.js";
import {
  buildBuiltinDecks,
  BURN_SAVED_DECK_ID,
  COMBO_MECHANICAL_SAVED_DECK_ID,
  CONTROL_SAVED_DECK_ID,
  PROTOTYPE_SAVED_DECK_ID,
  TAG_SKIRMISH_SAVED_DECK_ID,
  TEMPO_SAVED_DECK_ID,
} from "./prototype.js";
import { validateSavedDeck } from "./validate.js";

const TAG_SQUAD_IDS = ["creature-vega", "creature-magnus", "creature-ryu"] as const;

describe("memory DeckRepository", () => {
  it("lists the Tag Skirmish builtin loadout", () => {
    const repo = createMemoryDeckRepository();
    const listed = repo.list();
    expect(listed.map((deck) => deck.id)).toEqual([TAG_SKIRMISH_SAVED_DECK_ID]);
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
    expect(repo.list()).toHaveLength(2);
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
    expect(repo.remove(TAG_SKIRMISH_SAVED_DECK_ID)).toBe(false);
    expect(repo.remove(TEMPO_SAVED_DECK_ID)).toBe(false);
    expect(repo.list()).toHaveLength(1);
  });
});

describe("builtin loadouts", () => {
  it("validates all builtins under current rules", () => {
    for (const deck of buildBuiltinDecks()) {
      expect(validateSavedDeck(deck), deck.name).toEqual({ ok: true });
    }
  });

  it("fields the Tag Skirmish trio and a legal tactics list", () => {
    expect(TEMPO_SQUAD).toEqual(TAG_SQUAD_IDS);
    expect(CONTROL_SQUAD).toEqual(TAG_SQUAD_IDS);
    expect(CONTROL_DECK).toEqual(TEMPO_DECK);
    expect(CONTROL_FACE_DECK).toEqual(TEMPO_FACE_DECK);
    expect(TEMPO_DECK.length).toBeGreaterThanOrEqual(TAG_FIGHTER_RULES.deckMinCards);
    expect(TEMPO_DECK.length).toBeLessThanOrEqual(TAG_FIGHTER_RULES.deckMaxCards);
    expect(TEMPO_FACE_DECK.length).toBeLessThanOrEqual(TAG_FIGHTER_RULES.faceDeckMaxCards);
    expect(TAG_SKIRMISH_LOADOUT.startingDice).toHaveLength(3);
  });

  it("aliases Combo Mechanical and Burn to Tag Skirmish", () => {
    expect(COMBO_MECHANICAL_SQUAD).toEqual(TEMPO_SQUAD);
    expect(COMBO_MECHANICAL_DECK).toEqual(TEMPO_DECK);
    expect(COMBO_MECHANICAL_FACE_DECK).toEqual(TEMPO_FACE_DECK);
    expect(BURN_SQUAD).toEqual(TEMPO_SQUAD);
    expect(BURN_DECK).toEqual(TEMPO_DECK);
    expect(BURN_FACE_DECK).toEqual(TEMPO_FACE_DECK);
  });

  it("keeps retired saved-deck ids pointed at Tag Skirmish", () => {
    expect(PROTOTYPE_SAVED_DECK_ID).toBe("deck-tag-skirmish");
    expect(TEMPO_SAVED_DECK_ID).toBe(TAG_SKIRMISH_SAVED_DECK_ID);
    expect(CONTROL_SAVED_DECK_ID).toBe(TAG_SKIRMISH_SAVED_DECK_ID);
    expect(COMBO_MECHANICAL_SAVED_DECK_ID).toBe(TEMPO_SAVED_DECK_ID);
    expect(BURN_SAVED_DECK_ID).toBe(TEMPO_SAVED_DECK_ID);
  });
});
