import { describe, expect, it } from "vitest";
import { asPlayerId, type GameState, type PlayerId } from "@/game";
import {
  actingPlayerIdOf,
  localSeatCanAct,
  localSeatIsPendingChooser,
  pendingChooserId,
  reactionPriorityOf,
  seatedAction,
} from "./seatGate.js";

const P1 = asPlayerId("p1");
const P2 = asPlayerId("p2");

function stateOf(args: {
  readonly activePlayerId: PlayerId;
  readonly pending?: GameState["pendingDecision"];
}): GameState {
  return {
    activePlayerId: args.activePlayerId,
    pendingDecision: args.pending ?? null,
  } as GameState;
}

describe("seatGate — reaction-priority vs missing controllerId", () => {
  const p1TurnP2Priority = stateOf({
    activePlayerId: P1,
    pending: {
      type: "reaction-priority",
      priorityPlayerId: P2,
      consecutivePasses: 0,
    },
  });

  it("reads priority from priorityPlayerId, not activePlayerId", () => {
    expect(reactionPriorityOf(p1TurnP2Priority)).toBe(P2);
    expect(actingPlayerIdOf(p1TurnP2Priority)).toBe(P2);
    expect(pendingChooserId(p1TurnP2Priority)).toBe(P2);
  });

  it("lets the guest (P2) act and choose while they hold priority", () => {
    expect(localSeatCanAct(true, P2, p1TurnP2Priority)).toBe(true);
    expect(localSeatIsPendingChooser(true, P2, p1TurnP2Priority)).toBe(true);
  });

  it("does not treat missing controllerId as everyone-can-choose (the stuck case)", () => {
    // Old MatchBoard: `"controllerId" in pending` is false → chooser null →
    // isPendingChooser true for P1, while canAct stayed false. Pass/Respond
    // and the hand dock then disagreed, and P2 could be stranded.
    expect("controllerId" in (p1TurnP2Priority.pendingDecision ?? {})).toBe(false);
    expect(localSeatIsPendingChooser(true, P1, p1TurnP2Priority)).toBe(false);
    expect(localSeatCanAct(true, P1, p1TurnP2Priority)).toBe(false);
  });

  it("locks an online seat with no bound playerId", () => {
    expect(localSeatCanAct(true, null, p1TurnP2Priority)).toBe(false);
    expect(localSeatIsPendingChooser(true, null, p1TurnP2Priority)).toBe(false);
  });

  it("stamps guest intents with the bound seat even if the UI claimed the turn player", () => {
    const claimedTurnPlayer = seatedAction(true, P2, {
      type: "PASS_PRIORITY",
      playerId: P1,
    });
    expect(claimedTurnPlayer.playerId).toBe(P2);
  });
});

describe("seatGate — non-reaction pending chooser vs turn player", () => {
  const p2TurnP1Chooses = stateOf({
    activePlayerId: P2,
    pending: {
      type: "choose-creature",
      controllerId: P1,
      filter: "enemy",
      deferred: {} as never,
    },
  });

  it("treats the pending controller as the acting seat, not the turn player", () => {
    expect(reactionPriorityOf(p2TurnP1Chooses)).toBeNull();
    expect(pendingChooserId(p2TurnP1Chooses)).toBe(P1);
    expect(actingPlayerIdOf(p2TurnP1Chooses)).toBe(P1);
  });

  it("lets the online chooser act even when they are not the turn player", () => {
    expect(localSeatCanAct(true, P1, p2TurnP1Chooses)).toBe(true);
    expect(localSeatIsPendingChooser(true, P1, p2TurnP1Chooses)).toBe(true);
  });

  it("locks the online turn player while the opponent owns the pending choice", () => {
    expect(localSeatCanAct(true, P2, p2TurnP1Chooses)).toBe(false);
    expect(localSeatIsPendingChooser(true, P2, p2TurnP1Chooses)).toBe(false);
  });
});
