import { describe, expect, it } from "vitest";
import { ALL_CARDS, COG_DRAFT, getCard } from "../content/cards.js";
import {
  DAWN_WARDEN,
  LODESTAR_ARTIFICER,
  TORQUE_WRIGHT,
} from "../content/creatures.js";
import {
  COGTOOTH,
  ENGINE_TEST_FACE_DECK,
  GEAR_TRAIN,
  MAINSPRING,
  SHIELD_FACE_ID,
  naturalFaceId,
} from "../content/faces.js";
import {
  AGGRO_LOADOUT,
  ALL_BUILTIN_LOADOUTS,
  BURN_LOADOUT,
  COMBO_MECHANICAL_LOADOUT,
  CONTROL_DECK,
  CONTROL_LOADOUT,
  PROTOTYPE_DECK,
  TEMPO_DECK,
  TEMPO_FACE_DECK,
  TEMPO_LOADOUT,
  TEMPO_SQUAD,
  TEMPO_STARTING_DICE,
} from "../content/loadouts/index.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import { asCardId, type CardId } from "../model/ids.js";
import {
  leftoverFacePool,
  validateLoadout,
  validateStartingDice,
  validateTacticsDeck,
} from "./loadout.js";

/**
 * Generic reach: no header pile cost, so an off-pair attribute in a builtin is
 * forge paint rather than a splash the list has to fund.
 */
function isGenericReach(id: CardId): boolean {
  const cost = getCard(id)?.playCost ?? {};
  return Object.keys(cost).length === 0;
}

describe("validateTacticsDeck", () => {
  it("accepts the exact 40-card Tempo deck", () => {
    expect(TEMPO_DECK).toHaveLength(40);
    expect(validateTacticsDeck(TEMPO_DECK, DEFAULT_RULES_CONFIG)).toEqual({ ok: true });
  });

  it("keeps Tempo to Mechanical and Luminar apart from generic reach", () => {
    for (const id of TEMPO_DECK) {
      if (isGenericReach(id)) continue;
      expect(["mechanical", "luminar"], id).toContain(getCard(id)?.attribute);
    }
  });

  it("keeps unreconstructed builtin names as aliases of Tempo", () => {
    expect(AGGRO_LOADOUT).toBe(TEMPO_LOADOUT);
    expect(COMBO_MECHANICAL_LOADOUT).toBe(TEMPO_LOADOUT);
    expect(BURN_LOADOUT).toBe(TEMPO_LOADOUT);
    expect(PROTOTYPE_DECK).toBe(TEMPO_DECK);
    expect(ALL_BUILTIN_LOADOUTS).toEqual([TEMPO_LOADOUT, CONTROL_LOADOUT]);
  });

  it("accepts the exact 40-card Arcane and Darkness Control deck", () => {
    expect(CONTROL_DECK).toHaveLength(40);
    expect(validateTacticsDeck(CONTROL_DECK, DEFAULT_RULES_CONFIG)).toEqual({ ok: true });
    for (const id of CONTROL_DECK) {
      if (isGenericReach(id)) continue;
      expect(["arcane", "darkness"], id).toContain(getCard(id)?.attribute);
    }
  });

  it("refuses a deck below the minimum", () => {
    const result = validateTacticsDeck(
      TEMPO_DECK.slice(0, DEFAULT_RULES_CONFIG.deckMinCards - 1),
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/min 40/);
  });

  it("refuses a deck above the maximum", () => {
    const oversized = ALL_CARDS.flatMap((card) => [card.id, card.id, card.id]).slice(
      0,
      DEFAULT_RULES_CONFIG.deckMaxCards + 1,
    );
    expect(oversized).toHaveLength(51);
    const result = validateTacticsDeck(oversized, DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/max 50/);
  });

  it("refuses one copy over the per-id cap", () => {
    const withoutCogDraft = TEMPO_DECK.filter((id) => id !== COG_DRAFT);
    const over = [...withoutCogDraft, COG_DRAFT, COG_DRAFT, COG_DRAFT, COG_DRAFT];
    const result = validateTacticsDeck(over, DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/copies/);
  });

  it("refuses an unknown card id", () => {
    const deck = [...TEMPO_DECK, asCardId("card-not-real")];
    const result = validateTacticsDeck(deck, DEFAULT_RULES_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/unknown card/);
  });
});

