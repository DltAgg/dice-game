import { describe, expect, it } from "vitest";
import {
  ALL_CARDS,
  BURN_DECK,
  COMBO_MECHANICAL_DECK,
  CONTROL_DECK,
  ECLIPSE,
  PROTOTYPE_DECK,
  TEMPO_DECK,
  getCard,
} from "../content/cards.js";
import {
  BURN_SQUAD,
  COMBO_MECHANICAL_SQUAD,
  CONTROL_SQUAD,
  PROTOTYPE_SQUAD,
  TEMPO_SQUAD,
} from "../content/creatures.js";
import {
  BURN_FACE_DECK,
  BURN_STARTING_DICE,
  BLOODSCENT,
  CLEAVING_STRIKE,
  COMBO_MECHANICAL_FACE_DECK,
  COMBO_MECHANICAL_STARTING_DICE,
  CONTROL_FACE_DECK,
  CONTROL_STARTING_DICE,
  CRUSH,
  FORBIDDEN_HERITAGE,
  ARCANE_ECHO_FACE,
  GORE,
  GREAT_SPARK,
  PESTILENT_PLAGUE,
  PRIMORDIAL_FURY,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_STARTING_DICE,
  SEEP,
  SHIELD_FACE_ID,
  MARROW_ROT,
  SPORES,
  CINDER,
  WASTING_BRAND,
  TEMPO_FACE_DECK,
  TEMPO_STARTING_DICE,
  WARHORN,
  naturalFaceId,
} from "../content/faces.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import { asCardId } from "../model/ids.js";
import { leftoverFacePool, validateLoadout, validateStartingDice, validateTacticsDeck } from "./loadout.js";

