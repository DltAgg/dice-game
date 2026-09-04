import { describe, expect, it } from "vitest";
import { COG_DRAFT, GLINT_VEIL, QUICKSET_JIG } from "../content/cards.js";
import { equipmentOf, graveyardOf } from "../rules/cards.js";
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
  withActivePlayer,
  withPile,
  withHand,
  withPhase,
  withTokens,
} from "../testing/scenario.js";
import { CRANK, CRANK_FUEL, DRIVE_SHAFT, DRIVE_SHAFT_FUEL } from "../testing/tempoCatalogue.js";

const actionsReady = (cards: Parameters<typeof withHand>[2], energy = 10) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

describe("reaction chain (008)", () => {
  it("opens a window on instant play and resolves after both Pass", () => {
    const state = actionsReady([COG_DRAFT]);
    const opened = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );

    expect(opened.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P2,
    });
    expect(opened.chainStack).toHaveLength(1);
    expect(graveyardOf(opened, P1)).toHaveLength(1);

    const resolved = resolveOpenChain(opened);
    expect(resolved.pendingDecision).toBeNull();
    expect(resolved.chainStack).toHaveLength(0);
    expect(eventTypes(resolved)).toContain("chain-link-resolved");
  });

  it("rejects Glint Veil when the top link is not an attack", () => {
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
    if (denied.ok) return;
    expect(denied.error).toBe("INVALID_CHAIN_TARGET");
  });

  it("rejects prevent reactions when the top link is an attack without a legal target", () => {
    const base = withPhase(newMatch(), "actions");
    const attacker = creatureIdAt(base, P1, 2);
    const target = creatureIdAt(base, P2, 0);
    const combat = withHand(
      withPile(withTokens(base, attacker, DRIVE_SHAFT_FUEL), P2, 10),
      P2,
      [GLINT_VEIL],
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
    expect(opened.chainStack[0]?.kind).toBe("attack");
    expect(opened.pendingDecision?.type).toBe("reaction-priority");

    const resolved = resolveOpenChain(opened);
    expect(eventTypes(resolved)).toContain("damage-dealt");
  });

  it("P1's turn continues after an empty reaction chain resolves", () => {
    const state = withPile(
      withHand(withPhase(withActivePlayer(newMatch(), P1), "actions"), P1, [COG_DRAFT]),
      P1,
      10,
    );
    const opened = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    const resolved = resolveOpenChain(opened);
    expect(resolved.activePlayerId).toBe(P1);
    expect(eventTypes(resolved)).not.toContain("turn-ended");
  });

  it("lets P2 pass and respond after a JSON round-trip of the window", () => {
    const state = withPile(
      withHand(
        withPile(withHand(withPhase(newMatch(), "actions"), P1, [COG_DRAFT]), P1, 10),
        P2,
        [GLINT_VEIL],
      ),
      P2,
      10,
    );
    const opened = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    const cloned = JSON.parse(JSON.stringify(opened)) as typeof opened;
    expect(cloned.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P2,
    });

    const afterP2Pass = expectOk(
      advance(cloned, { type: "PASS_PRIORITY", playerId: P2 }),
    );
    expect(afterP2Pass.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P1,
      consecutivePasses: 1,
    });
  });

  it("opens a window on equipment play", () => {
    const state = withPile(
      withHand(withPhase(newMatch(), "actions"), P1, [QUICKSET_JIG]),
      P1,
      10,
    );
    const opened = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
        declaredTargetCreatureId: creatureIdAt(state, P1, 0),
      }),
    );
    expect(opened.pendingDecision?.type).toBe("reaction-priority");
    expect(equipmentOf(opened, P1)).toHaveLength(0);
    const resolved = resolveOpenChain(opened);
    expect(equipmentOf(resolved, P1)).toHaveLength(1);
  });

  it("lets Glint Veil prevent during an attack window", () => {
    const base = withPhase(newMatch(), "actions");
    const attacker = creatureIdAt(base, P1, 0);
    const target = creatureIdAt(base, P2, 0);
    const combat = withHand(
      withPile(withTokens(base, attacker, CRANK_FUEL), P2, 10),
      P2,
      [GLINT_VEIL],
    );
    const opened = expectOk(
      advance(combat, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: CRANK,
        targetId: target,
      }),
    );
    const prevented = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(prevented);
    expect(resolved.creatures[target]?.damage).toBe(0);
  });
});
