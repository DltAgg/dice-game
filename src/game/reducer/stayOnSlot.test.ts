import { describe, expect, it } from "vitest";
import { ECLIPSE, LATENT_CORRUPTION, RITUAL_OF_CONTAMINATION } from "../content/cards.js";
import {
  FORBIDDEN_HERITAGE,
  PESTILENT_PLAGUE,
  SHIELD_FACE_ID,
  syntheticFaceId,
} from "../content/faces.js";
import type { DieSlot, DieState } from "../model/dice.js";
import type { FaceCardId, PlayerId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { slotCannotBeReplacedByForge } from "../rules/faces.js";
import {
  eventTypes,
  expectOk,
  forgeAction,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withEnergy,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: Parameters<typeof withHand>[2], energy = 10) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

function dieIdOf(state: GameState, playerId: PlayerId = P1, index = 0) {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("test: no die");
  return id;
}

function withDie(state: GameState, dieId: ReturnType<typeof dieIdOf>, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function asActive(state: GameState, playerId: PlayerId, energy = 10): GameState {
  return { ...withEnergy(state, playerId, energy), activePlayerId: playerId };
}

/** Install a pool face onto a die, keeping the pool xor-installed ledger. */
function installFromPool(
  state: GameState,
  faceCardId: FaceCardId,
  opts: {
    readonly dieOwner?: PlayerId;
    readonly faceOwner?: PlayerId;
    readonly dieIndex?: number;
    readonly slot?: number;
    readonly extra?: Partial<DieSlot>;
  } = {},
): GameState {
  const dieOwner = opts.dieOwner ?? P1;
  const faceOwner = opts.faceOwner ?? dieOwner;
  const slotIndex = opts.slot ?? 0;
  const dieId = dieIdOf(state, dieOwner, opts.dieIndex ?? 0);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
  const owner = state.players[faceOwner];
  if (owner === undefined) throw new Error("test: no face owner");
  const pool = [...owner.facePool];
  const index = pool.indexOf(faceCardId);
  if (index < 0) throw new Error(`test: ${faceCardId} not in ${faceOwner} pool`);
  pool.splice(index, 1);
  const slots = die.slots.map((slot) =>
    slot.index === slotIndex
      ? { ...slot, faceCardId, faceCardOwnerId: faceOwner, ...opts.extra }
      : slot,
  );
  return {
    ...state,
    dice: { ...state.dice, [dieId]: { ...die, slots } },
    players: { ...state.players, [faceOwner]: { ...owner, facePool: pool } },
  };
}

function showingInActions(state: GameState, slot: number, playerId: PlayerId = P1): GameState {
  return withDie(withPhase(asActive(state, playerId), "actions"), dieIdOf(state, playerId), {
    rolledSlotIndex: slot,
  });
}

function rollShowingSlot(state: GameState, slot: number, playerId: PlayerId = P1): GameState {
  let rolled = asActive(withPhase(state, "roll"), playerId);
  rolled = withDie(rolled, dieIdOf(rolled, playerId, 0), { retained: true, rolledSlotIndex: slot });
  rolled = withDie(rolled, dieIdOf(rolled, playerId, 1), { retained: true, rolledSlotIndex: 0 });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId }));
}

function endTurn(state: GameState, playerId: PlayerId): GameState {
  return expectOk(
    advance(withPhase(asActive(state, playerId), "actions"), { type: "END_TURN", playerId }),
  );
}

