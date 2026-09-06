import { describe, expect, it } from "vitest";
import { getCard } from "../content/cards.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import type { DieState } from "../model/dice.js";
import type { DieId, FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { canAffordForge } from "../rules/cards.js";
import {
  countsTowardOpeningOnRollCap,
  isOpeningBasicFace,
  validateStartingDice,
} from "../rules/loadout.js";
import { sumWhileShowingModifiers, whileShowingTotals } from "../rules/whileShowing.js";
import {
  TEST_FACE_DECK,
  TEST_OVERCHARGE_ARCANE,
  TEST_PLAYABLE,
  TEST_SHIELD_FACE_ID,
  TEST_STARTING_DICE,
  TEST_SYNTHETIC_MECHANICAL_A,
  testCard,
  testFace,
  testNaturalFaceId,
} from "../testing/fixtures/index.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  overchargeAction,
  P1,
  P2,
  withAttributePool,
  withHand,
  withPhase,
  withPile,
  withShields,
  withTokens,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";
import { DRIVE_SHAFT } from "../testing/tempoCatalogue.js";
import { evaluateCondition } from "./conditions.js";
import { createDraft } from "./draft.js";

const SHIELD_SLOT = 4;
const MARTIAL = testNaturalFaceId("martial");
const MECHANICAL = testNaturalFaceId("mechanical");

const TWO_PIP_MECHANICAL = testFace({
  id: "face-test-physics-two-pip",
  kind: "synthetic",
  symbol: "mechanical",
  pips: { mechanical: 2 },
  whileShowing: [{ type: "forge-discount", amount: 1 }],
});

const DUAL_PIP_NATURAL = testFace({
  id: "face-test-physics-dual-natural",
  name: "Named Dual",
  kind: "natural",
  symbol: "mechanical",
  rulesText: "On roll: this face also produces 1 Luminar.",
  pips: { mechanical: 1, luminar: 1 },
});

const CONVERT_STRIKE = testFace({
  id: "face-test-physics-convert",
  kind: "synthetic",
  symbol: "arcane",
  convertRoll: true,
  pips: { arcane: 2 },
  onRoll: [{ type: "damage", amount: 2, target: { kind: "choose-enemy" } }],
});

const PIERCE_STANCE = testFace({
  id: "face-test-physics-pierce",
  kind: "synthetic",
  symbol: "luminar",
  pips: { luminar: 2 },
  whileShowing: [{ type: "pierce", amount: 1 }],
});

const DOUBLE_GEOMETRY = testFace({
  id: "face-test-physics-double",
  kind: "synthetic",
  symbol: "mechanical",
  pips: { mechanical: 2 },
  onRoll: [
    {
      type: "conditional",
      when: { type: "other-die-same-attribute" },
      then: [{ type: "arm-resolve-next-face-effect-twice" }],
    },
  ],
});

const STAMP = testCard({
  id: "card-test-physics-stamp",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  effect: { effects: [{ type: "reapply-die-modifiers" }] },
});

function dieIdOf(state: GameState, index = 0): DieId {
  const id = state.players[P1]?.dieIds[index];
  if (id === undefined) throw new Error("expected a die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("expected die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function installFace(
  state: GameState,
  faceCardId: FaceCardId,
  dieIndex = 0,
  slot = 0,
): GameState {
  const dieId = dieIdOf(state, dieIndex);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((candidate, index) =>
    index === slot ? { ...candidate, faceCardId, faceCardOwnerId: P1 } : candidate,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function rollShowingSlots(state: GameState, slot0: number, slot1 = SHIELD_SLOT): GameState {
  let rolled = withPhase(state, "roll");
  rolled = withDie(rolled, dieIdOf(rolled, 0), { retained: true, rolledSlotIndex: slot0 });
  rolled = withDie(rolled, dieIdOf(rolled, 1), { retained: true, rolledSlotIndex: slot1 });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
}

function poolOf(state: GameState, attribute: "mechanical" | "luminar" | "arcane" | "martial"): number {
  return state.players[P1]?.attributePool[attribute] ?? 0;
}

describe("inherent extra pips", () => {
  it("identity natural still banks 1 pip", () => {
    const after = rollShowingSlots(newMatch(), 0);
    expect(poolOf(after, "martial")).toBe(1);
  });

  it("a 2-pip synthetic banks 2 Mechanical with no generate-symbol opcode", () => {
    const after = rollShowingSlots(installFace(newMatch(), TWO_PIP_MECHANICAL.id), 0);
    expect(poolOf(after, "mechanical")).toBe(2);
    expect(
      after.log.some(
        (entry) =>
          entry.event.type === "effect-resolved" &&
          "effectType" in entry.event &&
          entry.event.effectType === "generate-symbol",
      ),
    ).toBe(false);
  });

  it("a dual-pip natural banks 1 Mechanical + 1 Luminar from the same die", () => {
    const after = rollShowingSlots(installFace(newMatch(), DUAL_PIP_NATURAL.id), 0);
    const dieId = dieIdOf(after);
    expect(poolOf(after, "mechanical")).toBe(1);
    expect(poolOf(after, "luminar")).toBe(1);
    const fromDie = Object.values(after.symbols).filter((symbol) => symbol.sourceDieId === dieId);
    expect(fromDie.some((symbol) => symbol.symbol === "mechanical")).toBe(true);
    expect(fromDie.some((symbol) => symbol.symbol === "luminar")).toBe(true);
  });
});

describe("convert Choose one", () => {
  it("opens Choose one; payoff forfeits Arcane, queues Strike 2; other die still banks", () => {
    let state = installFace(newMatch(), CONVERT_STRIKE.id, 0, 0);
    state = installFace(state, MARTIAL, 1, 0);
    const afterRoll = rollShowingSlots(state, 0, 0);
    expect(afterRoll.pendingDecision?.type).toBe("choose-effect-mode");
    expect(afterRoll.pendingDecision).toMatchObject({
      modeLabels: ["Bank this die's pips", "Strike 2"],
    });
    expect(poolOf(afterRoll, "arcane")).toBe(0);
    expect(poolOf(afterRoll, "martial")).toBe(1);
    const afterPick = expectOk(
      advance(afterRoll, {
        type: "RESOLVE_CHOOSE_EFFECT_MODE",
        playerId: P1,
        modeIndex: 1,
      }),
    );
    expect(afterPick.pendingDecision?.type).toBe("choose-creature");
    const enemy = creatureIdAt(afterPick, P2, 0);
    const resolved = expectOk(
      advance(afterPick, { type: "RESOLVE_CHOOSE_CREATURE", playerId: P1, creatureId: enemy }),
    );
    expect(resolved.creatures[enemy]?.damage).toBe(2);
    expect(poolOf(resolved, "arcane")).toBe(0);
  });

  it("bank mode banks Arcane and does not Strike", () => {
    let state = installFace(newMatch(), CONVERT_STRIKE.id, 0, 0);
    state = installFace(state, MARTIAL, 1, 0);
    const afterRoll = rollShowingSlots(state, 0, 0);
    const afterPick = expectOk(
      advance(afterRoll, {
        type: "RESOLVE_CHOOSE_EFFECT_MODE",
        playerId: P1,
        modeIndex: 0,
      }),
    );
    expect(afterPick.pendingDecision).toBeNull();
    expect(poolOf(afterPick, "arcane")).toBe(2);
    expect(poolOf(afterPick, "martial")).toBe(1);
  });

  it("Overcharge attributes on a convert payoff do not bank", () => {
    let state = installFace(
      withHand(withPhase(newMatch(), "actions"), P1, [TEST_OVERCHARGE_ARCANE]),
      CONVERT_STRIKE.id,
    );
    state = expectOk(advance(state, overchargeAction(P1, handCardIdAt(state, P1, 0), CONVERT_STRIKE.id)));
    state = installFace(state, MARTIAL, 1, 0);
    const afterRoll = rollShowingSlots(state, 0, 0);
    const after = expectOk(
      advance(afterRoll, {
        type: "RESOLVE_CHOOSE_EFFECT_MODE",
        playerId: P1,
        modeIndex: 1,
      }),
    );
    expect(poolOf(after, "arcane")).toBe(0);
  });

  it("forge yield on a convert payoff does not bank", () => {
    let state = installFace(newMatch(), CONVERT_STRIKE.id);
    const dieId = dieIdOf(state);
    const die = state.dice[dieId]!;
    const slots = die.slots.map((slot, index) =>
      index === 0 ? { ...slot, forgeYield: true as const } : slot,
    );
    state = { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
    state = installFace(state, MARTIAL, 1, 0);
    const afterRoll = rollShowingSlots(state, 0, 0);
    const after = expectOk(
      advance(afterRoll, {
        type: "RESOLVE_CHOOSE_EFFECT_MODE",
        playerId: P1,
        modeIndex: 1,
      }),
    );
    expect(poolOf(after, "arcane")).toBe(0);
  });

  it("silenced convert does not fire Strike; pips still generate and bank", () => {
    let state = installFace(newMatch(), CONVERT_STRIKE.id);
    const dieId = dieIdOf(state);
    const die = state.dice[dieId]!;
    const slots = die.slots.map((slot, index) =>
      index === 0 ? { ...slot, silenceExpiresOnTurn: 99 } : slot,
    );
    state = { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
    const after = rollShowingSlots(state, 0);
    expect(after.pendingDecision).toBeNull();
    expect(poolOf(after, "arcane")).toBe(2);
  });
});

describe("While showing", () => {
  it("sums pierce / empower / discounts / reduce", () => {
    expect(
      sumWhileShowingModifiers([
        { type: "pierce", amount: 1 },
        { type: "empower", amount: 2 },
        { type: "play-discount", amount: 1 },
        { type: "forge-discount", amount: 1 },
        { type: "reduce", amount: 1 },
        { type: "pierce", amount: 1 },
      ]),
    ).toEqual({
      pierce: 2,
      empower: 2,
      playDiscount: 1,
      forgeDiscount: 1,
      reduce: 1,
    });
  });

  it("pierce 1 while showing; gone after the die shows Shield", () => {
    let rolled = rollShowingSlots(installFace(newMatch(), PIERCE_STANCE.id), 0);
    if (rolled.pendingDecision?.type === "choose-creature") {
      rolled = expectOk(
        advance(rolled, {
          type: "RESOLVE_CHOOSE_CREATURE",
          playerId: P1,
          creatureId: creatureIdAt(rolled, P1, 0),
        }),
      );
    }
    expect(whileShowingTotals(rolled, P1).pierce).toBe(1);
    expect(poolOf(rolled, "luminar")).toBe(2);

    const attackerId = creatureIdAt(rolled, P1, 2);
    const targetId = creatureIdAt(rolled, P2, 0);
    const armed = withTokens(withShields(withPhase(rolled, "actions"), targetId, 1), attackerId, {
      mechanical: 1,
      luminar: 1,
      martial: 1,
    });
    const hit = expectOk(
      advance(armed, { type: "ATTACK", playerId: P1, attackerId, attackId: DRIVE_SHAFT, targetId }),
    );
    expect(hit.creatures[targetId]?.damage).toBe(3);
    expect(hit.creatures[targetId]?.shields).toBe(1);

    const off = withDie(hit, dieIdOf(hit), { rolledSlotIndex: SHIELD_SLOT });
    expect(whileShowingTotals(off, P1).pierce).toBe(0);
  });

  it("while showing makes the next synthetic forge cheaper by 1", () => {
    const rolled = rollShowingSlots(installFace(newMatch(), TWO_PIP_MECHANICAL.id), 0);
    expect(whileShowingTotals(rolled, P1).forgeDiscount).toBe(1);
    const definition = getCard(TEST_PLAYABLE);
    if (definition === undefined) throw new Error("playable");
    const showing = {
      ...withAttributePool(rolled, P1, { mechanical: 1 }),
      forgeDiscountThisTurn: {},
    };
    expect(canAffordForge(showing, P1, definition)).toBe(true);
    const off = {
      ...withAttributePool(
        withDie(rolled, dieIdOf(rolled), { rolledSlotIndex: SHIELD_SLOT }),
        P1,
        { mechanical: 1 },
      ),
      forgeDiscountThisTurn: {},
    };
    expect(whileShowingTotals(off, P1).forgeDiscount).toBe(0);
    expect(canAffordForge(off, P1, definition)).toBe(false);
  });
});

describe("dice geometry", () => {
  it("Double arms when the other die shows the same attribute", () => {
    let state = installFace(newMatch(), DOUBLE_GEOMETRY.id, 0, 0);
    state = installFace(state, MECHANICAL, 1, 0);
    const after = rollShowingSlots(state, 0, 0);
    expect(after.resolveNextFaceEffectTwice[P1]).toBe(true);
  });

  it("Double does not arm when the other die shows a different attribute", () => {
    let state = installFace(newMatch(), DOUBLE_GEOMETRY.id, 0, 0);
    state = installFace(state, MARTIAL, 1, 0);
    const after = rollShowingSlots(state, 0, 0);
    expect(after.resolveNextFaceEffectTwice[P1]).toBeUndefined();
  });

  it("this-die-attribute-count and both-showing-synthetic on the helper", () => {
    let state = installFace(newMatch(), DOUBLE_GEOMETRY.id, 0, 0);
    state = installFace(state, MECHANICAL, 0, 1);
    state = installFace(state, MECHANICAL, 0, 2);
    state = installFace(state, TEST_SYNTHETIC_MECHANICAL_A, 1, 0);
    const die0 = dieIdOf(state, 0);
    const die1 = dieIdOf(state, 1);
    state = withDie(state, die0, { rolledSlotIndex: 0 });
    state = withDie(state, die1, { rolledSlotIndex: 0 });
    const draft = createDraft(state);
    const ctx = { controllerId: P1, sourceCreatureId: null, sourceDieId: die0 };
    expect(
      evaluateCondition(draft, ctx, { type: "this-die-attribute-count", atLeast: 3 }),
    ).toBe(true);
    expect(
      evaluateCondition(draft, ctx, { type: "this-die-attribute-count", atLeast: 4 }),
    ).toBe(false);
    expect(evaluateCondition(draft, ctx, { type: "both-showing-synthetic" })).toBe(true);
    expect(evaluateCondition(draft, ctx, { type: "other-die-same-attribute" })).toBe(true);

    const off = withDie(state, die1, { rolledSlotIndex: SHIELD_SLOT });
    const offDraft = createDraft(off);
    expect(evaluateCondition(offDraft, ctx, { type: "both-showing-synthetic" })).toBe(false);
    expect(evaluateCondition(offDraft, ctx, { type: "other-die-same-attribute" })).toBe(false);
  });
});

describe("Stamp vs inherent pips", () => {
  it("Stamp does not mint a second copy of inherent pips", () => {
    const base = installFace(
      withPile(withHand(withPhase(newMatch(), "actions"), P1, [STAMP.id]), P1, 10),
      TWO_PIP_MECHANICAL.id,
    );
    let rolled = withPhase(base, "roll");
    rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, 1), { retained: true, rolledSlotIndex: SHIELD_SLOT });
    rolled = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
    const dieId = dieIdOf(rolled);
    const mechAfterRoll = poolOf(rolled, "mechanical");
    const rolledFromDie = Object.values(rolled.symbols).filter(
      (symbol) => symbol.sourceDieId === dieId,
    ).length;

    const punched = expectOk(
      advance(rolled, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(rolled, P1, 0),
      }),
    );
    const stamped = expectOk(
      advance(punched, { type: "RESOLVE_CHOOSE_DIE", playerId: P1, dieId }),
    );
    expect(poolOf(stamped, "mechanical")).toBe(mechAfterRoll - 2);
    expect(
      Object.values(stamped.symbols).filter((symbol) => symbol.sourceDieId === dieId).length,
    ).toBe(rolledFromDie);
  });
});

describe("opening cap and basics", () => {
  it("counts whileShowing and convertRoll toward the on-roll cap; extra pips alone do not", () => {
    expect(countsTowardOpeningOnRollCap(TWO_PIP_MECHANICAL.id)).toBe(true);
    expect(countsTowardOpeningOnRollCap(PIERCE_STANCE.id)).toBe(true);
    expect(countsTowardOpeningOnRollCap(CONVERT_STRIKE.id)).toBe(true);
    expect(countsTowardOpeningOnRollCap(DUAL_PIP_NATURAL.id)).toBe(false);
    expect(countsTowardOpeningOnRollCap(MECHANICAL)).toBe(false);
  });

  it("a named natural with rules text is not an opening basic", () => {
    expect(isOpeningBasicFace(DUAL_PIP_NATURAL.id)).toBe(false);
    expect(isOpeningBasicFace(MECHANICAL)).toBe(true);
    expect(isOpeningBasicFace(TEST_SHIELD_FACE_ID)).toBe(true);
    const missing = validateStartingDice(
      [
        [DUAL_PIP_NATURAL.id, MECHANICAL, MARTIAL, testNaturalFaceId("luminar"), testNaturalFaceId("luminar"), TEST_SHIELD_FACE_ID],
        TEST_STARTING_DICE[1],
      ],
      TEST_FACE_DECK,
      DEFAULT_RULES_CONFIG,
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toMatch(/not in the face deck/);
  });
});
