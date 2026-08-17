import { describe, expect, it } from "vitest";
import { REFORGE, RATCHET } from "../content/cards.js";
import { FLYWHEEL, PISTON, faceIdForSymbol, syntheticFaceId } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { DieId, FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { overloadsOf, overloadsOnFace } from "../rules/cards.js";
import {
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withEnergy,
  withHand,
  withPhase,
  withSymbols,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][], energy = 10) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

function dieIdOf(state: GameState, playerId = P1, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("test: no die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

/** Install `faceCardId` onto a slot, maintaining pool xor-installed ledger. */
function installFromPool(state: GameState, faceCardId: FaceCardId, slot = 0): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
  const player = state.players[P1];
  if (player === undefined) throw new Error("test: no player");
  const pool = [...player.facePool];
  const index = pool.indexOf(faceCardId);
  if (index < 0) throw new Error(`test: ${faceCardId} not in pool`);
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

/** Ensure named faces sit in the controller's pool (for Reforge choices). */
function withPoolFaces(state: GameState, faceCardIds: readonly FaceCardId[]): GameState {
  const player = state.players[P1];
  if (player === undefined) throw new Error("test: no player");
  const facePool = [...player.facePool];
  for (const id of faceCardIds) {
    if (!facePool.includes(id)) facePool.push(id);
  }
  return { ...state, players: { ...state.players, [P1]: { ...player, facePool } } };
}

function reforgeReady(extraPool: readonly FaceCardId[] = [FLYWHEEL, PISTON]): GameState {
  let state = withSymbols(actionsReady([REFORGE]), P1, ["mechanical"]);
  state = withPoolFaces(state, extraPool);
  return state;
}

describe("replace-synthetic-face (Reforge)", () => {
  it("opens a pending when a legal slot and different pool face exist", () => {
    const ready = installFromPool(reforgeReady(), FLYWHEEL);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );

    expect(eventTypes(played)).toContain("replace-synthetic-face-started");
    expect(played.pendingDecision).toEqual({
      type: "replace-synthetic-face",
      controllerId: P1,
      kind: "synthetic",
      attribute: "mechanical",
      sourceCardInstanceId: handCardIdAt(ready, P1, 0),
      sourceFaceCardId: null,
    });
  });

  it("returns the installed face to the pool and installs a different pool face without forge-draw", () => {
    const ready = installFromPool(reforgeReady(), FLYWHEEL);
    const dieId = dieIdOf(ready);
    const deckBeforePlay = ready.players[P1]?.deck.length ?? 0;

    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const deckAfterPlay = played.players[P1]?.deck.length ?? 0;

    const resolved = expectOk(
      advance(played, {
        type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
        playerId: P1,
        dieId,
        slotIndex: 0,
        faceCardId: PISTON,
      }),
    );

    expect(resolved.dice[dieId]?.slots[0]?.faceCardId).toBe(PISTON);
    expect(resolved.players[P1]?.facePool).toContain(FLYWHEEL);
    expect(resolved.players[P1]?.facePool).not.toContain(PISTON);
    expect(eventTypes(resolved)).toContain("replace-synthetic-face-resolved");
    expect(eventTypes(resolved)).not.toContain("face-forged");
    // Replace is not a forge: deck unchanged across the resolve step.
    expect(deckAfterPlay).toBe(deckBeforePlay);
    expect(resolved.players[P1]?.deck.length).toBe(deckAfterPlay);
  });

  it("refuses installing the same faceCardId that was removed", () => {
    // Two installs of the same definition are impossible under XOR; seed an
    // illegal resolve attempt by naming the slot's current id after pending opens.
    const ready = installFromPool(reforgeReady(), FLYWHEEL);
    const dieId = dieIdOf(ready);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );

    const refused = advance(played, {
      type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
      playerId: P1,
      dieId,
      slotIndex: 0,
      faceCardId: FLYWHEEL,
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INVALID_CHOICE");
  });

  it("refuses a non-matching installed slot", () => {
    let ready = withPoolFaces(reforgeReady(), [FLYWHEEL, PISTON]);
    // Install a Martial natural — not Synthetic Mechanical.
    const dieId = dieIdOf(ready);
    const die = ready.dice[dieId];
    if (die === undefined) throw new Error("test: missing die");
    ready = withDie(ready, dieId, {
      slots: die.slots.map((s, i) =>
        i === 0 ? { ...s, faceCardId: faceIdForSymbol("martial"), faceCardOwnerId: P1 } : s,
      ),
    });

    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    // No legal replace — effect whiffs; no pending.
    expect(played.pendingDecision).toBeNull();
    expect(eventTypes(played)).not.toContain("replace-synthetic-face-started");
  });

  it("whiffs when the only pool mechanical synthetic would be the same face after return", () => {
    // Only one Synthetic Mechanical available: installed Flywheel, nothing else in pool.
    let ready = withSymbols(actionsReady([REFORGE]), P1, ["mechanical"]);
    ready = withPoolFaces(ready, [FLYWHEEL]);
    // Strip other mechanical synthetics from the pool.
    const player = ready.players[P1];
    if (player === undefined) throw new Error("test: no player");
    ready = {
      ...ready,
      players: {
        ...ready.players,
        [P1]: {
          ...player,
          facePool: player.facePool.filter((id) => {
            if (id === FLYWHEEL) return true;
            if (id === syntheticFaceId("mechanical")) return false;
            if (id === PISTON) return false;
            return true;
          }),
        },
      },
    };
    ready = installFromPool(ready, FLYWHEEL);

    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision).toBeNull();
    expect(eventTypes(played)).not.toContain("replace-synthetic-face-started");
  });

  it("requires Mechanical in the pool", () => {
    const ready = installFromPool(reforgeReady(), FLYWHEEL);
    // Drop the mechanical require fuel.
    const stripped: GameState = {
      ...ready,
      symbols: Object.fromEntries(
        Object.entries(ready.symbols).filter(([, s]) => s.symbol !== "mechanical"),
      ),
    };
    const refused = advance(stripped, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(stripped, P1, 0),
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INSUFFICIENT_SYMBOLS");
  });

  it("clears overloads when the last copy of the removed face returns to the pool", () => {
    let ready = withPoolFaces(reforgeReady([FLYWHEEL, PISTON]), [FLYWHEEL, PISTON]);
    ready = installFromPool(ready, FLYWHEEL);
    ready = withHand(ready, P1, [RATCHET, REFORGE]);
    ready = withSymbols(ready, P1, ["mechanical"]);
    ready = withEnergy(ready, P1, 10);

    const attached = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredFaceCardId: FLYWHEEL,
      }),
    );
    expect(overloadsOnFace(attached, P1, FLYWHEEL)).toHaveLength(1);

    // Reforge is second in hand after Ratchet left.
    const reforgeId = handCardIdAt(attached, P1, 0);
    const withFuel = withSymbols(withEnergy(attached, P1, 10), P1, ["mechanical"]);
    const played = expectOk(
      advance(withFuel, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: reforgeId,
      }),
    );

    const dieId = dieIdOf(played);
    const resolved = expectOk(
      advance(played, {
        type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
        playerId: P1,
        dieId,
        slotIndex: 0,
        faceCardId: PISTON,
      }),
    );

    expect(resolved.players[P1]?.facePool).toContain(FLYWHEEL);
    expect(overloadsOnFace(resolved, P1, FLYWHEEL)).toHaveLength(0);
    expect(overloadsOf(resolved, P1)).toHaveLength(0);
  });

  it("refuses other actions while replace-synthetic-face is pending", () => {
    const ready = installFromPool(reforgeReady(), FLYWHEEL);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("replace-synthetic-face");

    const refused = advance(played, {
      type: "END_TURN",
      playerId: P1,
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("PENDING_DECISION");
  });
});
