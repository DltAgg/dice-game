import { describe, expect, it } from "vitest";
import type { DieState } from "../model/dice.js";
import { asEffectInstanceId, asFaceCardId, asSymbolInstanceId, type DieId, type FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { graveyardOf, overloadsOf } from "../rules/cards.js";
import { createDraft } from "./draft.js";
import { applyDeferredEffect, drainResolution } from "./resolution.js";
import { TEST_SYNTHETIC_MECHANICAL_A, testCard } from "../testing/fixtures/index.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withActivePlayer,
  withHand,
  withPhase,
  withPile,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const DESYNTHESIZE = testCard({
  id: "card-test-desynthesize",
  playCost: { mechanical: 2, any: 2 },
  effect: {
    effects: [{ type: "desynthesize", target: { kind: "choose-any-synthetic-slot" } }],
  },
});

const OVERLOAD = testCard({
  id: "card-test-desynth-overload",
  playCost: { mechanical: 2 },
  type: "modify",
  overload: { faceSymbols: ["mechanical"], onRoll: [{ type: "play-cost-discount", amount: 1 }] },
});

function playDesynthesize(state: GameState): GameState {
  const ready = withActivePlayer(
    withPile(withHand(withPhase(state, "actions"), P1, [DESYNTHESIZE.id]), P1, 10),
    P1,
  );
  return expectOk(
    advance(ready, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(ready, P1, 0),
    }),
  );
}

function chooseSlot(state: GameState, dieId: DieId, slotIndex: number): GameState {
  expect(state.pendingDecision?.type).toBe("choose-die-slot");
  expect(state.pendingDecision?.type === "choose-die-slot" && state.pendingDecision.filter).toBe(
    "any-synthetic",
  );
  return expectOk(
    advance(state, {
      type: "RESOLVE_CHOOSE_DIE_SLOT",
      playerId: P1,
      dieId,
      slotIndex,
    }),
  );
}

function dieIdOf(state: GameState, playerId: typeof P1 | typeof P2, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("expected a die");
  return id;
}

function installSynthetic(
  state: GameState,
  dieOwner: typeof P1 | typeof P2,
  faceOwner: typeof P1 | typeof P2,
  faceCardId: FaceCardId,
  slotIndex = 0,
): GameState {
  const dieId = dieIdOf(state, dieOwner);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((entry: DieState["slots"][number], index) =>
    index === slotIndex ? { ...entry, faceCardId, faceCardOwnerId: faceOwner } : entry,
  );
  const owner = state.players[faceOwner];
  if (owner === undefined) throw new Error("owner");
  return {
    ...state,
    dice: { ...state.dice, [dieId]: { ...die, slots } },
    players: {
      ...state.players,
      [faceOwner]: {
        ...owner,
        facePool: owner.facePool.filter((id) => id !== faceCardId),
      },
    },
  };
}

function withSlotPatch(
  state: GameState,
  playerId: typeof P1 | typeof P2,
  slotIndex: number,
  patch: Partial<DieState["slots"][number]>,
): GameState {
  const dieId = dieIdOf(state, playerId);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((entry, index) => (index === slotIndex ? { ...entry, ...patch } : entry));
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function attachOverloadOnSynthetic(state: GameState): GameState {
  const ready = withActivePlayer(
    withPile(withHand(withPhase(state, "actions"), P2, [OVERLOAD.id]), P2, 10),
    P2,
  );
  return resolveOpenChain(
    expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(ready, P2, 0),
        declaredFaceCardId: TEST_SYNTHETIC_MECHANICAL_A,
      }),
    ),
  );
}

