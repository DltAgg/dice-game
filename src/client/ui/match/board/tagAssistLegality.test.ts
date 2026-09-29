import { describe, expect, it } from "vitest";
import { TAG_FIGHTER_RULES } from "@server";
import type { CreatureId, GameState, PlayerId } from "@server";
import { canDeclareTag } from "./tagAssistLegality";

const P1 = "p1" as PlayerId;
const ACTIVE = "active" as CreatureId;
const RESERVE = "reserve" as CreatureId;

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    status: "in-progress",
    phase: "actions",
    pendingDecision: null,
    activePlayerId: P1,
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
  it("refuses TAG without meter when Active die does not show tag", () => {
    expect(canDeclareTag(baseState(), P1, RESERVE)).toBe(false);
  });

  it("allows TAG when meter covers tag cancel", () => {
    const state = baseState();
    const player = state.players[P1]!;
    const next = {
      ...state,
      players: {
        ...state.players,
        [P1]: { ...player, meter: TAG_FIGHTER_RULES.tagCancelMeterCost },
      },
    };
    expect(canDeclareTag(next, P1, RESERVE)).toBe(true);
  });
});
