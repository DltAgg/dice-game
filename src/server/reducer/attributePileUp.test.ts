import { describe, expect, it } from "vitest";
import { getCreatureDefinition } from "../content/creatures.js";
import { whileShowingTotals } from "../rules/whileShowing.js";
import type { DieState } from "../model/dice.js";
import type { DieId, FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { ritualsOf } from "../rules/cards.js";
import { usableSymbols } from "../rules/symbols.js";
import { createDraft } from "./draft.js";
import { createSymbol, drainResolution } from "./resolution.js";
import {
  TEST_CRANK,
  TEST_RETOOL,
  testCard,
  testFace,
  testNaturalFaceId,
} from "../testing/fixtures/index.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withAttributePool,
  withPile,
  withHand,
  withPhase,
  withSymbols,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const EMPOWER_STANCE = testFace({
  id: "face-test-pile-empower",
  kind: "synthetic",
  symbol: "luminar",
  pips: { luminar: 2 },
  whileShowing: [{ type: "empower", amount: 1 }],
});

const READY_RITUAL = testCard({
  id: "card-test-pile-ready-ritual",
  playCost: { mechanical: 1, any: 1 },
  attribute: "mechanical",
  type: "ritual",
  subtypes: ["continuous"],
  ritual: {
    spend: { mechanical: 1, any: 1 },
    effects: [{ type: "reapply-die-modifiers" }],
  },
});

const SPEND_RITUAL = testCard({
  id: "card-test-pile-spend-ritual",
  playCost: { luminar: 3 },
  attribute: "luminar",
  type: "ritual",
  subtypes: ["continuous"],
  ritual: {
    spend: { luminar: 3 },
    effects: [
      { type: "heal", amount: 2, target: { kind: "choose-ally" } },
      { type: "heal", amount: 2, target: { kind: "choose-ally" } },
    ],
  },
});

function dieIdOf(state: GameState): DieId {
  const id = state.players[P1]?.dieIds[0];
  if (id === undefined) throw new Error("die");
  return id;
}

function installFace(state: GameState, faceCardId: FaceCardId): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId] as DieState;
  const slots = die.slots.map((slot, index) =>
    index === 0 ? { ...slot, faceCardId, faceCardOwnerId: P1 } : slot,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

describe("016 attribute pile-up", () => {
  it("auto-banks usable rolled attributes after ROLL_DICE", () => {
    let state = withPhase(newMatch(), "roll");
    const dieId = dieIdOf(state);
    state = installFace(state, testNaturalFaceId("martial"));
    state = {
      ...state,
      dice: {
        ...state.dice,
        [dieId]: {
          ...state.dice[dieId]!,
          retained: true,
          rolledSlotIndex: 0,
        },
      },
    };
    for (const id of state.players[P1]!.dieIds) {
      if (id === dieId) continue;
      const die = state.dice[id]!;
      state = {
        ...state,
        dice: {
          ...state.dice,
          [id]: { ...die, retained: true, rolledSlotIndex: die.rolledSlotIndex ?? 0 },
        },
      };
    }
    const after = expectOk(advance(state, { type: "ROLL_DICE", playerId: P1 }));
    expect(after.phase).toBe("actions");
    expect(after.players[P1]?.attributePool.martial ?? 0).toBeGreaterThanOrEqual(1);
    expect(
      usableSymbols(after, P1).filter((s) => s.symbol === "martial" && s.status === "rolled"),
    ).toHaveLength(0);
  });

  it("auto-banks effect-generated attributes into the pile", () => {
    const state = withPhase(newMatch(), "actions");
    const draft = createDraft(state);
    createSymbol(draft, P1, "martial", "available", "effect");
    drainResolution(draft);
    expect(draft.players[P1]?.attributePool.martial).toBe(1);
    expect(usableSymbols(draft, P1).filter((s) => s.symbol === "martial")).toHaveLength(0);
  });

  it("banks absorb into the pile immediately", () => {
    const state = withSymbols(withPhase(newMatch(), "actions"), P1, ["martial"]);
    const pip = Object.values(state.symbols)[0]!;
    const after = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: pip.id }),
    );
    expect(after.players[P1]?.attributePool).toEqual({ martial: 1 });
    expect(after.log.some((e) => e.event.type === "attribute-token-gained")).toBe(true);
  });

  it("a 2-pip Empower stance banks 2 Luminar with no face On absorb", () => {
    let state = installFace(withPhase(newMatch(), "roll"), EMPOWER_STANCE.id);
    const dieId = dieIdOf(state);
    const otherId = state.players[P1]?.dieIds[1];
    if (otherId === undefined) throw new Error("other die");
    state = {
      ...state,
      dice: {
        ...state.dice,
        [dieId]: { ...state.dice[dieId]!, retained: true, rolledSlotIndex: 0 },
        [otherId]: { ...state.dice[otherId]!, retained: true, rolledSlotIndex: 4 },
      },
    };
    const after = expectOk(advance(state, { type: "ROLL_DICE", playerId: P1 }));
    expect(after.players[P1]?.attributePool.luminar ?? 0).toBe(2);
    expect(whileShowingTotals(after, P1).empower).toBe(1);
  });

  it("attack requires/discards from owner pile; same-turn bank→attack OK", () => {
    let state = withPhase(newMatch(), "actions");
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);
    const def = getCreatureDefinition(state.creatures[attackerId]!.definitionId)!;
    const attack = def.attacks.find((a) => a.id === TEST_CRANK)!;
    state = withAttributePool(state, P1, { mechanical: 1, luminar: 1 });
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: attack.id,
        targetId,
      }),
    );
    expect(after.log.some((e) => e.event.type === "attack-declared")).toBe(true);
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBe(0);
    expect(after.players[P1]?.attributePool.luminar ?? 0).toBe(0);
  });

  it("ritual without Active-when is ready on place", () => {
    let state = withAttributePool(withHand(withPhase(newMatch(), "actions"), P1, [READY_RITUAL.id]), P1, {
      mechanical: 3,
    });
    state = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    const ritualId = ritualsOf(state, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("ritual");
    expect(state.cards[ritualId]?.ritualOrientation).toBe("ready");
  });

  it("Shield absorb still grants on creature", () => {
    const state = withSymbols(withPhase(newMatch(), "actions"), P1, ["shield"]);
    const pip = Object.values(state.symbols)[0]!;
    const creatureId = creatureIdAt(state, P1, 0);
    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId,
        symbolId: pip.id,
      }),
    );
    expect(after.creatures[creatureId]?.shields).toBe(1);
    expect(after.players[P1]?.attributePool).toEqual({});
  });

  it("Requires spends from the attribute pile", () => {
    let state = withAttributePool(withPhase(newMatch(), "actions"), P1, { martial: 1 });
    expect(state.players[P1]?.attributePool.martial).toBe(1);
    state = withSymbols(state, P1, ["wild"]);
    const pip = Object.values(state.symbols)[0]!;
    state = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: pip.id }),
    );
    expect(usableSymbols(state, P1).some((s) => s.id === pip.id)).toBe(false);
    expect(state.players[P1]?.attributePool).toEqual({ martial: 1, wild: 1 });
  });

  it("EOT: pile persists; unabsorbed symbols expire", () => {
    let state = withSymbols(withPhase(newMatch(), "actions"), P1, ["martial", "wild"]);
    const martial = Object.values(state.symbols).find((s) => s.symbol === "martial")!;
    state = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: martial.id }),
    );
    state = expectOk(advance(state, { type: "END_TURN", playerId: P1 }));
    expect(state.players[P1]?.attributePool).toEqual({ martial: 1 });
    expect(Object.keys(state.symbols)).toHaveLength(0);
  });

  it("attribute bank ignores creatureId for On absorb routing", () => {
    const state = withSymbols(withPhase(newMatch(), "actions"), P1, ["martial"]);
    const pip = Object.values(state.symbols)[0]!;
    const creatureId = creatureIdAt(state, P1, 0);
    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId,
        symbolId: pip.id,
      }),
    );
    const absorbed = after.log.find((e) => e.event.type === "symbol-absorbed");
    expect(absorbed?.event).toMatchObject({
      type: "symbol-absorbed",
      creatureId: null,
    });
    expect(after.players[P1]?.attributePool).toEqual({ martial: 1 });
  });

  it("Resonance wildcards cover attack Requires gate and Spend discards", () => {
    let state = withPhase(newMatch(), "actions");
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);
    const def = getCreatureDefinition(state.creatures[attackerId]!.definitionId)!;
    const attack = def.attacks.find((a) => a.id === TEST_RETOOL)!;
    state = withAttributePool(state, P1, { mechanical: 2 });
    state = {
      ...state,
      requirementWildcardsThisTurn: { [P1]: [{ fromSymbol: "arcane" }] },
    };
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: attack.id,
        targetId,
      }),
    );
    expect(after.log.some((e) => e.event.type === "attack-declared")).toBe(true);
    expect(after.players[P1]?.attributePool).toEqual({});
    expect(after.requirementWildcardsThisTurn[P1] ?? []).toHaveLength(0);
  });

  it("ritual stays ready after pile spend once Active-when was unlocked", () => {
    let state = withAttributePool(withHand(withPhase(newMatch(), "actions"), P1, [READY_RITUAL.id]), P1, {
      mechanical: 3,
    });
    state = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    const ritualId = ritualsOf(state, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("ritual");

    state = withAttributePool(state, P1, { mechanical: 2 });
    state = withSymbols(state, P1, ["mechanical"]);
    const pip = Object.values(state.symbols)[0]!;
    state = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: pip.id }),
    );
    expect(state.cards[ritualId]?.ritualOrientation).toBe("ready");

    state = withAttributePool(state, P1, {});
    expect(state.cards[ritualId]?.ritualOrientation).toBe("ready");
  });

  it("Resonance wildcards cover ritual Spend on activate", () => {
    let state = withHand(withPile(withPhase(newMatch(), "actions"), P1, 10), P1, [
      SPEND_RITUAL.id,
    ]);
    state = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    const ritualId = ritualsOf(state, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("ritual");

    state = withAttributePool(state, P1, { luminar: 1 });
    state = {
      ...state,
      requirementWildcardsThisTurn: {
        [P1]: [{}, {}, {}],
      },
    };
    state = withSymbols(state, P1, ["martial"]);
    const pip = Object.values(state.symbols)[0]!;
    state = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: pip.id }),
    );
    expect(state.cards[ritualId]?.ritualOrientation).toBe("ready");

    const beforeWild = (state.requirementWildcardsThisTurn[P1] ?? []).length;
    state = expectOk(
      advance(state, {
        type: "ACTIVATE_RITUAL",
        playerId: P1,
        cardInstanceId: ritualId,
      }),
    );
    expect(state.log.some((e) => e.event.type === "ritual-activated")).toBe(true);
    expect((state.requirementWildcardsThisTurn[P1] ?? []).length).toBe(beforeWild - 2);
    expect(state.players[P1]?.attributePool.luminar ?? 0).toBe(0);
  });
});
