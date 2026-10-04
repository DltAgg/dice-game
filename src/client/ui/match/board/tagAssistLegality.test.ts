import { describe, expect, it } from "vitest";
import { TAG_FIGHTER_RULES } from "@server";
import type { CreatureId, GameState, PlayerId } from "@server";
import { canDeclareTag, seatMayPressTag } from "./tagAssistLegality";

const P1 = "p1" as PlayerId;
const ACTIVE = "active" as CreatureId;
const RESERVE = "reserve" as CreatureId;

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    status: "in-progress",
    phase: "actions",
    pendingDecision: null,
    activePlayerId: P1,
    actEngaged: false,
    offensiveState: "open",
    aggressorPlayerId: P1,
    chainStack: [],
    log: [],
    config: TAG_FIGHTER_RULES,
    players: {
      [P1]: {
        activeCreatureId: ACTIVE,
        meter: 0,
        creatureIds: [ACTIVE, RESERVE],
        dieIds: [],
        spentOncePerTurnKeys: [],
      },
    },
    dice: {},
    creatures: {
      [ACTIVE]: { id: ACTIVE, ownerId: P1, defeated: false },
      [RESERVE]: { id: RESERVE, ownerId: P1, defeated: false },
    },
    ...overrides,
  } as unknown as GameState;
}

describe("tagAssistLegality", () => {
  it("allows a free opening Tag with no Tag face and no Meter", () => {
    expect(canDeclareTag(baseState(), P1, RESERVE)).toBe(true);
  });

  it("allows a closing Tag while the sequence can still continue", () => {
    const state = baseState({
      actEngaged: true,
      offensiveState: "combo",
      aggressorPlayerId: P1,
    });
    expect(canDeclareTag(state, P1, RESERVE)).toBe(true);
  });

  it("refuses Tag after an Act that is not a stop", () => {
    expect(canDeclareTag(baseState({ actEngaged: true, offensiveState: "open" }), P1, RESERVE)).toBe(
      false,
    );
  });

  it("refuses Tag once tag-this-turn is spent", () => {
    const state = baseState();
    const player = state.players[P1]!;
    const spent = {
      ...state,
      players: {
        ...state.players,
        [P1]: { ...player, spentOncePerTurnKeys: ["tag-this-turn"] },
      },
    };
    expect(canDeclareTag(spent, P1, RESERVE)).toBe(false);
  });

  it("lets the row's seat press Tag when that seat is not the acting player", () => {
    const other = "p2" as PlayerId;
    expect(seatMayPressTag(false, null, P1)).toBe(true);
    expect(seatMayPressTag(true, null, P1)).toBe(false);
    expect(seatMayPressTag(true, P1, P1)).toBe(true);
    expect(seatMayPressTag(false, other, P1)).toBe(false);
  });
});
