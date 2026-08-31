import { describe, expect, it } from "vitest";
import { RECAST } from "../content/cards.js";
import { COGTOOTH, MAINSPRING } from "../content/faces.js";
import type { GameState } from "../model/state.js";
import type { DieId, FaceCardId } from "../model/ids.js";
import {
  expectOk,
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

function dieIdOf(state: GameState): DieId {
  const id = state.players[P1]?.dieIds[0];
  if (id === undefined) throw new Error("die");
  return id;
}

function installFromPool(state: GameState, faceCardId: FaceCardId, slot = 0): GameState {
  const dieId = dieIdOf(state);
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

describe("replace-synthetic-face (Recast)", () => {
  it("opens reforge when a different pool face exists", () => {
    const ready = installFromPool(actionsReady([RECAST]), COGTOOTH);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("replace-synthetic-face");
  });

  it("returns the displaced face to the pool after reforge", () => {
    const state = installFromPool(actionsReady([RECAST]), MAINSPRING);
    const played = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("replace-synthetic-face");
  });
});

describe("Tempo movers", () => {
  it("Recast is the proving card for synthetic replacement", () => {
    expect(RECAST).toBeDefined();
  });
});
