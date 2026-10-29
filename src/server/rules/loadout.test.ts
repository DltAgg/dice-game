import { describe, expect, it } from "vitest";
import { ALL_CARDS, AIR_LAUNCHER, BRACE, CRUSHING_THROW, COUNTER, OPEN_PALM, PARRY, SHIFT, getCard } from "../content/cards.js";
import { MAGNUS, RYU, VEGA } from "../content/creatures.js";
import {
  AGGRO_LOADOUT,
  ALL_BUILTIN_LOADOUTS,
  BURN_LOADOUT,
  COMBO_MECHANICAL_LOADOUT,
  CONTROL_LOADOUT,
  PROTOTYPE_DECK,
  TAG_SKIRMISH_LOADOUT,
  TEMPO_DECK,
  TEMPO_LOADOUT,
} from "../content/loadouts/index.js";
import { DEFAULT_RULES_CONFIG, TAG_FIGHTER_RULES } from "../model/config.js";
import type { DieFaceLayout } from "../model/dice.js";
import { asCardId } from "../model/ids.js";
import {
  leftoverFacePool,
  responseCombatCount,
  validateLoadout,
  validateStartingDice,
  validateTacticsDeck,
} from "./loadout.js";
import {
  TEST_FACE_DECK,
  TEST_SHIELD_FACE_ID,
  TEST_SYNTHETIC_MECHANICAL_A,
  TEST_SYNTHETIC_MECHANICAL_B,
  TEST_SYNTHETIC_MECHANICAL_C,
} from "../testing/fixtures/index.js";
import { testFace, testNaturalFaceId } from "../testing/fixtures/builders.js";

const mechanical = testNaturalFaceId("mechanical");
const luminar = testNaturalFaceId("luminar");

const identityDie = (
  a = mechanical,
  b = mechanical,
  c = mechanical,
  d = luminar,
  e = luminar,
  f = TEST_SHIELD_FACE_ID,
): DieFaceLayout => [a, b, c, d, e, f];

const identityPair = (): readonly [DieFaceLayout, DieFaceLayout] => [
  identityDie(),
  identityDie(mechanical, mechanical, luminar, luminar, luminar, TEST_SHIELD_FACE_ID),
];