describe("validateTacticsDeck", () => {
  it("accepts the prototype aggro deck", () => {
    expect(validateTacticsDeck(PROTOTYPE_DECK, DEFAULT_RULES_CONFIG)).toEqual({ ok: true });
    expect(PROTOTYPE_DECK.length).toBeGreaterThanOrEqual(DEFAULT_RULES_CONFIG.deckMinCards);
    expect(PROTOTYPE_DECK.length).toBeLessThanOrEqual(DEFAULT_RULES_CONFIG.deckMaxCards);
  });

  it("accepts the control deck", () => {
    expect(validateTacticsDeck(CONTROL_DECK, DEFAULT_RULES_CONFIG)).toEqual({ ok: true });
    expect(CONTROL_DECK.length).toBeGreaterThanOrEqual(DEFAULT_RULES_CONFIG.deckMinCards);
    expect(CONTROL_DECK.length).toBeLessThanOrEqual(DEFAULT_RULES_CONFIG.deckMaxCards);
  });

  it("keeps builtin Control free of Corruption cards", () => {
    for (const id of CONTROL_DECK) {
      expect(getCard(id)?.attribute, id).not.toBe("corruption");
    }
  });

  it("accepts the tempo deck", () => {
    expect(validateTacticsDeck(TEMPO_DECK, DEFAULT_RULES_CONFIG)).toEqual({ ok: true });
    expect(TEMPO_DECK.length).toBeGreaterThanOrEqual(DEFAULT_RULES_CONFIG.deckMinCards);
    expect(TEMPO_DECK.length).toBeLessThanOrEqual(DEFAULT_RULES_CONFIG.deckMaxCards);
  });

  it("accepts the combo mechanical deck", () => {
    expect(validateTacticsDeck(COMBO_MECHANICAL_DECK, DEFAULT_RULES_CONFIG)).toEqual({
      ok: true,
    });
    expect(COMBO_MECHANICAL_DECK.length).toBeGreaterThanOrEqual(DEFAULT_RULES_CONFIG.deckMinCards);
    expect(COMBO_MECHANICAL_DECK.length).toBeLessThanOrEqual(DEFAULT_RULES_CONFIG.deckMaxCards);
  });

  it("accepts the burn deck", () => {
    expect(validateTacticsDeck(BURN_DECK, DEFAULT_RULES_CONFIG)).toEqual({ ok: true });
    expect(BURN_DECK.length).toBeGreaterThanOrEqual(DEFAULT_RULES_CONFIG.deckMinCards);
    expect(BURN_DECK.length).toBeLessThanOrEqual(DEFAULT_RULES_CONFIG.deckMaxCards);
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
  it("accepts the prototype aggro loadout", () => {
    expect(
      validateLoadout(
        {
          squad: PROTOTYPE_SQUAD,
          deck: PROTOTYPE_DECK,
          faceDeck: PROTOTYPE_FACE_DECK,
          startingDice: PROTOTYPE_STARTING_DICE,
        },
        DEFAULT_RULES_CONFIG,
      ),
    ).toEqual({ ok: true });
  });

  it("accepts the control loadout", () => {
    expect(
      validateLoadout(
        {
          squad: CONTROL_SQUAD,
          deck: CONTROL_DECK,
          faceDeck: CONTROL_FACE_DECK,
          startingDice: CONTROL_STARTING_DICE,
        },
        DEFAULT_RULES_CONFIG,
      ),
    ).toEqual({ ok: true });
  });

  it("accepts the tempo loadout", () => {
    expect(
      validateLoadout(
        {
          squad: TEMPO_SQUAD,
          deck: TEMPO_DECK,
          faceDeck: TEMPO_FACE_DECK,
          startingDice: TEMPO_STARTING_DICE,
        },
        DEFAULT_RULES_CONFIG,
      ),
    ).toEqual({ ok: true });
  });

  it("accepts the combo mechanical loadout", () => {
    expect(
      validateLoadout(
        {
          squad: COMBO_MECHANICAL_SQUAD,
          deck: COMBO_MECHANICAL_DECK,
          faceDeck: COMBO_MECHANICAL_FACE_DECK,
          startingDice: COMBO_MECHANICAL_STARTING_DICE,
        },
        DEFAULT_RULES_CONFIG,
      ),
    ).toEqual({ ok: true });
  });

  it("accepts the burn loadout", () => {
    expect(
      validateLoadout(
        {
          squad: BURN_SQUAD,
          deck: BURN_DECK,
          faceDeck: BURN_FACE_DECK,
          startingDice: BURN_STARTING_DICE,
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
        startingDice: PROTOTYPE_STARTING_DICE,
      },
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/squad/);
  });
});

describe("validateStartingDice", () => {
  const martial = naturalFaceId("martial");
  const wild = naturalFaceId("wild");
  const arcane = naturalFaceId("arcane");
  const luminar = naturalFaceId("luminar");
  const basics = [martial, wild, arcane, luminar, SHIELD_FACE_ID, SHIELD_FACE_ID] as const;

  it("refuses five Martial faces on one die", () => {
    const result = validateStartingDice(
      [[martial, martial, martial, martial, martial, SHIELD_FACE_ID], basics],
      PROTOTYPE_FACE_DECK,
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/martial/);
  });

  it("refuses a die with no Shield", () => {
    const result = validateStartingDice(
      [[martial, wild, arcane, luminar, martial, wild], basics],
      PROTOTYPE_FACE_DECK,
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Shield/);
  });

  it("allows two synthetics on one die under the default per-die cap", () => {
    const result = validateStartingDice(
      [
        [CRUSH, GREAT_SPARK, wild, arcane, luminar, SHIELD_FACE_ID],
        basics,
      ],
      [...PROTOTYPE_FACE_DECK, GREAT_SPARK],
      DEFAULT_RULES_CONFIG,
    );
    expect(result).toEqual({ ok: true });
  });

  it("allows two on-roll faces on one die under the default per-die cap", () => {
    const result = validateStartingDice(
      [
        [CRUSH, WARHORN, wild, arcane, luminar, SHIELD_FACE_ID],
        basics,
      ],
      PROTOTYPE_FACE_DECK,
      DEFAULT_RULES_CONFIG,
    );
    expect(result).toEqual({ ok: true });
  });

  it("refuses three on-roll faces on one die", () => {
    const result = validateStartingDice(
      [
        [CRUSH, WARHORN, GORE, martial, wild, SHIELD_FACE_ID],
        basics,
      ],
      PROTOTYPE_FACE_DECK,
      {
        ...DEFAULT_RULES_CONFIG,
        startingMaxSyntheticsPerDie: 3,
        startingMaxSyntheticsPerPlayer: 3,
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/on-roll/);
  });

  it("refuses three synthetics when the player cap is 2", () => {
    const result = validateStartingDice(
      [
        [CRUSH, WARHORN, wild, arcane, luminar, SHIELD_FACE_ID],
        [GORE, martial, wild, arcane, luminar, SHIELD_FACE_ID],
      ],
      PROTOTYPE_FACE_DECK,
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/synthetics/);
  });

  it("refuses Arcane Echo on an opening slot", () => {
    const result = validateStartingDice(
      [[ARCANE_ECHO_FACE, martial, wild, arcane, luminar, SHIELD_FACE_ID], basics],
      [...PROTOTYPE_FACE_DECK, ARCANE_ECHO_FACE],
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Echo/);
  });

  it("refuses Forbidden Heritage and Pestilent Plague on opening slots", () => {
    const heritage = validateStartingDice(
      [[FORBIDDEN_HERITAGE, martial, wild, arcane, luminar, SHIELD_FACE_ID], basics],
      [...PROTOTYPE_FACE_DECK, FORBIDDEN_HERITAGE],
      DEFAULT_RULES_CONFIG,
    );
    const plague = validateStartingDice(
      [[PESTILENT_PLAGUE, martial, wild, arcane, luminar, SHIELD_FACE_ID], basics],
      [...PROTOTYPE_FACE_DECK, PESTILENT_PLAGUE],
      DEFAULT_RULES_CONFIG,
    );
    expect(heritage.ok).toBe(false);
    expect(plague.ok).toBe(false);
    if (!heritage.ok) expect(heritage.reason).toMatch(/stay|lock/i);
    if (!plague.ok) expect(plague.reason).toMatch(/stay|lock/i);
  });

  it("refuses a named special that is not in the face deck", () => {
    const result = validateStartingDice(
      PROTOTYPE_STARTING_DICE,
      PROTOTYPE_FACE_DECK.filter((id) => id !== CRUSH),
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/crush/i);
  });
});

describe("leftoverFacePool", () => {
  it("removes installed Crush and Bloodscent from the pool and leaves unused specials", () => {
    const pool = leftoverFacePool(PROTOTYPE_FACE_DECK, PROTOTYPE_STARTING_DICE);
    expect(pool).not.toContain(CRUSH);
    expect(pool).not.toContain(BLOODSCENT);
    expect(pool).toContain(WARHORN);
    expect(pool).toContain(CLEAVING_STRIKE);
    expect(pool).toContain(GORE);
    expect(pool).toContain(PRIMORDIAL_FURY);
  });

  it("does not consume opening basics even when they are also listed in the face deck", () => {
    const martial = naturalFaceId("martial");
    const deck = [...PROTOTYPE_FACE_DECK.slice(0, 5), martial];
    const pool = leftoverFacePool(deck, PROTOTYPE_STARTING_DICE);
    expect(pool).toContain(martial);
  });

  it("burn leftover pool keeps Marrow Rot, Spores, and Wasting Brand", () => {
    const pool = leftoverFacePool(BURN_FACE_DECK, BURN_STARTING_DICE);
    expect(pool).not.toContain(SEEP);
    expect(pool).not.toContain(CINDER);
    expect(pool).toContain(MARROW_ROT);
    expect(pool).toContain(SPORES);
    expect(pool).toContain(WASTING_BRAND);
  });
});
