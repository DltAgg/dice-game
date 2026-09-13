import { describe, expect, it } from "vitest";
import { equipmentOf } from "../rules/cards.js";
import { testCard } from "../testing/fixtures/index.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withPile,
  withHand,
  withPhase,
  withSymbols,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const EQUIP = testCard({
  id: "card-test-equip-attach",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  type: "equipment",
  equipment: { mayTargetOpponent: false, abilities: [] },
});

const HEAL_ON_LUMINAR = testCard({
  id: "card-test-equip-heal-luminar",
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

const EMPOWER_ON_MECHANICAL = testCard({
  id: "card-test-equip-empower-mechanical",
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
        effects: [{ type: "next-attack-bonus", amount: 1 }],
      },
    ],
  },
});

const REDUCE_ON_HIT = testCard({
  id: "card-test-equip-reduce",
  playCost: { luminar: 2 },
  attribute: "luminar",
  type: "equipment",
  equipment: {
    mayTargetOpponent: false,
    abilities: [{ type: "on-take-damage", reduceBy: 1, oncePerTurn: true }],
  },
});

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

describe("equipment", () => {
  it("attaches to a creature", () => {
    const bearerId = creatureIdAt(actionsReady([EQUIP.id]), P1, 0);
    const after = expectOk(
      advance(actionsReady([EQUIP.id]), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(actionsReady([EQUIP.id]), P1, 0),
        declaredTargetCreatureId: bearerId,
      }),
    );
    expect(equipmentOf(after, P1)).toHaveLength(1);
  });

  it("heals on Luminar absorb", () => {
    const base = actionsReady([HEAL_ON_LUMINAR.id]);
    const bearerId = creatureIdAt(base, P1, 0);
    const wounded = {
      ...base,
      creatures: {
        ...base.creatures,
        [bearerId]: { ...base.creatures[bearerId]!, damage: 2 },
      },
    };
    const equipped = expectOk(
      advance(wounded, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(wounded, P1, 0),
        declaredTargetCreatureId: bearerId,
      }),
    );
    const withPool = withSymbols(withPhase(equipped, "actions"), P1, ["luminar"], "rolled");
    const luminar = Object.values(withPool.symbols).find((s) => s.symbol === "luminar");
    if (luminar === undefined) throw new Error("luminar");
    let after = expectOk(
      advance(withPool, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        symbolId: luminar.id,
      }),
    );
    if (after.pendingDecision?.type === "choose-creature") {
      after = expectOk(
        advance(after, {
          type: "RESOLVE_CHOOSE_CREATURE",
          playerId: P1,
          creatureId: bearerId,
        }),
      );
    }
    expect(after.log.some((entry) => entry.event.type === "creature-healed")).toBe(true);
    expect(after.creatures[bearerId]?.damage).toBe(1);
  });

  it("empowers when Mechanical is absorbed onto the bearer", () => {
    const base = actionsReady([EMPOWER_ON_MECHANICAL.id]);
    const bearerId = creatureIdAt(base, P1, 0);
    const equipped = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredTargetCreatureId: bearerId,
      }),
    );
    const withPool = withSymbols(withPhase(equipped, "actions"), P1, ["mechanical"], "rolled");
    const mech = Object.values(withPool.symbols).find((s) => s.symbol === "mechanical");
    if (mech === undefined) throw new Error("mechanical");
    const after = expectOk(
      advance(withPool, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: bearerId,
        symbolId: mech.id,
      }),
    );
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("reduce equipment attaches to the declared bearer", () => {
    const base = actionsReady([REDUCE_ON_HIT.id]);
    const bearerId = creatureIdAt(base, P1, 0);
    const equipped = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredTargetCreatureId: bearerId,
      }),
    );
    expect(equipmentOf(equipped, P1)[0]?.attachedToCreatureId).toBe(bearerId);
  });
});