describe("Forbidden Heritage stay (cannot-replace-by-forge)", () => {
  it("refuses FORGE_CARD over Forbidden Heritage", () => {
    const ready = installFromPool(actionsReady([ECLIPSE]), FORBIDDEN_HERITAGE, { slot: 4 });
    const dieId = dieIdOf(ready);
    const heritage = ready.dice[dieId]?.slots[4];
    expect(heritage).toBeDefined();
    if (heritage === undefined) return;
    expect(slotCannotBeReplacedByForge(heritage)).toBe(true);
    const refused = advance(ready, forgeAction(ready, P1, handCardIdAt(ready, P1, 0), dieId, [4]));
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.error).toBe("INVALID_FACE");
    expect(refused.state).toBe(ready);
  });

  it("refuses forge-faces over Forbidden Heritage", () => {
    const withFh = installFromPool(
      actionsReady([RITUAL_OF_CONTAMINATION]),
      FORBIDDEN_HERITAGE,
      { dieOwner: P2, faceOwner: P2, slot: 4 },
    );
    const ready = withFh;
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("forge-faces");
    const dieId = dieIdOf(played, P2);
    const refused = advance(played, {
      type: "RESOLVE_FORGE_FACES",
      playerId: P1,
      dieId,
      slotIndexes: [4],
      faceCardId: syntheticFaceId("corruption"),
    });
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.error).toBe("INVALID_FACE");
    expect(refused.state).toBe(played);
    expect(refused.state.dice[dieId]?.slots[4]?.faceCardId).toBe(FORBIDDEN_HERITAGE);
  });

  it("refuses replace-synthetic-face over Forbidden Heritage", () => {
    const installed = installFromPool(actionsReady([]), FORBIDDEN_HERITAGE, { slot: 2 });
    const pending: GameState = {
      ...installed,
      pendingDecision: {
        type: "replace-synthetic-face",
        controllerId: P1,
        kind: "synthetic",
        attribute: "corruption",
      },
    };
    const refused = advance(pending, {
      type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
      playerId: P1,
      dieId: dieIdOf(pending),
      slotIndex: 2,
      faceCardId: syntheticFaceId("corruption"),
    });
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.error).toBe("INVALID_FACE");
    expect(refused.state).toBe(pending);
  });

  it("still peels Forbidden Heritage with ACTIVATE_FACE", () => {
    const ready = showingInActions(
      installFromPool(newMatch(), FORBIDDEN_HERITAGE, { slot: 0 }),
      0,
    );
    const after = expectOk(
      advance(ready, {
        type: "ACTIVATE_FACE",
        playerId: P1,
        dieId: dieIdOf(ready),
        slotIndex: 0,
      }),
    );
    expect(after.dice[dieIdOf(after)]?.slots[0]?.faceCardId).toBe(SHIELD_FACE_ID);
    expect(after.players[P1]?.facePool).toContain(FORBIDDEN_HERITAGE);
    expect(eventTypes(after)).not.toContain("face-forged");
  });
});

