import { describe, expect, it } from "vitest";
import { getCard } from "../content/cards.js";
import type { DieState } from "../model/dice.js";
import { asSymbolInstanceId, type CreatureId, type DieId, type FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { whileShowingTotals } from "../rules/whileShowing.js";
import {
  TEST_BODY_A,
  TEST_LEGEND,
  TEST_SQUAD,
  TEST_SYNTHETIC_MECHANICAL_A,
  testAttack,
  testCard,
  testCreature,
  testFace,
} from "../testing/fixtures/index.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withDamage,
  withPile,
  withHand,
  withPhase,
  withTokens,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";
import { CRANK, DRIVE_SHAFT } from "../testing/tempoCatalogue.js";

const HEAL_ON_LUMINAR = testCard({
  id: "card-test-trigger-heal-luminar",
  playCost: { luminar: 2, any: 1 },
  attribute: "luminar",
  type: "equipment",
  equipment: {
    mayTargetOpponent: false,
    abilities: [
      {
        type: "on-absorb",
        symbols: ["luminar", "shield"],
        absorberRelation: "ally",
        oncePerTurn: true,
        effects: [{ type: "heal", amount: 1, target: { kind: "source-creature" } }],
      },
    ],
  },
});

const GENERATE_ON_MECHANICAL = testCard({
  id: "card-test-trigger-generate-mechanical",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  type: "equipment",
  equipment: {
    mayTargetOpponent: false,
    abilities: [
      {
        type: "on-absorb",
        symbols: ["mechanical"],
        absorberRelation: "ally",
        oncePerTurn: true,
        effects: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
      },
    ],
  },
});

const FORGE_DISCOUNT_ON_ROLL = testCard({
  id: "card-test-trigger-forge-discount-roll",
  playCost: { mechanical: 2, any: 1 },
  attribute: "mechanical",
  type: "equipment",
  equipment: {
    mayTargetOpponent: false,
    abilities: [
      {
        type: "on-roll-symbol",
        symbol: "mechanical",
        rollingPlayer: "controller",
        effects: [{ type: "arm-forge-discount", amount: 1 }],
      },
    ],
  },
});

const GENERATE_OVERLOAD = testCard({
  id: "card-test-trigger-overload-generate",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  type: "overload",
  overload: {
    faceSymbols: ["mechanical"],
    onRoll: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
  },
});

const DESYNTH_OVERLOAD = testCard({
  id: "card-test-trigger-overload-desynth",
  playCost: { mechanical: 2, any: 1 },
  attribute: "mechanical",
  type: "overload",
  overload: {
    faceSymbols: ["mechanical"],
    faceKinds: ["synthetic"],
    onRoll: [{ type: "desynthesize", target: { kind: "choose-any-synthetic-slot" } }],
  },
});

const REDUCE_GEAR = testCard({
  id: "card-test-trigger-reduce",
  playCost: { luminar: 2 },
  attribute: "luminar",
  type: "equipment",
  equipment: {
    mayTargetOpponent: false,
    abilities: [{ type: "on-take-damage", reduceBy: 1, oncePerTurn: true }],
  },
});

const STANDING_RITUAL = testCard({
  id: "card-test-trigger-standing-ritual",
  playCost: { mechanical: 1, any: 1 },
  attribute: "mechanical",
  type: "ritual",
  subtypes: ["continuous"],
  ritual: {
    spend: { mechanical: 1, any: 1 },
    effects: [{ type: "reapply-die-modifiers" }],
    standingAbilities: [
      {
        type: "on-roll-symbol",
        symbol: "martial",
        rollingPlayer: "controller",
        effects: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
      },
    ],
  },
});

const EMPTY_STANDING_RITUAL = testCard({
  id: "card-test-trigger-empty-standing",
  playCost: { luminar: 1, any: 1 },
  attribute: "luminar",
  type: "ritual",
  subtypes: ["continuous"],
  ritual: {
    spend: { luminar: 2, any: 1 },
    effects: [
      {
        type: "silence",
        hosts: ["creature", "ritual"],
        target: { kind: "choose-opponent-silence-host", hosts: ["creature", "ritual"] },
      },
    ],
  },
});

const TWO_PIP = testFace({
  id: "face-test-trigger-two-pip",
  kind: "synthetic",
  symbol: "mechanical",
  pips: { mechanical: 2 },
});

const FORGE_DISCOUNT_STANCE = testFace({
  id: "face-test-trigger-forge-discount-stance",
  kind: "synthetic",
  symbol: "mechanical",
  pips: { mechanical: 2 },
  whileShowing: [{ type: "forge-discount", amount: 1 }],
});

const DUAL_PIP = testFace({
  id: "face-test-trigger-dual-pip",
  kind: "synthetic",
  symbol: "luminar",
  pips: { luminar: 1, mechanical: 1 },
});

const DOUBLE_LUMINAR = testFace({
  id: "face-test-trigger-double-luminar",
  kind: "synthetic",
  symbol: "luminar",
  pips: { luminar: 2 },
});

const DOUBLE_MECHANICAL = testFace({
  id: "face-test-trigger-double-mechanical",
  kind: "synthetic",
  symbol: "mechanical",
  pips: { mechanical: 2 },
});

const FORGE_DISCOUNT_BODY = testCreature({
  id: "creature-test-trigger-forge-discount",
  attributes: ["mechanical"],
  standingAbilities: [
    {
      type: "on-absorb",
      symbols: ["mechanical"],
      absorberRelation: "ally",
      oncePerTurn: true,
      effects: [{ type: "arm-forge-discount", amount: 1 }],
    },
  ],
});

const SHIELD_ON_LUMINAR = testCreature({
  id: "creature-test-trigger-shield-luminar",
  attributes: ["luminar"],
  standingAbilities: [
    {
      type: "on-absorb",
      symbols: ["luminar"],
      absorberRelation: "ally",
      oncePerTurn: true,
      effects: [{ type: "grant-shield", amount: 1, target: { kind: "choose-ally" } }],
    },
  ],
});

const EMPOWER_ON_MECHANICAL = testCreature({
  id: "creature-test-trigger-empower",
  life: 22,
  attributes: ["mechanical", "luminar"],
  legendary: true,
  standingAbilities: [
    {
      type: "on-absorb",
      symbols: ["mechanical"],
      absorberRelation: "ally",
      oncePerTurn: true,
      effects: [{ type: "grant-next-attack-bonus", amount: 1, target: { kind: "source-creature" } }],
    },
  ],
  attacks: [
    testAttack({
      id: "attack-test-trigger-drive",
      discards: { mechanical: 1, luminar: 1, any: 1 },
      effect: { type: "damage", amount: 3, target: { kind: "declared-target" } },
    }),
  ],
});

const HEAL_KINDLE = testAttack({
  id: "attack-test-trigger-heal-kindle",
  discards: { luminar: 2 },
  followUpEffects: [{ type: "heal", amount: 1, target: { kind: "choose-ally" } }],
});
const HEALER = testCreature({
  id: "creature-test-trigger-healer",
  attributes: ["luminar"],
  attacks: [HEAL_KINDLE],
});

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

function dieIdOf(state: GameState, playerId = P1, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("expected a die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("expected die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function equip(state: GameState, creatureId: CreatureId): GameState {
  return expectOk(
    advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
      declaredTargetCreatureId: creatureId,
    }),
  );
}

function installFace(state: GameState, faceCardId: FaceCardId, slot = 0): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((s, index) =>
    index === slot ? { ...s, faceCardId, faceCardOwnerId: P1 } : s,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function rollShowingSlot(state: GameState, slot: number): GameState {
  let rolled: GameState = withPhase(state, "roll");
  rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: slot });
  rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 4 });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
}

