import { describe, expect, it } from "vitest";
import { ANNEAL, IDLER_GEAR } from "../content/cards.js";
import { COGTOOTH, naturalFaceId } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import { asEffectInstanceId, asSymbolInstanceId, type DieId, type FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { graveyardOf, overloadsOf } from "../rules/cards.js";
import { createDraft } from "./draft.js";
import { applyDeferredEffect, drainResolution } from "./resolution.js";
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

const MECHANICAL_NATURAL = naturalFaceId("mechanical");

function playAnneal(state: GameState): GameState {
  const ready = withActivePlayer(
    withPile(withHand(withPhase(state, "actions"), P1, [ANNEAL]), P1, 10),
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

function attachOverloadOnCogtooth(state: GameState): GameState {
  const ready = withActivePlayer(
    withPile(withHand(withPhase(state, "actions"), P2, [IDLER_GEAR]), P2, 10),
    P2,
  );
  return resolveOpenChain(
    expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(ready, P2, 0),
        declaredFaceCardId: COGTOOTH,
      }),
    ),
  );
}

describe("[Desynthesize] instant", () => {
  it("peels own-die Cogtooth to natural mechanical and returns the synthetic to pool", () => {
    let state = installSynthetic(newMatch(), P1, P1, COGTOOTH);
    expect(state.players[P1]?.facePool.includes(COGTOOTH)).toBe(false);
    const dieId = dieIdOf(state, P1);
    state = chooseSlot(playAnneal(state), dieId, 0);
    expect(state.dice[dieId]?.slots[0]?.faceCardId).toBe(MECHANICAL_NATURAL);
    expect(state.dice[dieId]?.slots[0]?.faceCardOwnerId).toBe(P1);
    expect(state.players[P1]?.facePool.includes(COGTOOTH)).toBe(true);
    expect(state.pendingDecision?.type).not.toBe("replace-synthetic-face");
  });

  it("peels an opponent-die synthetic; natural belongs to the die owner; synthetic returns to the forger", () => {
    let state = installSynthetic(newMatch(), P2, P1, COGTOOTH);
    const p2 = state.players[P2];
    if (p2 === undefined) throw new Error("p2");
    state = {
      ...state,
      players: {
        ...state.players,
        [P2]: { ...p2, facePool: p2.facePool.filter((id) => id !== COGTOOTH) },
      },
    };
    expect(state.players[P1]?.facePool.includes(COGTOOTH)).toBe(false);
    expect(state.players[P2]?.facePool.includes(COGTOOTH)).toBe(false);
    const dieId = dieIdOf(state, P2);
    state = chooseSlot(playAnneal(state), dieId, 0);
    expect(state.dice[dieId]?.slots[0]?.faceCardId).toBe(MECHANICAL_NATURAL);
    expect(state.dice[dieId]?.slots[0]?.faceCardOwnerId).toBe(P2);
    expect(state.players[P1]?.facePool.includes(COGTOOTH)).toBe(true);
    expect(state.players[P2]?.facePool.includes(COGTOOTH)).toBe(false);
  });

  it("clears overloads on that face when the last copy leaves", () => {
    let state = installSynthetic(newMatch(), P2, P2, COGTOOTH);
    state = attachOverloadOnCogtooth(state);
    expect(overloadsOf(state, P2).length).toBeGreaterThan(0);
    const overloadId = overloadsOf(state, P2)[0]?.id;
    const dieId = dieIdOf(state, P2);
    state = chooseSlot(playAnneal(state), dieId, 0);
    expect(overloadsOf(state, P2)).toHaveLength(0);
    if (overloadId !== undefined) {
      expect(graveyardOf(state, P2).some((card) => card.id === overloadId)).toBe(true);
    }
  });

  it("can desynthesize a forge-locked slot", () => {
    let state = installSynthetic(newMatch(), P1, P1, COGTOOTH);
    state = withSlotPatch(state, P1, 0, { forgeLockRemaining: 4, corruptionMarkers: 2 });
    const dieId = dieIdOf(state, P1);
    expect(state.dice[dieId]?.slots[0]?.forgeLockRemaining).toBe(4);
    state = chooseSlot(playAnneal(state), dieId, 0);
    expect(state.dice[dieId]?.slots[0]?.faceCardId).toBe(MECHANICAL_NATURAL);
    expect(state.dice[dieId]?.slots[0]?.forgeLockRemaining ?? 0).toBe(0);
    expect(state.dice[dieId]?.slots[0]?.corruptionMarkers ?? 0).toBe(0);
  });

  it("leaves an already-generated pip on a showing slot; face id becomes natural", () => {
    let state = installSynthetic(newMatch(), P1, P1, COGTOOTH);
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
    state = chooseSlot(playAnneal(state), dieId, 0);
    expect(state.dice[dieId]?.slots[0]?.faceCardId).toBe(MECHANICAL_NATURAL);
    expect(state.symbols[symbolId]?.status).toBe("rolled");
    expect(state.symbols[symbolId]?.symbol).toBe("mechanical");
  });

  it("whiffs when no synthetics are on any die", () => {
    const state = playAnneal(newMatch());
    expect(state.pendingDecision).toBeNull();
    expect(state.pendingDecision?.type).not.toBe("replace-synthetic-face");
  });

  it("does not open replace-synthetic-face pending", () => {
    const state = installSynthetic(newMatch(), P1, P1, COGTOOTH);
    const opened = playAnneal(state);
    expect(opened.pendingDecision?.type).toBe("choose-die-slot");
    expect(opened.pendingDecision?.type).not.toBe("replace-synthetic-face");
  });

  it("applies from a declared slot without a chooser (injected)", () => {
    const installed = installSynthetic(newMatch(), P1, P1, COGTOOTH);
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
    expect(draft.dice[dieId]?.slots[0]?.faceCardId).toBe(MECHANICAL_NATURAL);
    expect(draft.pendingDecision?.type).not.toBe("replace-synthetic-face");
  });
});
