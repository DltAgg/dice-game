import { describe, expect, it, vi } from "vitest";
import { advance } from "@server";
import { asTestCardId, testCard } from "@server/testing/fixtures/index.js";
import {
  creatureIdAt,
  expectOk,
  newMatch,
  P1,
  P2,
  withAttributePool,
  withPile,
  withHand,
  withPhase,
  withTokens,
} from "@server/testing/scenario.js";
import { autoPassPriorityAction, drainEmptyReactionPriority, tryAutoPassPriority } from "./autoPassPriority.js";
import { DRIVE_SHAFT, DRIVE_SHAFT_FUEL } from "@server/testing/tempoCatalogue.js";

const PREVENT_REACTION = testCard({
  id: asTestCardId("auto-pass-prevent"),
  type: "reaction",
  attribute: "luminar",
  playCost: { luminar: 1 },
  forge: { faces: 1, kind: "synthetic", attribute: "luminar", target: "own-die" },
  effect: {
    effects: [
      { type: "grant-attack-prevent", amount: 1, target: { kind: "chain-attack-target" } },
    ],
  },
});

function openedAttack(
  hand: Parameters<typeof withHand>[2],
  p2Pool?: Parameters<typeof withAttributePool>[2],
) {
  const base = withPhase(newMatch(), "actions");
  const attacker = creatureIdAt(base, P1, 2);
  const target = creatureIdAt(base, P2, 0);
  const fueled = withTokens(base, attacker, DRIVE_SHAFT_FUEL);
  const withP2 =
    p2Pool === undefined ? withPile(fueled, P2, 10) : withAttributePool(fueled, P2, p2Pool);
  const combat = withHand(withP2, P2, hand);
  return expectOk(
    advance(combat, {
      type: "ATTACK",
      playerId: P1,
      attackerId: attacker,
      attackId: DRIVE_SHAFT,
      targetId: target,
    }),
  );
}

describe("autoPassPriorityAction", () => {
  it("returns PASS_PRIORITY for the hotseat priority seat with no offer", () => {
    const state = openedAttack([]);
    expect(state.pendingDecision).toEqual({
      type: "reaction-priority",
      priorityPlayerId: P2,
      consecutivePasses: 0,
    });
    expect(
      autoPassPriorityAction({
        state,
        mode: "local",
        localPlayerId: null,
        canAct: true,
      }),
    ).toEqual({ type: "PASS_PRIORITY", playerId: P2 });
  });

  it("does not skip a window when a legal prevent reaction is in hand", () => {
    const state = openedAttack([PREVENT_REACTION.id]);
    expect(
      autoPassPriorityAction({
        state,
        mode: "local",
        localPlayerId: null,
        canAct: true,
      }),
    ).toBeNull();
  });

  it("passes when a chain-legal prevent is in hand but the pile cannot pay it", () => {
    const state = openedAttack([PREVENT_REACTION.id], { mechanical: 10 });
    expect(
      autoPassPriorityAction({
        state,
        mode: "local",
        localPlayerId: null,
        canAct: true,
      }),
    ).toEqual({ type: "PASS_PRIORITY", playerId: P2 });
  });

  it("never passes for the opponent online", () => {
    const state = openedAttack([]);
    expect(
      autoPassPriorityAction({
        state,
        mode: "client",
        localPlayerId: P1,
        canAct: false,
      }),
    ).toBeNull();
    expect(
      autoPassPriorityAction({
        state,
        mode: "host",
        localPlayerId: P1,
        canAct: true,
      }),
    ).toBeNull();
  });

  it("lets the online priority seat submit PASS_PRIORITY", () => {
    const state = openedAttack([]);
    expect(
      autoPassPriorityAction({
        state,
        mode: "client",
        localPlayerId: P2,
        canAct: true,
      }),
    ).toEqual({ type: "PASS_PRIORITY", playerId: P2 });
  });

  it("drainEmptyReactionPriority collapses a two-seat empty window before paint", () => {
    const opened = openedAttack([]);
    expect(opened.pendingDecision?.type).toBe("reaction-priority");
    const drained = drainEmptyReactionPriority(opened);
    expect(drained.pendingDecision?.type).not.toBe("reaction-priority");
    expect(drained.chainStack).toHaveLength(0);
  });

  it("drainEmptyReactionPriority stops when a seat has a legal Respond", () => {
    const opened = openedAttack([PREVENT_REACTION.id]);
    const drained = drainEmptyReactionPriority(opened);
    expect(drained.pendingDecision).toEqual({
      type: "reaction-priority",
      priorityPlayerId: P2,
      consecutivePasses: 0,
    });
  });

  it("drainEmptyReactionPriority collapses when the only reaction is unaffordable", () => {
    const opened = openedAttack([PREVENT_REACTION.id], { mechanical: 10 });
    expect(opened.pendingDecision?.type).toBe("reaction-priority");
    const drained = drainEmptyReactionPriority(opened);
    expect(drained.pendingDecision?.type).not.toBe("reaction-priority");
  });

  it("dispatches the Pass intent when the helper runs", () => {
    const state = openedAttack([]);
    const dispatch = vi.fn(() => true);
    expect(
      tryAutoPassPriority({
        state,
        mode: "local",
        localPlayerId: null,
        canAct: true,
        dispatch,
      }),
    ).toBe(true);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch).toHaveBeenCalledWith({ type: "PASS_PRIORITY", playerId: P2 });
  });

  it("store-style drain: dispatching Pass on an empty window advances the chain", () => {
    let state = openedAttack([]);
    const dispatch = (action: Parameters<typeof advance>[1]): boolean => {
      const result = advance(state, action);
      if (!result.ok) return false;
      state = result.state;
      return true;
    };
    expect(
      tryAutoPassPriority({
        state,
        mode: "local",
        localPlayerId: null,
        canAct: true,
        dispatch,
      }),
    ).toBe(true);
    expect(state.pendingDecision?.type === "reaction-priority").toBe(true);
    expect(state.pendingDecision?.type === "reaction-priority" && state.pendingDecision.priorityPlayerId).toBe(
      P1,
    );
    expect(
      tryAutoPassPriority({
        state,
        mode: "local",
        localPlayerId: null,
        canAct: true,
        dispatch,
      }),
    ).toBe(true);
    expect(state.pendingDecision?.type).not.toBe("reaction-priority");
  });
});