describe("on-absorb equipment", () => {
  it("heals the equipped host when Luminar is absorbed", () => {
    const base = actionsReady([HEAL_ON_LUMINAR.id]);
    const hostId = creatureIdAt(base, P1, 0);
    let state = withDamage(equip(base, hostId), hostId, 2);
    state = withPhase(state, "actions");
    const symbolId = asSymbolInstanceId("sym-luminar");
    state = {
      ...state,
      symbols: {
        ...state.symbols,
        [symbolId]: {
          id: symbolId,
          ownerId: P1,
          symbol: "luminar",
          status: "rolled",
          sourceDieId: null,
          absorbedByCreatureId: null,
        },
      },
    };

    const afterAbsorb = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        symbolId,
      }),
    );
    let after = afterAbsorb;
    if (after.pendingDecision?.type === "choose-creature") {
      after = expectOk(
        advance(after, {
          type: "RESOLVE_CHOOSE_CREATURE",
          playerId: P1,
          creatureId: hostId,
        }),
      );
    }

    expect(after.creatures[hostId]?.damage).toBe(1);
  });

  it("generates Mechanical when Mechanical is absorbed", () => {
    const base = actionsReady([GENERATE_ON_MECHANICAL.id]);
    const hostId = creatureIdAt(base, P1, 0);
    let state = equip(base, hostId);
    state = withPhase(state, "actions");
    const symbolId = asSymbolInstanceId("sym-mechanical");
    state = {
      ...state,
      symbols: {
        ...state.symbols,
        [symbolId]: {
          id: symbolId,
          ownerId: P1,
          symbol: "mechanical",
          status: "rolled",
          sourceDieId: null,
          absorbedByCreatureId: null,
        },
      },
    };

    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        symbolId,
      }),
    );

    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });
});

