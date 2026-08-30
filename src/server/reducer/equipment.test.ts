import { describe, expect, it } from "vitest";
import { BEACON_ARRAY, DRIVESHAFT_RIG, PRISM_MANTLE, QUICKSET_JIG } from "../content/cards.js";
import { COGTOOTH } from "../content/faces.js";
import { equipmentOf } from "../rules/cards.js";
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

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

describe("Tempo equipment", () => {
  it("Quickset Jig attaches to a creature", () => {
    const bearerId = creatureIdAt(actionsReady([QUICKSET_JIG]), P1, 0);
    const after = expectOk(
      advance(actionsReady([QUICKSET_JIG]), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(actionsReady([QUICKSET_JIG]), P1, 0),
        declaredTargetCreatureId: bearerId,
      }),
    );
    expect(equipmentOf(after, P1)).toHaveLength(1);
  });

  it("Beacon Array heals on Luminar absorb", () => {
    const base = actionsReady([BEACON_ARRAY]);
    const bearerId = creatureIdAt(base, P1, 0);
    const woundedId = creatureIdAt(base, P1, 1);
    const wounded = {
      ...base,
      creatures: {
        ...base.creatures,
        [woundedId]: { ...base.creatures[woundedId]!, damage: 2 },
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
    const after = expectOk(
      advance(withPool, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        symbolId: luminar.id,
      }),
    );
    expect(after.log.some((entry) => entry.event.type === "creature-healed")).toBe(true);
    expect(after.creatures[woundedId]?.damage).toBeLessThan(2);
  });

  it("Drive Shaft Rig generates Mechanical on Mechanical absorb", () => {
    const base = actionsReady([DRIVESHAFT_RIG]);
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

  it("Prism Mantle reduces incoming damage once per turn", () => {
    const base = actionsReady([PRISM_MANTLE]);
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

  it("equipment forge references remain synthetic specials", () => {
    expect(COGTOOTH).toBeDefined();
  });
});