describe("[Desynthesize] instant", () => {
  it("does not peel a synthetic or return it to the pool", () => {
    let state = installSynthetic(newMatch(), P1, P1, TEST_SYNTHETIC_MECHANICAL_A);
    expect(state.players[P1]?.facePool.includes(TEST_SYNTHETIC_MECHANICAL_A)).toBe(false);
    const dieId = dieIdOf(state, P1);
    state = chooseSlot(playDesynthesize(state), dieId, 0);
    expect(state.dice[dieId]?.slots[0]?.faceCardId).toBe(TEST_SYNTHETIC_MECHANICAL_A);
    expect(state.dice[dieId]?.slots[0]?.faceCardOwnerId).toBe(P1);
    expect(state.players[P1]?.facePool.includes(TEST_SYNTHETIC_MECHANICAL_A)).toBe(false);
    expect(state.pendingDecision?.type).not.toBe("replace-synthetic-face");
  });

  it("does not peel an opponent-die synthetic or move it between pools", () => {
    let state = installSynthetic(newMatch(), P2, P1, TEST_SYNTHETIC_MECHANICAL_A);
    const p2 = state.players[P2];
    if (p2 === undefined) throw new Error("p2");
    state = {
      ...state,
      players: {
        ...state.players,
        [P2]: { ...p2, facePool: p2.facePool.filter((id) => id !== TEST_SYNTHETIC_MECHANICAL_A) },
      },
    };
    expect(state.players[P1]?.facePool.includes(TEST_SYNTHETIC_MECHANICAL_A)).toBe(false);
    expect(state.players[P2]?.facePool.includes(TEST_SYNTHETIC_MECHANICAL_A)).toBe(false);
    const dieId = dieIdOf(state, P2);
    state = chooseSlot(playDesynthesize(state), dieId, 0);
    expect(state.dice[dieId]?.slots[0]?.faceCardId).toBe(TEST_SYNTHETIC_MECHANICAL_A);
    expect(state.dice[dieId]?.slots[0]?.faceCardOwnerId).toBe(P1);
    expect(state.players[P1]?.facePool.includes(TEST_SYNTHETIC_MECHANICAL_A)).toBe(false);
    expect(state.players[P2]?.facePool.includes(TEST_SYNTHETIC_MECHANICAL_A)).toBe(false);
  });

  it("leaves overloads attached because the face stays installed", () => {
    let state = installSynthetic(newMatch(), P2, P2, TEST_SYNTHETIC_MECHANICAL_A);
    state = attachOverloadOnSynthetic(state);
    expect(overloadsOf(state, P2).length).toBeGreaterThan(0);
    const overloadId = overloadsOf(state, P2)[0]?.id;
    const dieId = dieIdOf(state, P2);
    state = chooseSlot(playDesynthesize(state), dieId, 0);
    expect(overloadsOf(state, P2).length).toBeGreaterThan(0);
    if (overloadId !== undefined) {
      expect(graveyardOf(state, P2).some((card) => card.id === overloadId)).toBe(false);
    }
  });

  it("does not clear forge lock or corruption on the slot", () => {
    let state = installSynthetic(newMatch(), P1, P1, TEST_SYNTHETIC_MECHANICAL_A);
    state = withSlotPatch(state, P1, 0, { forgeLockRemaining: 4, corruptionMarkers: 2 });
    const dieId = dieIdOf(state, P1);
    expect(state.dice[dieId]?.slots[0]?.forgeLockRemaining).toBe(4);
    state = chooseSlot(playDesynthesize(state), dieId, 0);
    expect(state.dice[dieId]?.slots[0]?.faceCardId).toBe(TEST_SYNTHETIC_MECHANICAL_A);
    expect(state.dice[dieId]?.slots[0]?.forgeLockRemaining).toBe(4);
    expect(state.dice[dieId]?.slots[0]?.corruptionMarkers).toBe(2);
  });

  it("leaves the showing face and an already-generated pip", () => {
    let state = installSynthetic(newMatch(), P1, P1, TEST_SYNTHETIC_MECHANICAL_A);
    const dieId = dieIdOf(state, P1);
    const die = state.dice[dieId];
    if (die === undefined) throw new Error("die");
    const symbolId = asSymbolInstanceId("sym-desynth-showing");
    state = {
      ...state,
      dice: { ...state.dice, [dieId]: { ...die, rolledSlotIndex: 0 } },
      symbols: {
        ...state.symbols,
        [symbolId]: {
          id: symbolId,
          ownerId: P1,
          symbol: "mechanical",
          status: "rolled",
          sourceDieId: dieId,
          absorbedByCreatureId: null,
        },
      },
    };
    state = chooseSlot(playDesynthesize(state), dieId, 0);
    expect(state.dice[dieId]?.slots[0]?.faceCardId).toBe(TEST_SYNTHETIC_MECHANICAL_A);
    expect(state.symbols[symbolId]?.status).toBe("rolled");
    expect(state.symbols[symbolId]?.symbol).toBe("mechanical");
  });

  it("whiffs when every showing face is Shield", () => {
    const base = newMatch();
    const dice = { ...base.dice };
    for (const [id, die] of Object.entries(dice)) {
      dice[id as keyof typeof dice] = {
        ...die,
        slots: die.slots.map((slot) => ({
          ...slot,
          faceCardId: asFaceCardId("face-untyped-shield"),
          faceCardOwnerId: die.ownerId,
        })),
      };
    }
    const state = playDesynthesize({ ...base, dice });
    expect(state.pendingDecision).toBeNull();
  });

  it("does not open replace-synthetic-face pending", () => {
    const state = installSynthetic(newMatch(), P1, P1, TEST_SYNTHETIC_MECHANICAL_A);
    const opened = playDesynthesize(state);
    expect(opened.pendingDecision?.type).toBe("choose-die-slot");
    expect(opened.pendingDecision?.type).not.toBe("replace-synthetic-face");
  });

  it("applies from a declared slot without a chooser (injected)", () => {
    const installed = installSynthetic(newMatch(), P1, P1, TEST_SYNTHETIC_MECHANICAL_A);
    const dieId = dieIdOf(installed, P1);
    const draft = createDraft(withPhase(installed, "actions"));
    applyDeferredEffect(draft, {
      id: asEffectInstanceId("eff-desynth-declared"),
      controllerId: P1,
      effect: {
        type: "desynthesize",
        target: { kind: "declared-die-slot", dieId, slotIndex: 0 },
      },
      sourceCreatureId: null,
      declaredTargetCreatureId: null,
      declaredTargetCardInstanceId: null,
      sourceDieId: null,
      sourceSlotIndex: null,
      sourceCardInstanceId: null,
      ignoreShield: 0,
      fromAttack: false,
    });
    drainResolution(draft);
    expect(draft.dice[dieId]?.slots[0]?.faceCardId).toBe(TEST_SYNTHETIC_MECHANICAL_A);
    expect(draft.pendingDecision?.type).not.toBe("replace-synthetic-face");
  });
});