describe("on-roll-symbol equipment", () => {
  it("arms forge discount when Mechanical is rolled", () => {
    const base = actionsReady([FORGE_DISCOUNT_ON_ROLL.id]);
    const hostId = creatureIdAt(base, P1, 0);
    const equipped = equip(base, hostId);
    const dieId = dieIdOf(equipped);
    const die = equipped.dice[dieId];
    if (die === undefined) throw new Error("die");
    const slots = die.slots.map((slot, index) =>
      index === 0
        ? { ...slot, faceCardId: TEST_SYNTHETIC_MECHANICAL_A, faceCardOwnerId: P1 }
        : slot,
    );
    let rolled: GameState = {
      ...equipped,
      phase: "roll",
      dice: { ...equipped.dice, [dieId]: { ...die, slots } },
    };
    rolled = withDie(rolled, dieId, { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 4 });

    const after = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
    expect(after.forgeDiscountThisTurn[P1]).toBeGreaterThanOrEqual(1);
  });
});

describe("on-absorb overloads", () => {
  it("On roll still banks synthetic pips plus overload generate", () => {
    const base = actionsReady([GENERATE_OVERLOAD.id]);
    const attached = expectOk(
      advance(installFace(base, TWO_PIP.id), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: TWO_PIP.id,
      }),
    );
    const after = rollShowingSlot(attached, 0);
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("Desynthesize On roll does not arm a play discount", () => {
    const base = actionsReady([DESYNTH_OVERLOAD.id]);
    const attached = expectOk(
      advance(installFace(base, TEST_SYNTHETIC_MECHANICAL_A), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: TEST_SYNTHETIC_MECHANICAL_A,
      }),
    );
    const after = rollShowingSlot(attached, 0);
    expect(after.playCostDiscountThisTurn[P1] ?? 0).toBe(0);
  });

  it("While showing is a forge-discount stance, not a this-turn arm from the face", () => {
    const after = rollShowingSlot(installFace(newMatch(), FORGE_DISCOUNT_STANCE.id), 0);
    expect(whileShowingTotals(after, P1).forgeDiscount).toBe(1);
  });
});

describe("on-roll / on-absorb faces", () => {
  it("generates Mechanical on a 2-pip synthetic roll", () => {
    const after = rollShowingSlot(installFace(newMatch(), TWO_PIP.id), 0);
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBe(2);
  });

  it("a dual-pip face banks 1 Luminar and 1 Mechanical from the same die", () => {
    const after = rollShowingSlot(installFace(newMatch(), DUAL_PIP.id), 0);
    expect(after.players[P1]?.attributePool.luminar ?? 0).toBe(1);
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBe(1);
  });

  it("a 2-pip Luminar face banks 2 Luminar on roll", () => {
    const after = rollShowingSlot(installFace(newMatch(), DOUBLE_LUMINAR.id), 0);
    expect(after.players[P1]?.attributePool.luminar ?? 0).toBe(2);
  });

  it("a 2-pip Mechanical face banks 2 Mechanical on roll", () => {
    const after = rollShowingSlot(installFace(newMatch(), DOUBLE_MECHANICAL.id), 0);
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBe(2);
  });
});

describe("on-take-damage reduce", () => {
  it("reduces the first hit by 1 once per turn", () => {
    const base = actionsReady([REDUCE_GEAR.id]);
    const bearerId = creatureIdAt(base, P1, 0);
    const attackerId = creatureIdAt(base, P2, 0);
    let state = equip(base, bearerId);
    state = {
      ...state,
      activePlayerId: P2,
      phase: "actions",
    };
    state = withTokens(state, attackerId, { mechanical: 1, martial: 1 });

    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P2,
        attackerId,
        attackId: CRANK,
        targetId: bearerId,
      }),
    );
    expect(after.creatures[bearerId]?.damage).toBe(1);
  });
});

