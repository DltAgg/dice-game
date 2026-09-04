import { describe, expect, it } from "vitest";
import { COG_DRAFT, GLINT_VEIL, LANTERN_OATH, MIRRORWARD } from "../content/cards.js";
import { TORQUE_WRIGHT, DAWN_WARDEN } from "../content/creatures.js";
import { equipmentOf, ritualsOf } from "../rules/cards.js";
import { advance } from "./reduce.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withPile,
  withHand,
  withPhase,
  withTokens,
} from "../testing/scenario.js";
import { CRANK, CRANK_FUEL, DRIVE_SHAFT, DRIVE_SHAFT_FUEL } from "../testing/tempoCatalogue.js";

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

describe("Tempo control effects", () => {
  it("Lantern Oath prevents and can draw on prevent", () => {
    const base = withPhase(newMatch(), "actions");
    const attacker = creatureIdAt(base, P1, 0);
    const target = creatureIdAt(base, P2, 0);
    const combat = withHand(withPile(withTokens(base, attacker, CRANK_FUEL), P2, 10), P2, [
      LANTERN_OATH,
    ]);
    const opened = expectOk(
      advance(combat, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: CRANK,
        targetId: target,
      }),
    );
    const judged = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(judged);
    expect(resolved.creatures[target]?.damage).toBe(0);
  });

  it("Mirrorward reflects prevented attack damage", () => {
    const base = withPhase(newMatch(), "actions");
    const attacker = creatureIdAt(base, P1, 2);
    const target = creatureIdAt(base, P2, 0);
    const combat = withHand(
      withPile(withTokens(base, attacker, DRIVE_SHAFT_FUEL), P2, 10),
      P2,
      [MIRRORWARD],
    );
    const opened = expectOk(
      advance(combat, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: DRIVE_SHAFT,
        targetId: target,
      }),
    );
    const judged = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(judged);
    expect(resolved.creatures[attacker]?.damage).toBeGreaterThan(0);
    expect(eventTypes(resolved)).toContain("damage-prevented");
  });

  it("Glint Veil rejects non-attack chain tops", () => {
    const ready = withHand(
      withPile(withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]), P1, 10),
      P2,
      [GLINT_VEIL],
    );
    const opened = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const denied = advance(opened, {
      type: "PLAY_CARD",
      playerId: P2,
      cardInstanceId: handCardIdAt(opened, P2, 0),
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error).toBe("INVALID_CHAIN_TARGET");
  });

  it("Tempo squad has no hidden ritual reactions in hand tests", () => {
    expect(ritualsOf(actionsReady([LANTERN_OATH]), P1)).toHaveLength(0);
    expect(equipmentOf(actionsReady([LANTERN_OATH]), P1)).toHaveLength(0);
  });

  it("creatures are Torque Wright and Dawn Warden at frontline indices", () => {
    const state = newMatch();
    expect(state.creatures[creatureIdAt(state, P1, 0)]?.definitionId).toBe(TORQUE_WRIGHT);
    expect(state.creatures[creatureIdAt(state, P1, 1)]?.definitionId).toBe(DAWN_WARDEN);
  });
});