describe("Pestilent Plague spread at 2", () => {
  it("spreads onto an adjacent slot at 2 counters, not 5", () => {
    const seeded = installFromPool(newMatch(), PESTILENT_PLAGUE, {
      slot: 1,
      extra: { pestilenceCounters: 1 },
    });
    const after = rollShowingSlot(seeded, 1);
    const die = after.dice[dieIdOf(after)];
    expect(die?.slots[1]?.pestilenceCounters).toBe(0);
    const spreadTo = [0, 2].find((index) => die?.slots[index]?.faceCardId === PESTILENT_PLAGUE);
    expect(spreadTo).toBeDefined();
    expect(eventTypes(after)).toContain("face-forged");
  });

  it("does not spread after a single counter (threshold is 2)", () => {
    const seeded = installFromPool(newMatch(), PESTILENT_PLAGUE, { slot: 1 });
    const after = rollShowingSlot(seeded, 1);
    const die = after.dice[dieIdOf(after)];
    expect(die?.slots[1]?.pestilenceCounters).toBe(1);
    expect(die?.slots[0]?.faceCardId).not.toBe(PESTILENT_PLAGUE);
    expect(die?.slots[2]?.faceCardId).not.toBe(PESTILENT_PLAGUE);
  });

  it("skips an adjacent slot that cannot be replaced and tries the other", () => {
    let state = installFromPool(newMatch(), PESTILENT_PLAGUE, {
      slot: 1,
      extra: { pestilenceCounters: 1 },
    });
    state = installFromPool(state, FORBIDDEN_HERITAGE, { slot: 0 });
    const after = rollShowingSlot(state, 1);
    const die = after.dice[dieIdOf(after)];
    expect(die?.slots[0]?.faceCardId).toBe(FORBIDDEN_HERITAGE);
    expect(die?.slots[2]?.faceCardId).toBe(PESTILENT_PLAGUE);
    expect(die?.slots[2]?.faceCardOwnerId).toBe(P1);
  });

  it("uses the corrupter pool / faceCardOwnerId when spreading on the opponent's die", () => {
    const state = installFromPool(newMatch(), PESTILENT_PLAGUE, {
      dieOwner: P2,
      faceOwner: P1,
      slot: 1,
      extra: { pestilenceCounters: 1, forgeLockRemaining: 2 },
    });
    const p2PoolBefore = [...(state.players[P2]?.facePool ?? [])];
    expect(p2PoolBefore).toContain(PESTILENT_PLAGUE);
    const after = rollShowingSlot(state, 1, P2);
    const die = after.dice[dieIdOf(after, P2)];
    const spreadTo = [0, 2].find((index) => die?.slots[index]?.faceCardId === PESTILENT_PLAGUE);
    expect(spreadTo).toBeDefined();
    expect(die?.slots[spreadTo ?? 0]?.faceCardOwnerId).toBe(P1);
    expect(after.players[P2]?.facePool).toEqual(p2PoolBefore);
    expect(die?.slots[1]?.forgeLockRemaining).toBe(4);
    expect(die?.slots[spreadTo ?? 0]?.forgeLockRemaining).toBe(4);
  });
});

