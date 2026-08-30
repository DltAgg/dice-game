import { describe, expect, it } from "vitest";
import { RETHROW } from "../content/cards.js";
import { COGTOOTH, DAWNWRIGHT, SHIELD_FACE_ID } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { DieId, FaceCardId } from "../model/ids.js";
import { asSymbolInstanceId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import type { SymbolStatus, SymbolType } from "../model/symbols.js";
import type { RNG } from "../rng/rng.js";
import { usableSymbols } from "../rules/symbols.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";
import { reduce } from "./reduce.js";

function dieIdOf(state: GameState, index = 0): DieId {
  const id = state.players[P1]?.dieIds[index];
  if (id === undefined) throw new Error("die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function installSlotFace(
  state: GameState,
  dieId: DieId,
  slotIndex: number,
  faceCardId: FaceCardId,
): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((slot, index) =>
    index === slotIndex ? { ...slot, faceCardId, faceCardOwnerId: P1 } : slot,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function withDieResult(
  state: GameState,
  dieId: DieId,
  symbol: SymbolType,
  status: SymbolStatus = "rolled",
): GameState {
  const id = asSymbolInstanceId(`given-reroll-${dieId}-${symbol}`);
  return {
    ...state,
    symbols: {
      ...state.symbols,
      [id]: {
        id,
        ownerId: P1,
        symbol,
        status,
        sourceDieId: dieId,
        absorbedByCreatureId: null,
      },
    },
  };
}

/** `rng.integer(0, 5)` always returns `slot`. */
function rngLanding(slot: number): RNG {
  return {
    next: () => 0,
    integer: () => slot,
    pick: <T>(items: readonly T[]) => items[0],
    snapshot: () => ({ seed: 1, cursor: 0 }),
  };
}

/** Shield showing on slot 0; target face on `landSlot`; unabsorbed Shield pip. */
function shieldShowingReady(landFace: FaceCardId, landSlot: number): GameState {
  let state = withHand(withPhase(newMatch(), "actions"), P1, [RETHROW]);
  const dieId = dieIdOf(state);
  state = installSlotFace(state, dieId, 0, SHIELD_FACE_ID);
  state = installSlotFace(state, dieId, landSlot, landFace);
  state = withDie(state, dieId, { rolledSlotIndex: 0 });
  return withDieResult(state, dieId, "shield");
}

function playRethrowOntoDie(state: GameState, dieId: DieId): GameState {
  const afterPlay = expectOk(
    advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    }),
  );
  expect(afterPlay.pendingDecision?.type).toBe("choose-die");
  return expectOk(
    advance(afterPlay, { type: "RESOLVE_CHOOSE_DIE", playerId: P1, dieId }),
  );
}

describe("Rethrow [Reroll]", () => {
  it("fires On roll for the new face and banks its Generate", () => {
    const landSlot = 3;
    const ready = shieldShowingReady(DAWNWRIGHT, landSlot);
    const dieId = dieIdOf(ready);
    const chosen = playRethrowOntoDie(ready, dieId);
    expect(chosen.pendingDecision?.type).toBe("optional-reroll");

    const after = expectOk(
      reduce(
        chosen,
        { type: "RESOLVE_OPTIONAL_REROLL", playerId: P1, accept: true },
        rngLanding(landSlot),
      ),
    );

    expect(after.phase).toBe("actions");
    expect(after.dice[dieId]?.rolledSlotIndex).toBe(landSlot);
    expect(after.dice[dieId]?.slots[landSlot]?.faceCardId).toBe(DAWNWRIGHT);
    expect(after.players[P1]?.attributePool.luminar ?? 0).toBeGreaterThanOrEqual(1);
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
    expect(
      usableSymbols(after, P1).filter((symbol) => symbol.sourceDieId === dieId),
    ).toHaveLength(0);
  });

  it("banks the new showing pip and fires On absorb", () => {
    const landSlot = 4;
    const ready = shieldShowingReady(COGTOOTH, landSlot);
    const dieId = dieIdOf(ready);
    const chosen = playRethrowOntoDie(ready, dieId);

    const after = expectOk(
      reduce(
        chosen,
        { type: "RESOLVE_OPTIONAL_REROLL", playerId: P1, accept: true },
        rngLanding(landSlot),
      ),
    );

    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(2);
    expect(after.forgeDiscountThisTurn[P1]).toBeGreaterThanOrEqual(1);
    expect(
      Object.values(after.symbols).filter(
        (symbol) => symbol.sourceDieId === dieId && symbol.symbol === "shield",
      ),
    ).toHaveLength(0);
  });

  it("changes the showing face instead of only re-firing Stamp", () => {
    const landSlot = 2;
    const ready = shieldShowingReady(DAWNWRIGHT, landSlot);
    const dieId = dieIdOf(ready);
    const priorAppeared = ready.facesAppearedThisRoll;
    const chosen = playRethrowOntoDie(ready, dieId);

    const after = expectOk(
      reduce(
        chosen,
        { type: "RESOLVE_OPTIONAL_REROLL", playerId: P1, accept: true },
        rngLanding(landSlot),
      ),
    );

    expect(after.dice[dieId]?.rolledSlotIndex).toBe(landSlot);
    expect(after.dice[dieId]?.slots[0]?.faceCardId).toBe(SHIELD_FACE_ID);
    expect(after.dice[dieId]?.slots[landSlot]?.faceCardId).toBe(DAWNWRIGHT);
    expect(eventTypes(after)).toContain("die-rolled");
    expect(after.facesAppearedThisRoll).toEqual(
      expect.arrayContaining([
        ...priorAppeared,
        expect.objectContaining({
          dieId,
          slotIndex: landSlot,
          faceCardId: DAWNWRIGHT,
        }),
      ]),
    );
  });
});

describe("optional reroll same-face ally damage", () => {
  it("deals after the new result when the face matches", () => {
    let state = withPhase(newMatch(), "actions");
    const dieId = dieIdOf(state);
    const faceCardId = state.dice[dieId]!.slots[0]!.faceCardId;
    state = withDie(state, dieId, { rolledSlotIndex: 0 });
    const allyA = creatureIdAt(state, P1, 0);
    const allyB = creatureIdAt(state, P1, 1);
    state = {
      ...state,
      pendingDecision: {
        type: "optional-reroll",
        controllerId: P1,
        dieId,
        faceCardId,
        sameFaceAllyDamage: 1,
      },
    };

    const after = expectOk(
      reduce(
        state,
        { type: "RESOLVE_OPTIONAL_REROLL", playerId: P1, accept: true },
        rngLanding(0),
      ),
    );

    expect(after.creatures[allyA]?.damage).toBe(1);
    expect(after.creatures[allyB]?.damage).toBe(1);
  });

  it("does not deal when the new face differs", () => {
    let state = withPhase(newMatch(), "actions");
    const dieId = dieIdOf(state);
    const original = state.dice[dieId]!.slots[0]!.faceCardId;
    const other = state.dice[dieId]!.slots[1]!.faceCardId;
    expect(other).not.toBe(original);
    state = installSlotFace(state, dieId, 1, other);
    state = withDie(state, dieId, { rolledSlotIndex: 0 });
    const allyA = creatureIdAt(state, P1, 0);
    state = {
      ...state,
      pendingDecision: {
        type: "optional-reroll",
        controllerId: P1,
        dieId,
        faceCardId: original,
        sameFaceAllyDamage: 1,
      },
    };

    const after = expectOk(
      reduce(
        state,
        { type: "RESOLVE_OPTIONAL_REROLL", playerId: P1, accept: true },
        rngLanding(1),
      ),
    );

    expect(after.creatures[allyA]?.damage).toBe(0);
  });
});
