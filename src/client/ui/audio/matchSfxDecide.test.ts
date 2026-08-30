import { describe, expect, it } from "vitest";
import {
  advance,
  asAttackId,
  asPlayerId,
  type GameAction,
  type GameState,
  type LoggedEvent,
  type PlayerId,
} from "@server";
import {
  creatureIdAt,
  expectOk,
  newMatch,
  withPile,
  withHand,
  withPhase,
  withTokens,
} from "@server/testing/scenario.js";
import { matchSfxCuesFor } from "./matchSfxDecide.js";

const P1 = asPlayerId("p1");
const P2 = asPlayerId("p2");

function stateOf(args: {
  readonly matchId?: string;
  readonly activePlayerId?: PlayerId;
  readonly pending?: GameState["pendingDecision"];
  readonly log?: readonly LoggedEvent[];
}): GameState {
  return {
    matchId: args.matchId ?? "match-1",
    activePlayerId: args.activePlayerId ?? P1,
    pendingDecision: args.pending ?? null,
    log: args.log ?? [],
  } as GameState;
}

function turnEnded(playerId: PlayerId, seq: number): LoggedEvent {
  return { seq, turn: 1, event: { type: "turn-ended", playerId } };
}

const endTurnP1: GameAction = { type: "END_TURN", playerId: P1 };

function openedEmptyPriority(): GameState {
  const base = withPhase(newMatch(), "actions");
  const attacker = creatureIdAt(base, P1, 0);
  const target = creatureIdAt(base, P2, 0);
  const combat = withHand(
    withPile(withTokens(base, attacker, { martial: 2 }), P2, 10),
    P2,
    [],
  );
  return expectOk(
    advance(combat, {
      type: "ATTACK",
      playerId: P1,
      attackerId: attacker,
      attackId: asAttackId("attack-minotaur-heavy-axe"),
      targetId: target,
    }),
  );
}

describe("matchSfxCuesFor — end turn", () => {
  it("plays on successful END_TURN in hotseat", () => {
    expect(
      matchSfxCuesFor({
        prevState: stateOf({}),
        state: stateOf({ activePlayerId: P2, log: [turnEnded(P1, 1)] }),
        action: endTurnP1,
        accepted: true,
        mode: "local",
        localPlayerId: null,
      }),
    ).toEqual(["end-turn"]);
  });

  it("plays for the local online seat via action", () => {
    expect(
      matchSfxCuesFor({
        prevState: stateOf({}),
        state: stateOf({ activePlayerId: P2, log: [turnEnded(P1, 1)] }),
        action: endTurnP1,
        accepted: true,
        mode: "host",
        localPlayerId: P1,
      }),
    ).toEqual(["end-turn"]);
  });

  it("mutes online when another seat ended the turn", () => {
    expect(
      matchSfxCuesFor({
        prevState: stateOf({}),
        state: stateOf({ activePlayerId: P1, log: [turnEnded(P2, 1)] }),
        action: { type: "END_TURN", playerId: P2 },
        accepted: true,
        mode: "client",
        localPlayerId: P1,
      }),
    ).toEqual([]);
  });

  it("mutes spectators online", () => {
    expect(
      matchSfxCuesFor({
        prevState: stateOf({}),
        state: stateOf({ activePlayerId: P2, log: [turnEnded(P1, 1)] }),
        action: endTurnP1,
        accepted: true,
        mode: "host",
        localPlayerId: null,
      }),
    ).toEqual([]);
  });

  it("ignores rejected actions", () => {
    expect(
      matchSfxCuesFor({
        prevState: stateOf({}),
        state: stateOf({}),
        action: endTurnP1,
        accepted: false,
        mode: "local",
        localPlayerId: null,
      }),
    ).toEqual([]);
  });
});

describe("matchSfxCuesFor — reaction priority", () => {
  const priorityP2 = {
    type: "reaction-priority" as const,
    priorityPlayerId: P2,
    consecutivePasses: 0,
  };

  it("plays in hotseat when a reaction window opens", () => {
    expect(
      matchSfxCuesFor({
        prevState: stateOf({ pending: null }),
        state: stateOf({ pending: priorityP2 }),
        action: null,
        accepted: true,
        mode: "local",
        localPlayerId: null,
      }),
    ).toEqual(["priority"]);
  });

  it("plays online only when the local seat gains priority", () => {
    expect(
      matchSfxCuesFor({
        prevState: stateOf({ pending: null }),
        state: stateOf({ pending: priorityP2 }),
        action: null,
        accepted: true,
        mode: "client",
        localPlayerId: P2,
      }),
    ).toEqual(["priority"]);
    expect(
      matchSfxCuesFor({
        prevState: stateOf({ pending: null }),
        state: stateOf({ pending: priorityP2 }),
        action: null,
        accepted: true,
        mode: "client",
        localPlayerId: P1,
      }),
    ).toEqual([]);
  });

  it("plays again when priority passes to the other seat", () => {
    expect(
      matchSfxCuesFor({
        prevState: stateOf({ pending: priorityP2 }),
        state: stateOf({
          pending: {
            type: "reaction-priority",
            priorityPlayerId: P1,
            consecutivePasses: 1,
          },
        }),
        action: { type: "PASS_PRIORITY", playerId: P2 },
        accepted: true,
        mode: "local",
        localPlayerId: null,
      }),
    ).toEqual(["priority"]);
  });

  it("does not re-fire while the same seat still holds priority", () => {
    expect(
      matchSfxCuesFor({
        prevState: stateOf({ pending: priorityP2 }),
        state: stateOf({
          pending: { ...priorityP2, consecutivePasses: 0 },
        }),
        action: null,
        accepted: true,
        mode: "local",
        localPlayerId: null,
      }),
    ).toEqual([]);
  });

  it("does not play when the priority seat has no legal Respond offer", () => {
    const opened = openedEmptyPriority();
    expect(opened.pendingDecision?.type).toBe("reaction-priority");
    expect(
      matchSfxCuesFor({
        prevState: { ...opened, pendingDecision: null },
        state: opened,
        action: null,
        accepted: true,
        mode: "local",
        localPlayerId: null,
      }),
    ).toEqual([]);
  });
});