describe("continuous ritual triggers", () => {
  it("generates Mechanical on roll while a standing ritual is active", () => {
    const ready = actionsReady([STANDING_RITUAL.id]);
    const placed = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const after = rollShowingSlot(placed, 0);
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("a continuous ritual may have no standing On absorb", () => {
    expect(getCard(EMPTY_STANDING_RITUAL.id)?.ritual?.standingAbilities ?? []).toEqual([]);
  });
});

describe("creature standing triggers", () => {
  it("grants forge discount when an ally absorbs Mechanical", () => {
    const state = newMatch({
      players: [
        { id: P1, squad: [FORGE_DISCOUNT_BODY.id, TEST_BODY_A, TEST_LEGEND], deck: [] },
        { id: P2, squad: TEST_SQUAD, deck: [] },
      ],
    });
    const allyId = creatureIdAt(state, P1, 1);
    let ready = withPhase(state, "actions");
    const symbolId = asSymbolInstanceId("sym-mechanical-creature");
    ready = {
      ...ready,
      symbols: {
        ...ready.symbols,
        [symbolId]: {
          id: symbolId,
          ownerId: P1,
          symbol: "mechanical",
          status: "rolled",
          sourceDieId: null,
          absorbedByCreatureId: null,
        },
      },
    };
    const after = expectOk(
      advance(ready, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: allyId,
        symbolId,
      }),
    );
    expect(after.forgeDiscountThisTurn[P1]).toBeGreaterThanOrEqual(1);
  });

  it("opens a Shield target when the controller banks Luminar", () => {
    const match = newMatch({
      players: [
        { id: P1, squad: [TEST_BODY_A, SHIELD_ON_LUMINAR.id, TEST_LEGEND], deck: [] },
        { id: P2, squad: TEST_SQUAD, deck: [] },
      ],
    });
    const woundedId = creatureIdAt(match, P1, 0);
    let ready = withDamage(withPhase(match, "actions"), woundedId, 2);
    const symbolId = asSymbolInstanceId("sym-luminar-creature");
    ready = {
      ...ready,
      symbols: {
        ...ready.symbols,
        [symbolId]: {
          id: symbolId,
          ownerId: P1,
          symbol: "luminar",
          status: "rolled",
          sourceDieId: null,
          absorbedByCreatureId: null,
        },
      },
    };
    const after = expectOk(
      advance(ready, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(ready, P1, 1),
        symbolId,
      }),
    );
    expect(
      after.pendingDecision?.type === "choose-creature" ||
        Object.values(after.creatures).some((creature) => (creature.shields ?? 0) >= 1),
    ).toBe(true);
  });

  it("empowers the legendary when an ally absorbs Mechanical", () => {
    const match = newMatch({
      players: [
        { id: P1, squad: [TEST_BODY_A, TEST_BODY_A, EMPOWER_ON_MECHANICAL.id], deck: [] },
        { id: P2, squad: TEST_SQUAD, deck: [] },
      ],
    });
    const legendaryId = creatureIdAt(match, P1, 2);
    let ready = withPhase(match, "actions");
    const symbolId = asSymbolInstanceId("sym-mechanical-legendary");
    ready = {
      ...ready,
      symbols: {
        ...ready.symbols,
        [symbolId]: {
          id: symbolId,
          ownerId: P1,
          symbol: "mechanical",
          status: "rolled",
          sourceDieId: null,
          absorbedByCreatureId: null,
        },
      },
    };
    const after = expectOk(
      advance(ready, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        symbolId,
      }),
    );
    expect(after.creatures[legendaryId]?.nextAttackBonus).toBe(1);
  });
});

describe("on-attack follow-ups", () => {
  it("heals the most damaged ally after a heal follow-up strike", () => {
    const match = newMatch({
      players: [
        { id: P1, squad: [TEST_BODY_A, HEALER.id, TEST_LEGEND], deck: [] },
        { id: P2, squad: TEST_SQUAD, deck: [] },
      ],
    });
    const woundedId = creatureIdAt(match, P1, 1);
    let state = withDamage(withPhase(match, "actions"), woundedId, 2);
    const attackerId = creatureIdAt(state, P1, 1);
    state = withTokens(state, attackerId, { luminar: 2 });
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: HEAL_KINDLE.id,
        targetId: creatureIdAt(state, P2, 0),
      }),
    );
    expect(
      after.creatures[woundedId]?.damage === 1 || after.pendingDecision?.type === "choose-creature",
    ).toBe(true);
  });

  it("deals Drive Shaft damage from the legendary body", () => {
    let state = withPhase(newMatch(), "actions");
    const attackerId = creatureIdAt(state, P1, 2);
    const targetId = creatureIdAt(state, P2, 0);
    state = withTokens(state, attackerId, { mechanical: 1, luminar: 1, martial: 1 });
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: DRIVE_SHAFT,
        targetId,
      }),
    );
    expect(after.creatures[targetId]?.damage).toBe(3);
  });
});