describe("validateTacticsDeck", () => {
  it("accepts the Tag Skirmish tactics list under TAG_FIGHTER_RULES", () => {
    expect(TAG_SKIRMISH_LOADOUT.deck).toHaveLength(22);
    expect(responseCombatCount(TAG_SKIRMISH_LOADOUT.deck)).toBe(6);
    expect(validateTacticsDeck(TAG_SKIRMISH_LOADOUT.deck, TAG_FIGHTER_RULES)).toEqual({
      ok: true,
    });
  });

  it("aliases retired builtin names to Tag Skirmish", () => {
    expect(TEMPO_LOADOUT).toBe(TAG_SKIRMISH_LOADOUT);
    expect(CONTROL_LOADOUT).toBe(TAG_SKIRMISH_LOADOUT);
    expect(AGGRO_LOADOUT).toBe(TAG_SKIRMISH_LOADOUT);
    expect(COMBO_MECHANICAL_LOADOUT).toBe(TAG_SKIRMISH_LOADOUT);
    expect(BURN_LOADOUT).toBe(TAG_SKIRMISH_LOADOUT);
    expect(PROTOTYPE_DECK).toBe(TEMPO_DECK);
    expect(ALL_BUILTIN_LOADOUTS).toEqual([TAG_SKIRMISH_LOADOUT]);
  });

  it("refuses a deck below the minimum", () => {
    const result = validateTacticsDeck([OPEN_PALM], DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/min 40/);
  });

  it("refuses a deck above the maximum", () => {
    const oversized = Array.from(
      { length: DEFAULT_RULES_CONFIG.deckMaxCards + 1 },
      () => OPEN_PALM,
    );
    expect(oversized).toHaveLength(51);
    const result = validateTacticsDeck(oversized, DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/max 50/);
  });

  it("enforces an exact deck size when one is configured", () => {
    const exact = { ...DEFAULT_RULES_CONFIG, deckSize: 2 };
    expect(validateTacticsDeck([OPEN_PALM, OPEN_PALM], exact)).toEqual({ ok: true });
    const short = validateTacticsDeck([OPEN_PALM], exact);
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.reason).toMatch(/deck size 2/);
  });

  it("uses the configured copy cap", () => {
    const cap = { ...DEFAULT_RULES_CONFIG, deckMinCards: 0, deckMaxCopiesPerCard: 2 };
    expect(validateTacticsDeck([OPEN_PALM, OPEN_PALM], cap)).toEqual({ ok: true });
    const over = validateTacticsDeck([OPEN_PALM, OPEN_PALM, OPEN_PALM], cap);
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.reason).toMatch(/max 2/);
  });

  it("refuses one copy over the per-id cap", () => {
    const result = validateTacticsDeck(
      [OPEN_PALM, OPEN_PALM, OPEN_PALM, OPEN_PALM],
      { ...DEFAULT_RULES_CONFIG, deckMinCards: 0 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/copies/);
  });

  it("refuses an unknown card id", () => {
    const result = validateTacticsDeck(
      [OPEN_PALM, asCardId("card-not-real")],
      { ...DEFAULT_RULES_CONFIG, deckMinCards: 0 },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/unknown card/);
  });

  it("caps response combat cards under TAG_FIGHTER_RULES", () => {
    expect(TAG_FIGHTER_RULES.deckMaxResponseCombat).toBe(9);
    expect(DEFAULT_RULES_CONFIG.deckMaxResponseCombat).toBeNull();

    const three = (id: typeof PARRY) => [id, id, id];
    const nine = [...three(PARRY), ...three(BRACE), ...three(SHIFT)];
    expect(responseCombatCount(nine)).toBe(9);
    expect(validateTacticsDeck([...nine, OPEN_PALM], TAG_FIGHTER_RULES)).toEqual({ ok: true });
    expect(validateTacticsDeck([...nine, OPEN_PALM, OPEN_PALM], TAG_FIGHTER_RULES)).toEqual({
      ok: true,
    });

    const over = validateTacticsDeck([...nine, PARRY], TAG_FIGHTER_RULES);
    expect(over).toEqual({
      ok: false,
      reason: "tactics deck has 10 response combat cards, max 9",
    });

    const uncapped = { ...DEFAULT_RULES_CONFIG, deckMinCards: 0, deckMaxCopiesPerCard: 12 };
    expect(validateTacticsDeck(Array.from({ length: 10 }, () => PARRY), uncapped)).toEqual({
      ok: true,
    });
  });

  it("keeps Parry, Brace, and Shift playable as before, with subtype combat", () => {
    expect(getCard(PARRY)).toMatchObject({
      type: "response",
      subtypes: ["combat"],
      lifecycle: "one-shot",
      endsSequence: true,
      rulesText: "[Parry].",
      effect: {
        effects: [
          {
            type: "grant-attack-prevent",
            amount: 1,
            target: { kind: "chain-attack-target" },
          },
        ],
      },
    });
    expect(getCard(BRACE)).toMatchObject({
      type: "response",
      subtypes: ["combat"],
      lifecycle: "one-shot",
      rulesText: "[Block 2].",
      effect: {
        effects: [
          {
            type: "reduce-damage",
            amount: 2,
            target: { kind: "chain-attack-target" },
          },
        ],
      },
    });
    const shift = getCard(SHIFT);
    expect(shift).toMatchObject({
      type: "modify",
      subtypes: ["combat"],
      lifecycle: "one-shot",
      modifySubject: "target",
      rulesText: "Redirect that hit onto the Fighter you choose.",
    });
    expect(shift?.effect).toBeUndefined();

    const counter = getCard(COUNTER);
    expect(counter?.type).toBe("response");
    expect(counter?.subtypes).toEqual([]);
    expect(counter?.subtypes.includes("combat")).toBe(false);
  });

  it("includes every Tag Skirmish deck card in the catalogue", () => {
    const catalogueIds = new Set(ALL_CARDS.map((card) => card.id));
    for (const id of new Set(TAG_SKIRMISH_LOADOUT.deck)) {
      expect(catalogueIds.has(id)).toBe(true);
    }
  });

  it("caps EX cards per fighter restriction", () => {
    const exRules = { ...TAG_FIGHTER_RULES, deckMinCards: 0, deckMaxCopiesPerCard: 3 };

    expect(validateTacticsDeck([], exRules)).toEqual({ ok: true });
    expect(validateTacticsDeck([CRUSHING_THROW], exRules)).toEqual({ ok: true });
    expect(validateTacticsDeck([CRUSHING_THROW, CRUSHING_THROW], exRules)).toEqual({ ok: true });

    expect(
      validateTacticsDeck(
        [CRUSHING_THROW, CRUSHING_THROW, AIR_LAUNCHER, AIR_LAUNCHER],
        exRules,
      ),
    ).toEqual({ ok: true });

    const threeMagnus = validateTacticsDeck(
      [CRUSHING_THROW, CRUSHING_THROW, CRUSHING_THROW],
      exRules,
    );
    expect(threeMagnus.ok).toBe(false);
    if (!threeMagnus.ok) {
      expect(threeMagnus.reason).toMatch(/EX cards for "creature-magnus", max 2/);
      expect(threeMagnus.reason).not.toMatch(/copies of/);
      expect(threeMagnus.reason).not.toMatch(/response combat/);
    }

    expect(responseCombatCount([CRUSHING_THROW, AIR_LAUNCHER])).toBe(0);
  });

  it("allows an EX card in the deck when its Fighter is not in the squad", () => {
    const exRules = { ...TAG_FIGHTER_RULES, deckMinCards: 0 };
    expect(validateTacticsDeck([CRUSHING_THROW], exRules)).toEqual({ ok: true });
    expect(
      validateLoadout(
        {
          ...TAG_SKIRMISH_LOADOUT,
          squad: [VEGA, RYU, VEGA],
          deck: [...TAG_SKIRMISH_LOADOUT.deck, CRUSHING_THROW],
        },
        TAG_FIGHTER_RULES,
      ),
    ).toEqual({ ok: true });
  });
});

