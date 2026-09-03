import { describe, expect, it } from "vitest";
import { ALLOY_SHIFT, RECAST } from "../content/cards.js";
import { COGTOOTH, GEAR_TRAIN, HALO_LAMP, MAINSPRING } from "../content/faces.js";
import type { GameState } from "../model/state.js";
import type { DieId, FaceCardId } from "../model/ids.js";
import { eligiblePoolFacesForReforge } from "../rules/reforge.js";
import {
  expectOk,
  eventTypes,
  handCardIdAt,
  newMatch,
  P1,
  withPile,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

function dieIdOf(state: GameState, index = 0): DieId {
  const id = state.players[P1]?.dieIds[index];
  if (id === undefined) throw new Error("die");
  return id;
}

function installFromPool(state: GameState, faceCardId: FaceCardId, slot = 0, dieIndex = 0): GameState {
  const dieId = dieIdOf(state, dieIndex);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const player = state.players[P1];
  if (player === undefined) throw new Error("player");
  const pool = [...player.facePool];
  const index = pool.indexOf(faceCardId);
  if (index < 0) throw new Error("missing face");
  pool.splice(index, 1);
  const slots = die.slots.map((s, i) =>
    i === slot ? { ...s, faceCardId, faceCardOwnerId: P1 } : s,
  );
  return {
    ...state,
    dice: { ...state.dice, [dieId]: { ...die, slots } },
    players: { ...state.players, [P1]: { ...player, facePool: pool } },
  };
}

function playFromHand(state: GameState): GameState {
  return expectOk(
    advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    }),
  );
}

describe("replace-synthetic-face (Reforge / Recast)", () => {
  it("opens Reforge 2 for any replaceable faces on one die", () => {
    const played = playFromHand(actionsReady([RECAST]));
    expect(played.pendingDecision).toMatchObject({
      type: "replace-synthetic-face",
      faces: 2,
      attribute: "mechanical",
    });
    expect(played.pendingDecision).not.toHaveProperty("fromAttribute");
  });

  it("installs two synthetic Mechanical faces from the pool and returns displaced faces when orphaned", () => {
    const played = playFromHand(actionsReady([RECAST]));
    const dieId = dieIdOf(played);
    const pool = eligiblePoolFacesForReforge(played, P1, "mechanical");
    const first = pool[0];
    const second = pool[1];
    if (first === undefined || second === undefined) throw new Error("pool too small");
    const installed = [first, second] as const;
    const displaced = [
      played.dice[dieId]?.slots[0]?.faceCardId,
      played.dice[dieId]?.slots[1]?.faceCardId,
    ];
    const resolved = expectOk(
      advance(played, {
        type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
        playerId: P1,
        dieId,
        slotIndexes: [0, 1],
        faceCardIds: [...installed],
      }),
    );
    expect(resolved.pendingDecision).toBeNull();
    expect(resolved.dice[dieId]?.slots[0]?.faceCardId).toBe(installed[0]);
    expect(resolved.dice[dieId]?.slots[1]?.faceCardId).toBe(installed[1]);
    const nextPool = resolved.players[P1]?.facePool ?? [];
    expect(nextPool).not.toContain(installed[0]);
    expect(nextPool).not.toContain(installed[1]);
    for (const id of displaced) {
      if (id === undefined) continue;
      const stillInstalled = Object.values(resolved.dice).some((die) =>
        die.slots.some((slot) => slot.faceCardId === id),
      );
      if (!stillInstalled) expect(nextPool).toContain(id);
    }
    expect(eventTypes(resolved)).toContain("replace-synthetic-face-resolved");
  });

  it("rejects duplicate slot indexes", () => {
    const played = playFromHand(actionsReady([RECAST]));
    const pool = eligiblePoolFacesForReforge(played, P1, "mechanical");
    const rejected = advance(played, {
      type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
      playerId: P1,
      dieId: dieIdOf(played, 0),
      slotIndexes: [0, 0],
      faceCardIds: [pool[0]!, pool[1]!],
    });
    expect(rejected.ok).toBe(false);
  });

  it("whiffs when the pool has fewer than N destination synthetics", () => {
    let state = actionsReady([RECAST]);
    state = installFromPool(state, COGTOOTH, 0, 0);
    state = installFromPool(state, GEAR_TRAIN, 1, 0);
    state = installFromPool(state, MAINSPRING, 0, 1);
    const played = playFromHand(state);
    expect(played.pendingDecision?.type).not.toBe("replace-synthetic-face");
  });
});

describe("replace-synthetic-face (Cross forge / Alloy Shift)", () => {
  it("whiffs when no showing face matches Y", () => {
    const played = playFromHand(actionsReady([ALLOY_SHIFT]));
    expect(played.pendingDecision?.type).not.toBe("replace-synthetic-face");
  });

  it("opens Cross forge Mechanical → synthetic Luminar", () => {
    const ready = installFromPool(actionsReady([ALLOY_SHIFT]), COGTOOTH);
    const played = playFromHand(ready);
    expect(played.pendingDecision).toMatchObject({
      type: "replace-synthetic-face",
      faces: 1,
      attribute: "luminar",
      fromAttribute: "mechanical",
    });
  });

  it("installs a synthetic Luminar over a Mechanical slot", () => {
    const ready = installFromPool(actionsReady([ALLOY_SHIFT]), COGTOOTH);
    const played = playFromHand(ready);
    const dieId = dieIdOf(played);
    const resolved = expectOk(
      advance(played, {
        type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
        playerId: P1,
        dieId,
        slotIndexes: [0],
        faceCardIds: [HALO_LAMP],
      }),
    );
    expect(resolved.dice[dieId]?.slots[0]?.faceCardId).toBe(HALO_LAMP);
    expect(resolved.players[P1]?.facePool).toContain(COGTOOTH);
    expect(resolved.players[P1]?.facePool).not.toContain(HALO_LAMP);
  });

  it("rejects a slot that does not show Y", () => {
    const ready = installFromPool(actionsReady([ALLOY_SHIFT]), COGTOOTH);
    const played = playFromHand(ready);
    const rejected = advance(played, {
      type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
      playerId: P1,
      dieId: dieIdOf(played),
      slotIndexes: [3],
      faceCardIds: [HALO_LAMP],
    });
    expect(rejected.ok).toBe(false);
  });
});