describe("Pestilent Plague forge-lock", () => {
  it("starts lock at 4 on player-install and refuses FORGE_CARD while lock > 0", () => {
    const ready = actionsReady([LATENT_CORRUPTION]);
    const dieId = dieIdOf(ready);
    const installed = expectOk(
      advance(ready, {
        type: "FORGE_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        dieId,
        slotIndexes: [4],
        faceCardId: PESTILENT_PLAGUE,
      }),
    );
    expect(installed.dice[dieId]?.slots[4]?.faceCardId).toBe(PESTILENT_PLAGUE);
    expect(installed.dice[dieId]?.slots[4]?.forgeLockRemaining).toBe(4);

    const locked = withHand(withPhase(asActive(installed, P1), "actions"), P1, [ECLIPSE]);
    const refused = advance(
      locked,
      forgeAction(locked, P1, handCardIdAt(locked, P1, 0), dieId, [4]),
    );
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    expect(refused.error).toBe("INVALID_FACE");
    expect(refused.state).toBe(locked);
  });

  it("allows FORGE_CARD over Pestilent Plague once lock is 0", () => {
    const expired = installFromPool(actionsReady([ECLIPSE]), PESTILENT_PLAGUE, {
      slot: 4,
      extra: { forgeLockRemaining: 0 },
    });
    const dieId = dieIdOf(expired);
    const forged = expectOk(
      advance(expired, forgeAction(expired, P1, handCardIdAt(expired, P1, 0), dieId, [4])),
    );
    expect(forged.dice[dieId]?.slots[4]?.faceCardId).toBe(syntheticFaceId("darkness"));
  });

  it("illegal vs legal snapshots: remaining lock vs expired", () => {
    const base = installFromPool(actionsReady([ECLIPSE]), PESTILENT_PLAGUE, { slot: 4 });
    const dieId = dieIdOf(base);
    const locked = withDie(base, dieId, {
      slots: base.dice[dieId]!.slots.map((slot) =>
        slot.index === 4 ? { ...slot, forgeLockRemaining: 1 } : slot,
      ),
    });
    const expired = withDie(base, dieId, {
      slots: base.dice[dieId]!.slots.map((slot) =>
        slot.index === 4 ? { ...slot, forgeLockRemaining: 0 } : slot,
      ),
    });
    const refuse = advance(
      locked,
      forgeAction(locked, P1, handCardIdAt(locked, P1, 0), dieId, [4]),
    );
    expect(refuse.ok).toBe(false);
    if (!refuse.ok) {
      expect(refuse.state).toBe(locked);
    }
    const allow = expectOk(
      advance(expired, forgeAction(expired, P1, handCardIdAt(expired, P1, 0), dieId, [4])),
    );
    expect(allow.dice[dieId]?.slots[4]?.faceCardId).toBe(syntheticFaceId("darkness"));
  });

  it("installing a new PP resets remaining lock to 4 on every PP slot of that die", () => {
    const withFirst = installFromPool(actionsReady([LATENT_CORRUPTION]), PESTILENT_PLAGUE, {
      slot: 0,
      extra: { forgeLockRemaining: 1 },
    });
    const dieId = dieIdOf(withFirst);
    const after = expectOk(
      advance(withFirst, {
        type: "FORGE_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(withFirst, P1, 0),
        dieId,
        slotIndexes: [2],
        faceCardId: PESTILENT_PLAGUE,
      }),
    );
    expect(after.dice[dieId]?.slots[0]?.faceCardId).toBe(PESTILENT_PLAGUE);
    expect(after.dice[dieId]?.slots[2]?.faceCardId).toBe(PESTILENT_PLAGUE);
    expect(after.dice[dieId]?.slots[0]?.forgeLockRemaining).toBe(4);
    expect(after.dice[dieId]?.slots[2]?.forgeLockRemaining).toBe(4);
  });

  it("installing a non-PP face does not reset PP locks on the same die", () => {
    const withPp = installFromPool(actionsReady([ECLIPSE]), PESTILENT_PLAGUE, {
      slot: 0,
      extra: { forgeLockRemaining: 2 },
    });
    const dieId = dieIdOf(withPp);
    const after = expectOk(
      advance(withPp, forgeAction(withPp, P1, handCardIdAt(withPp, P1, 0), dieId, [4])),
    );
    expect(after.dice[dieId]?.slots[0]?.forgeLockRemaining).toBe(2);
    expect(after.dice[dieId]?.slots[4]?.faceCardId).toBe(syntheticFaceId("darkness"));
  });

  it("ACTIVATE_FACE still removes PP while lock > 0", () => {
    const ready = showingInActions(
      installFromPool(newMatch(), PESTILENT_PLAGUE, {
        slot: 0,
        extra: { forgeLockRemaining: 4 },
      }),
      0,
    );
    const after = expectOk(
      advance(ready, {
        type: "ACTIVATE_FACE",
        playerId: P1,
        dieId: dieIdOf(ready),
        slotIndex: 0,
      }),
    );
    expect(after.dice[dieIdOf(after)]?.slots[0]?.faceCardId).toBe(SHIELD_FACE_ID);
    expect(after.dice[dieIdOf(after)]?.slots[0]?.forgeLockRemaining).toBe(0);
    expect(after.players[P1]?.facePool).toContain(PESTILENT_PLAGUE);
  });

  it("decrements on the die owner's END_TURN and not the opponent's", () => {
    const seeded = installFromPool(newMatch(), PESTILENT_PLAGUE, {
      slot: 4,
      extra: { forgeLockRemaining: 4 },
    });
    const afterOwner = endTurn(seeded, P1);
    expect(afterOwner.dice[dieIdOf(afterOwner)]?.slots[4]?.forgeLockRemaining).toBe(3);

    const afterOpponent = endTurn(afterOwner, P2);
    expect(afterOpponent.dice[dieIdOf(afterOpponent, P1)]?.slots[4]?.forgeLockRemaining).toBe(3);
  });
});