describe("validateLoadout", () => {
  it("accepts the Tag Skirmish loadout under TAG_FIGHTER_RULES", () => {
    expect(validateLoadout(TAG_SKIRMISH_LOADOUT, TAG_FIGHTER_RULES)).toEqual({ ok: true });
  });

  it("refuses a short squad", () => {
    const result = validateLoadout(
      { ...TAG_SKIRMISH_LOADOUT, squad: TAG_SKIRMISH_LOADOUT.squad.slice(0, 2) },
      TAG_FIGHTER_RULES,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/squad/);
  });

  it("accepts a squad with a repeated fighter", () => {
    expect(
      validateLoadout(
        { ...TAG_SKIRMISH_LOADOUT, squad: [VEGA, MAGNUS, VEGA] },
        TAG_FIGHTER_RULES,
      ),
    ).toEqual({ ok: true });
  });

  it("accepts two copies of the same fighter plus a third", () => {
    expect(
      validateLoadout(
        { ...TAG_SKIRMISH_LOADOUT, squad: [RYU, RYU, MAGNUS] },
        TAG_FIGHTER_RULES,
      ),
    ).toEqual({ ok: true });
  });
});

describe("validateStartingDice", () => {
  it("allows five copies of one blank face on a die", () => {
    const result = validateStartingDice(
      [identityDie(mechanical, mechanical, mechanical, mechanical, mechanical, TEST_SHIELD_FACE_ID), identityPair()[1]!],
      [],
      DEFAULT_RULES_CONFIG,
    );
    expect(result).toEqual({ ok: true });
  });

  it("allows a die with no Shield under the default min of 0", () => {
    const result = validateStartingDice(
      [
        identityDie(mechanical, mechanical, mechanical, luminar, luminar, luminar),
        identityPair()[1]!,
      ],
      [],
      DEFAULT_RULES_CONFIG,
    );
    expect(result).toEqual({ ok: true });
  });

  it("allows a die with no Shield", () => {
    const result = validateStartingDice(
      [
        identityDie(mechanical, mechanical, mechanical, luminar, luminar, luminar),
        identityPair()[1]!,
      ],
      [],
      { ...DEFAULT_RULES_CONFIG, startingMinShieldsPerDie: 1 },
    );
    expect(result).toEqual({ ok: true });
  });

  it("allows two opening synthetics when both are in the face deck", () => {
    const result = validateStartingDice(
      [
        identityDie(TEST_SYNTHETIC_MECHANICAL_A, TEST_SYNTHETIC_MECHANICAL_B, mechanical, luminar, luminar, TEST_SHIELD_FACE_ID),
        identityPair()[1]!,
      ],
      TEST_FACE_DECK,
      DEFAULT_RULES_CONFIG,
    );
    expect(result).toEqual({ ok: true });
  });

  it("refuses three on-roll faces on one die", () => {
    const rollA = testFace({
      id: "face-test-onroll-a",
      rulesText: "On roll: draw.",
      onRoll: [{ type: "draw-cards", amount: 1 }],
    }).id;
    const rollB = testFace({
      id: "face-test-onroll-b",
      rulesText: "On roll: draw.",
      onRoll: [{ type: "draw-cards", amount: 1 }],
    }).id;
    const rollC = testFace({
      id: "face-test-onroll-c",
      rulesText: "On roll: draw.",
      onRoll: [{ type: "draw-cards", amount: 1 }],
    }).id;
    const result = validateStartingDice(
      [
        identityDie(rollA, rollB, rollC, mechanical, luminar, TEST_SHIELD_FACE_ID),
        identityPair()[1]!,
      ],
      [rollA, rollB, rollC],
      {
        ...DEFAULT_RULES_CONFIG,
        startingMaxSyntheticsPerDie: 3,
        startingMaxSyntheticsPerPlayer: 3,
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/on-roll/);
  });

  it("allows named faces on both dice when each id is in the face deck", () => {
    const result = validateStartingDice(
      [
        identityDie(TEST_SYNTHETIC_MECHANICAL_A, TEST_SYNTHETIC_MECHANICAL_B, mechanical, mechanical, luminar, TEST_SHIELD_FACE_ID),
        identityDie(TEST_SYNTHETIC_MECHANICAL_C, mechanical, mechanical, luminar, luminar, TEST_SHIELD_FACE_ID),
      ],
      TEST_FACE_DECK,
      DEFAULT_RULES_CONFIG,
    );
    expect(result).toEqual({ ok: true });
  });

  it("refuses a named special missing from the face deck", () => {
    const result = validateStartingDice(
      [
        identityDie(TEST_SYNTHETIC_MECHANICAL_A, mechanical, mechanical, luminar, luminar, TEST_SHIELD_FACE_ID),
        identityPair()[1]!,
      ],
      TEST_FACE_DECK.filter((id) => id !== TEST_SYNTHETIC_MECHANICAL_A),
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/synthetic-mechanical-a/i);
  });
});

describe("leftoverFacePool", () => {
  it("removes installed specials and keeps uninstalled pool faces", () => {
    const startingDice = [
      identityDie(TEST_SYNTHETIC_MECHANICAL_A, mechanical, mechanical, luminar, luminar, TEST_SHIELD_FACE_ID),
      identityPair()[1]!,
    ] as const;
    const pool = leftoverFacePool(TEST_FACE_DECK, startingDice);
    expect(pool).not.toContain(TEST_SYNTHETIC_MECHANICAL_A);
    expect(pool).toContain(TEST_SYNTHETIC_MECHANICAL_B);
    expect(pool).toContain(TEST_SYNTHETIC_MECHANICAL_C);
  });

  it("does not consume opening basics even when listed in the face deck", () => {
    const pool = leftoverFacePool([...TEST_FACE_DECK, mechanical], identityPair());
    expect(pool).toContain(mechanical);
  });
});
