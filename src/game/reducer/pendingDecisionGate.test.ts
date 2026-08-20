import { describe, expect, it } from "vitest";
import { ARCANE_SILENCE, ECLIPSE, LIVING_LIBRARY } from "../content/cards.js";
import { BLIGHT, HEXBRAND } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import { asCardInstanceId, asSymbolInstanceId, type CardId, type DieId, type FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { ritualsOf } from "../rules/cards.js";
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
  withEnergy,
  withHand,
  withPhase,
  withTokens,
} from "../testing/scenario.js";

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

function installFace(
  state: GameState,
  faceCardId: FaceCardId,
  opts: { readonly playerId?: typeof P1 | typeof P2; readonly dieIndex?: number; readonly slot?: number } = {},
): GameState {
  const playerId = opts.playerId ?? P1;
  const dieId = dieIdOf(state, playerId, opts.dieIndex ?? 0);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
  const slot = opts.slot ?? 0;
  const slots = die.slots.map((entry, index) =>
    index === slot ? { ...entry, faceCardId, faceCardOwnerId: playerId } : entry,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function asTurn(state: GameState, playerId: typeof P1 | typeof P2): GameState {
  return { ...withEnergy(state, playerId, 10), activePlayerId: playerId };
}

/** Retain-roll so slot 0 shows the installed face; the other die shows slot 0. */
function rollShowingSlot(state: GameState, slot: number, playerId: typeof P1 | typeof P2 = P1): GameState {
  let rolled = withPhase(asTurn(state, playerId), "roll");
  rolled = withDie(rolled, dieIdOf(rolled, playerId, 0), {
    retained: true,
    rolledSlotIndex: slot,
  });
  rolled = withDie(rolled, dieIdOf(rolled, playerId, 1), {
    retained: true,
    rolledSlotIndex: 0,
  });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId }));
}

function absorbShowing(
  state: GameState,
  faceSymbol: string,
  playerId: typeof P1 | typeof P2,
): GameState {
  const dieId = dieIdOf(state, playerId);
  const symbol = Object.values(state.symbols).find(
    (entry) =>
      entry.symbol === faceSymbol &&
      entry.status === "rolled" &&
      entry.sourceDieId === dieId &&
      entry.usable !== false,
  );
  if (symbol === undefined) throw new Error(`expected ${faceSymbol}`);
  return expectOk(
    advance(state, {
      type: "ABSORB_SYMBOL",
      playerId,
      creatureId: creatureIdAt(state, playerId, 0),
      symbolId: symbol.id,
    }),
  );
}

function withOpponentRitual(
  state: GameState,
  ownerId: typeof P1 | typeof P2,
  cardId: CardId,
): GameState {
  const id = asCardInstanceId(`given-${ownerId}-ritual-${cardId}`);
  const player = state.players[ownerId];
  if (player === undefined) throw new Error("test: no player");
  return {
    ...state,
    cards: {
      ...state.cards,
      [id]: {
        id,
        cardId,
        ownerId,
        zone: "ritual" as const,
        attachedToCreatureId: null,
        attachedToFaceCardId: null,
        ritualOrientation: "ready" as const,
        ritualProgress: { arcane: 2 },
        ritualProgressCreditedThisTurn: [],
      },
    },
    players: {
      ...state.players,
      [ownerId]: {
        ...player,
        ritual: [...player.ritual, id],
      },
    },
  };
}

function expectPendingDecision(result: ReturnType<typeof advance>, original: GameState): void {
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error).toBe("PENDING_DECISION");
  expect(result.state).toBe(original);
}