describe("validateLoadout", () => {
  it("accepts the Tempo loadout", () => {
    expect(validateLoadout(TEMPO_LOADOUT, DEFAULT_RULES_CONFIG)).toEqual({ ok: true });
  });

  it("accepts the Control loadout", () => {
    expect(validateLoadout(CONTROL_LOADOUT, DEFAULT_RULES_CONFIG)).toEqual({ ok: true });
  });

  it("refuses a short squad", () => {
    const result = validateLoadout(
      { ...TEMPO_LOADOUT, squad: TEMPO_SQUAD.slice(0, 2) },
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/squad/);
  });

  it("refuses a squad with no legendary", () => {
    const result = validateLoadout(
      { ...TEMPO_LOADOUT, squad: [TORQUE_WRIGHT, DAWN_WARDEN, TORQUE_WRIGHT] },
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/legendary/);
  });

  it("refuses a squad with two legendaries", () => {
    const result = validateLoadout(
      { ...TEMPO_LOADOUT, squad: [LODESTAR_ARTIFICER, LODESTAR_ARTIFICER, TORQUE_WRIGHT] },
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/legendary/);
  });
});

describe("validateStartingDice", () => {
  const mechanical = naturalFaceId("mechanical");
  const luminar = naturalFaceId("luminar");

  it("refuses five faces of one attribute on a die", () => {
    const result = validateStartingDice(
      [
        [mechanical, mechanical, mechanical, mechanical, mechanical, SHIELD_FACE_ID],
        TEMPO_STARTING_DICE[1],
      ],
      TEMPO_FACE_DECK,
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/mechanical/);
  });

  it("refuses a die with no Shield", () => {
    const result = validateStartingDice(
      [
        [mechanical, mechanical, mechanical, luminar, luminar, luminar],
        TEMPO_STARTING_DICE[1],
      ],
      TEMPO_FACE_DECK,
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Shield/);
  });

  it("allows two opening synthetics when both are in the face deck", () => {
    const result = validateStartingDice(
      [
        [COGTOOTH, GEAR_TRAIN, mechanical, luminar, luminar, SHIELD_FACE_ID],
        TEMPO_STARTING_DICE[1],
      ],
      ENGINE_TEST_FACE_DECK,
      DEFAULT_RULES_CONFIG,
    );
    expect(result).toEqual({ ok: true });
  });

  it("refuses three on-roll faces on one die", () => {
    const result = validateStartingDice(
      [
        [COGTOOTH, GEAR_TRAIN, MAINSPRING, mechanical, luminar, SHIELD_FACE_ID],
        TEMPO_STARTING_DICE[1],
      ],
      ENGINE_TEST_FACE_DECK,
      {
        ...DEFAULT_RULES_CONFIG,
        startingMaxSyntheticsPerDie: 3,
        startingMaxSyntheticsPerPlayer: 3,
      },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/on-roll/);
  });

  it("refuses three synthetics under the default player cap", () => {
    const result = validateStartingDice(
      [
        [COGTOOTH, GEAR_TRAIN, mechanical, mechanical, luminar, SHIELD_FACE_ID],
        [MAINSPRING, mechanical, mechanical, luminar, luminar, SHIELD_FACE_ID],
      ],
      ENGINE_TEST_FACE_DECK,
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/synthetics/);
  });

  it("refuses a named special missing from the face deck", () => {
    const result = validateStartingDice(
      [
        [COGTOOTH, mechanical, mechanical, luminar, luminar, SHIELD_FACE_ID],
        TEMPO_STARTING_DICE[1],
      ],
      TEMPO_FACE_DECK.filter((id) => id !== COGTOOTH),
      DEFAULT_RULES_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/cogtooth/i);
  });
});

describe("leftoverFacePool", () => {
  const mechanical = naturalFaceId("mechanical");
  const luminar = naturalFaceId("luminar");

  it("removes installed specials and keeps uninstalled Tempo faces", () => {
    const startingDice = [
      [COGTOOTH, mechanical, mechanical, luminar, luminar, SHIELD_FACE_ID],
      TEMPO_STARTING_DICE[1],
    ] as const;
    const pool = leftoverFacePool(TEMPO_FACE_DECK, startingDice);
    expect(pool).not.toContain(COGTOOTH);
    expect(pool).toContain(GEAR_TRAIN);
    expect(pool).toContain(MAINSPRING);
  });

  it("does not consume opening basics even when listed in the face deck", () => {
    const pool = leftoverFacePool([...TEMPO_FACE_DECK, mechanical], TEMPO_STARTING_DICE);
    expect(pool).toContain(mechanical);
  });
});
