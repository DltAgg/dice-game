import { describe, expect, it } from "vitest";
import {
  BEACON_ARRAY,
  DRIVESHAFT_RIG,
  IDLER_GEAR,
  MACHINE_SHOP,
  PAWL_SPRING,
  PRISM_MANTLE,
  QUICKSET_JIG,
  RADIANT_ACCORD,
} from "../content/cards.js";
import { TEMPO_SQUAD } from "../content/creatures.js";
import {
  COGTOOTH,
  ENGINE_TEST_FACE_DECK,
  GEAR_TRAIN,
  HALO_LAMP,
  SUNWARD_LENS,
} from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import { asAttackId, asSymbolInstanceId, type CreatureId, type DieId, type FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { usableSymbols } from "../rules/symbols.js";
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
  it("heals the most damaged ally when Beacon Array absorbs Luminar", () => {
    const base = actionsReady([BEACON_ARRAY]);
    const hostId = creatureIdAt(base, P1, 0);
    const woundedId = creatureIdAt(base, P1, 1);
    let state = withDamage(equip(base, hostId), woundedId, 2);
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

    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: hostId,
        symbolId,
      }),
    );

    expect(after.creatures[woundedId]?.damage).toBe(1);
  });

  it("generates Mechanical when Drive Shaft Rig absorbs Mechanical", () => {
    const base = actionsReady([DRIVESHAFT_RIG]);
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
        creatureId: hostId,
        symbolId,
      }),
    );

    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });
});

describe("on-roll-symbol equipment", () => {
  it("arms forge discount when Quickset Jig sees a Mechanical roll", () => {
    const base = actionsReady([QUICKSET_JIG]);
    const hostId = creatureIdAt(base, P1, 0);
    const equipped = equip(base, hostId);
    const dieId = dieIdOf(equipped);
    const die = equipped.dice[dieId];
    if (die === undefined) throw new Error("die");
    const slots = die.slots.map((slot, index) =>
      index === 0
        ? { ...slot, faceCardId: COGTOOTH, faceCardOwnerId: P1 }
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
  it("generates Mechanical when Idler Gear's face is rolled", () => {
    const base = actionsReady([IDLER_GEAR]);
    const attached = expectOk(
      advance(installFace(base, COGTOOTH), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: COGTOOTH,
      }),
    );
    const after = rollShowingSlot(attached, 0);
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("arms forge discount when Pawl Spring's face is absorbed", () => {
    const base = actionsReady([PAWL_SPRING]);
    const attached = expectOk(
      advance(installFace(base, COGTOOTH), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: COGTOOTH,
      }),
    );
    const after = rollShowingSlot(attached, 0);
    expect(after.forgeDiscountThisTurn[P1]).toBeGreaterThanOrEqual(1);
  });
});

describe("on-roll / on-absorb faces", () => {
  it("generates Mechanical on Cogtooth roll", () => {
    const after = rollShowingSlot(installFace(newMatch(), COGTOOTH), 0);
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("heals on Sunward Lens roll and generates Mechanical on absorb", () => {
    const healTarget = creatureIdAt(newMatch(), P1, 0);
    const state = withDamage(installFace(newMatch(), SUNWARD_LENS), healTarget, 2);
    const after = rollShowingSlot(state, 0);
    expect(after.creatures[healTarget]?.damage).toBe(1);
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("generates Shield on Halo Lamp roll", () => {
    const after = rollShowingSlot(installFace(newMatch(), HALO_LAMP), 0);
    expect(usableSymbols(after, P1).some((entry) => entry.symbol === "shield")).toBe(true);
  });

  it("generates Mechanical when Gear Train rolls with another synthetic in pool", () => {
    let state = installFace(newMatch(), GEAR_TRAIN);
    state = {
      ...state,
      players: {
        ...state.players,
        [P1]: {
          ...state.players[P1]!,
          facePool: [...ENGINE_TEST_FACE_DECK],
        },
      },
    };
    const after = rollShowingSlot(state, 0);
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });
});

describe("on-take-damage reduce", () => {
  it("reduces the first hit by 1 once per turn with Prism Mantle", () => {
    const base = actionsReady([PRISM_MANTLE]);
    const bearerId = creatureIdAt(base, P1, 0);
    const attackerId = creatureIdAt(base, P2, 0);
    let state = equip(base, bearerId);
    state = {
      ...state,
      activePlayerId: P2,
      phase: "actions",
    };
    state = withTokens(state, attackerId, { mechanical: 1 });

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
  it("generates Mechanical on roll while Machine Shop is active", () => {
    const ready = actionsReady([MACHINE_SHOP]);
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

  it("marks Shield on most-damaged ally when Radiant Accord absorbs Luminar", () => {
    const ready = actionsReady([RADIANT_ACCORD]);
    const woundedId = creatureIdAt(ready, P1, 1);
    const placed = expectOk(
      advance(withDamage(ready, woundedId, 2), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const ritualId = Object.values(placed.cards).find(
      (card) => card.cardId === RADIANT_ACCORD && card.zone === "ritual",
    )?.id;
    if (ritualId === undefined) throw new Error("ritual");
    let active = {
      ...placed,
      cards: {
        ...placed.cards,
        [ritualId]: { ...placed.cards[ritualId]!, ritualOrientation: "ready" as const },
      },
    };
    active = withPhase(active, "actions");
    const symbolId = asSymbolInstanceId("sym-luminar-ritual");
    active = {
      ...active,
      symbols: {
        ...active.symbols,
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
      advance(active, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        symbolId,
      }),
    );
    expect(after.creatures[woundedId]?.shields ?? 0).toBeGreaterThanOrEqual(1);
  });
});

describe("creature standing triggers", () => {
  it("grants forge discount when Torque Wright's ally absorbs Mechanical", () => {
    const state = newMatch({
      players: [
        { id: P1, squad: TEMPO_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
        { id: P2, squad: TEMPO_SQUAD, deck: [], faceDeck: ENGINE_TEST_FACE_DECK },
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

  it("marks Shield on most-damaged ally when Dawn Warden's ally absorbs Luminar", () => {
    const woundedId = creatureIdAt(newMatch(), P1, 0);
    let ready = withDamage(withPhase(newMatch(), "actions"), woundedId, 2);
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
    expect(after.creatures[woundedId]?.shields).toBe(1);
  });

  it("empowers Lodestar Artificer when an ally absorbs Mechanical", () => {
    const legendaryId = creatureIdAt(newMatch(), P1, 2);
    let ready = withPhase(newMatch(), "actions");
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
  it("heals the most damaged ally after Dawn Warden Kindle", () => {
    const woundedId = creatureIdAt(newMatch(), P1, 1);
    let state = withDamage(withPhase(newMatch(), "actions"), woundedId, 2);
    const attackerId = creatureIdAt(state, P1, 1);
    state = withTokens(state, attackerId, { luminar: 1 });
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: asAttackId("attack-dawn-warden-kindle"),
        targetId: creatureIdAt(state, P2, 0),
      }),
    );
    expect(after.creatures[woundedId]?.damage).toBe(1);
  });

  it("deals Drive Shaft damage from the legendary body", () => {
    const state = withTokens(withPhase(newMatch(), "actions"), creatureIdAt(newMatch(), P1, 2), {
      mechanical: 1,
    });
    const attackerId = creatureIdAt(state, P1, 2);
    const targetId = creatureIdAt(state, P2, 0);
    const fueled = withTokens(state, attackerId, { mechanical: 1 });
    const after = expectOk(
      advance(fueled, {
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
