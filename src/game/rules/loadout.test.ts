import { describe, expect, it } from "vitest";
import { ALL_CARDS, ECLIPSE, PROTOTYPE_DECK } from "../content/cards.js";
import { PROTOTYPE_SQUAD } from "../content/creatures.js";
import { PROTOTYPE_FACE_DECK } from "../content/faces.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import { asCardId } from "../model/ids.js";
import { validateLoadout, validateTacticsDeck } from "./loadout.js";

describe("validateTacticsDeck", () => {
  it("accepts the prototype deck", () => {
    expect(validateTacticsDeck(PROTOTYPE_DECK, DEFAULT_RULES_CONFIG)).toEqual({ ok: true });
    expect(PROTOTYPE_DECK.length).toBeGreaterThanOrEqual(DEFAULT_RULES_CONFIG.deckMinCards);
    expect(PROTOTYPE_DECK.length).toBeLessThanOrEqual(DEFAULT_RULES_CONFIG.deckMaxCards);
  });

  it("refuses a deck below the minimum", () => {
    const result = validateTacticsDeck(PROTOTYPE_DECK.slice(0, 49), DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/min 50/);
  });

  it("refuses a deck above the maximum", () => {
    const oversized = [...PROTOTYPE_DECK, ...Array.from({ length: 9 }, () => ECLIPSE)];
    const result = validateTacticsDeck(oversized, DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/max 60/);
  });

  it("refuses a fifth copy of the same card", () => {
    const withoutEclipse = ALL_CARDS.filter((card) => card.id !== ECLIPSE).flatMap((card) => [
      card.id,
      card.id,
      card.id,
      card.id,
    ]);
    const five = [...withoutEclipse.slice(0, 47), ECLIPSE, ECLIPSE, ECLIPSE, ECLIPSE, ECLIPSE];
    expect(five).toHaveLength(52);
    const result = validateTacticsDeck(five, DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/copies/);
  });

  it("refuses an unknown card id", () => {
    const deck = [...PROTOTYPE_DECK.slice(0, 51), asCardId("card-not-real")];
    const result = validateTacticsDeck(deck, DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/unknown card/);
  });
});

describe("validateLoadout", () => {
  it("accepts the prototype loadout", () => {
    expect(
      validateLoadout(
        {
          squad: PROTOTYPE_SQUAD,
          deck: PROTOTYPE_DECK,
          faceDeck: PROTOTYPE_FACE_DECK,
        },
        DEFAULT_RULES_CONFIG,
      ),
    ).toEqual({ ok: true });
  });

  it("refuses a short squad", () => {
    const result = validateLoadout(
      {
        squad: PROTOTYPE_SQUAD.slice(0, 2),
        deck: PROTOTYPE_DECK,
        faceDeck: PROTOTYPE_FACE_DECK,
      },
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/squad/);
  });
});