describe("pending-decision gate — non-active chooser", () => {
  it("lets a non-active controller RESOLVE_CHOOSE_CREATURE (Hexbrand on-roll)", () => {
    const enemyId = creatureIdAt(newMatch(), P2, 0);
    let state = withTokens(installFace(newMatch(), HEXBRAND), enemyId, { martial: 1 });
    state = rollShowingSlot(state, 0);
    expect(state.pendingDecision).toMatchObject({
      type: "choose-creature",
      controllerId: P1,
    });

    // Corruption-install freeze: choice opened, then it is the opponent's turn.
    const onP2Turn = asTurn(state, P2);
    expect(onP2Turn.activePlayerId).toBe(P2);
    expect(onP2Turn.pendingDecision).toMatchObject({ controllerId: P1 });

    const resolved = expectOk(
      advance(onP2Turn, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: enemyId,
      }),
    );
    expect(resolved.pendingDecision).toBeNull();
    expect(resolved.creatures[enemyId]?.attributeTokens.martial ?? 0).toBe(0);
    expect(eventTypes(resolved)).toContain("choose-creature-resolved");
    expect(resolved.activePlayerId).toBe(P2);

    const ended = advance(resolved, { type: "END_TURN", playerId: P2 });
    expect(ended.ok).toBe(true);
  });

  it("lets Hexbrand on P2's die resolve when P2 rolls", () => {
    const enemyId = creatureIdAt(newMatch(), P1, 0);
    let state = withTokens(installFace(newMatch(), HEXBRAND, { playerId: P2 }), enemyId, {
      martial: 1,
    });
    state = rollShowingSlot(state, 0, P2);
    expect(state.activePlayerId).toBe(P2);
    expect(state.pendingDecision).toMatchObject({
      type: "choose-creature",
      controllerId: P2,
    });

    const resolved = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P2,
        creatureId: enemyId,
      }),
    );
    expect(resolved.pendingDecision).toBeNull();
    expect(resolved.creatures[enemyId]?.attributeTokens.martial ?? 0).toBe(0);
  });

  it("blocks the turn player (and matching RESOLVE) while the opponent owns the pending", () => {
    const enemyId = creatureIdAt(newMatch(), P2, 0);
    let state = withTokens(installFace(newMatch(), HEXBRAND), enemyId, { martial: 1 });
    state = rollShowingSlot(state, 0);
    const waiting = withHand(asTurn(state, P2), P2, [ECLIPSE]);
    const p2Creature = creatureIdAt(waiting, P2, 0);

    expectPendingDecision(advance(waiting, { type: "END_TURN", playerId: P2 }), waiting);
    expectPendingDecision(
      advance(waiting, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(waiting, P2, 0),
      }),
      waiting,
    );
    expectPendingDecision(
      advance(waiting, {
        type: "ABSORB_SYMBOL",
        playerId: P2,
        creatureId: p2Creature,
        symbolId: asSymbolInstanceId("sym-not-real"),
      }),
      waiting,
    );
    expectPendingDecision(
      advance(waiting, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P2,
        creatureId: enemyId,
      }),
      waiting,
    );
  });

  it("still lets the active chooser resolve and still blocks the opponent", () => {
    const enemyId = creatureIdAt(newMatch(), P2, 0);
    let state = withTokens(installFace(newMatch(), HEXBRAND), enemyId, { martial: 1 });
    state = rollShowingSlot(state, 0);
    expect(state.activePlayerId).toBe(P1);
    expect(state.pendingDecision).toMatchObject({ controllerId: P1 });

    expectPendingDecision(advance(state, { type: "END_TURN", playerId: P1 }), state);
    expectPendingDecision(
      advance(state, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P2,
        creatureId: enemyId,
      }),
      state,
    );
    expectPendingDecision(advance(state, { type: "END_TURN", playerId: P2 }), state);

    const resolved = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: enemyId,
      }),
    );
    expect(resolved.pendingDecision).toBeNull();
    expect(resolved.activePlayerId).toBe(P1);
    const ended = advance(resolved, { type: "END_TURN", playerId: P1 });
    expect(ended.ok).toBe(true);
  });

  it("lets a non-active controller RESOLVE_CHOOSE_RITUAL (Blight on-absorb)", () => {
    let state = withOpponentRitual(installFace(newMatch(), BLIGHT), P2, LIVING_LIBRARY);
    const ritualId = ritualsOf(state, P2)[0]?.id;
    if (ritualId === undefined) throw new Error("test: no ritual");
    state = absorbShowing(rollShowingSlot(state, 0), "corruption", P1);
    expect(state.pendingDecision).toMatchObject({
      type: "choose-ritual",
      controllerId: P1,
    });

    const onP2Turn = asTurn(state, P2);
    const resolved = expectOk(
      advance(onP2Turn, {
        type: "RESOLVE_CHOOSE_RITUAL",
        playerId: P1,
        cardInstanceId: ritualId,
      }),
    );
    expect(resolved.pendingDecision).toBeNull();
    expect(ritualsOf(resolved, P2)).toHaveLength(0);
  });

  it("lets Blight on P2's die resolve when P2 absorbs", () => {
    let state = withOpponentRitual(installFace(newMatch(), BLIGHT, { playerId: P2 }), P1, LIVING_LIBRARY);
    const ritualId = ritualsOf(state, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("test: no ritual");
    state = absorbShowing(rollShowingSlot(state, 0, P2), "corruption", P2);
    expect(state.activePlayerId).toBe(P2);
    expect(state.pendingDecision).toMatchObject({
      type: "choose-ritual",
      controllerId: P2,
    });

    const resolved = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_RITUAL",
        playerId: P2,
        cardInstanceId: ritualId,
      }),
    );
    expect(resolved.pendingDecision).toBeNull();
    expect(ritualsOf(resolved, P1)).toHaveLength(0);
  });
});

describe("pending-decision gate — reaction priority", () => {
  const actionsReady = (cards: Parameters<typeof withHand>[2], energy = 10) =>
    withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

  it("still lets the non-active priority seat pass and respond", () => {
    const state = withHand(actionsReady([ECLIPSE]), P2, [ARCANE_SILENCE]);
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

    const p1End = advance(opened, { type: "END_TURN", playerId: P1 });
    expect(p1End.ok).toBe(false);
    if (!p1End.ok) expect(p1End.error).toBe("NOT_PRIORITY_PLAYER");
    expect(p1End.state).toBe(opened);

    const p2End = advance(opened, { type: "END_TURN", playerId: P2 });
    expect(p2End.ok).toBe(false);
    if (!p2End.ok) expect(p2End.error).toBe("PENDING_DECISION");
    expect(p2End.state).toBe(opened);

    const passed = expectOk(advance(opened, { type: "PASS_PRIORITY", playerId: P2 }));
    expect(passed.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P1,
      consecutivePasses: 1,
    });

    const silenced = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    expect(silenced.chainStack).toHaveLength(2);

    const drained = resolveOpenChain(passed);
    expect(drained.pendingDecision).toBeNull();
  });
});
