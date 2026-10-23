import { describe, expect, it } from "vitest";
import { TAG_FIGHTER_RULES } from "@server";
import type { CreatureId, GameState, PlayerId } from "@server";
import { testCreature } from "@server/testing/fixtures/index.js";
import {
  assistControlEnabled,
  canDeclareAssist,
  canDeclareTag,
  seatMayPressTag,
} from "./tagAssistLegality";

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

const P2 = "p2" as PlayerId;
const ASSIST_DEF = testCreature({
  id: "creature-test-assist-window",
  exceptionalAssistMeter: 0,
  assistEffects: [{ type: "draw-cards", amount: 1 }],
  attacks: [],
});

function assistState(overrides: Partial<GameState> = {}): GameState {
  const creatures = {
    [ACTIVE]: { id: ACTIVE, ownerId: P1, defeated: false, definitionId: ASSIST_DEF.id },
    [RESERVE]: { id: RESERVE, ownerId: P1, defeated: false, definitionId: ASSIST_DEF.id },
  } as unknown as GameState["creatures"];
  return baseState({
    chainStack: [],
    creatures,
    ...overrides,
  });
}

describe("tagAssistLegality", () => {
  it("allows a free opening Tag with no Tag face and no Meter", () => {
    expect(canDeclareTag(baseState(), P1, RESERVE)).toBe(true);
  });

  it("refuses Tag in on a locked Reserve and still allows Assist", () => {
    const state = assistState({ turn: 2 });
    const creatures = {
      ...state.creatures,
      [RESERVE]: { ...state.creatures[RESERVE]!, tagInLockedUntilTurn: 4 },
    } as GameState["creatures"];
    const locked = { ...state, creatures };
    expect(canDeclareTag(locked, P1, RESERVE)).toBe(false);
    expect(canDeclareAssist(locked, P1, RESERVE)).toBe(true);
    expect(canDeclareTag({ ...locked, turn: 4 }, P1, RESERVE)).toBe(true);
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

  it("allows Assist on your turn with 0 Meter and no Assist face", () => {
    const state = assistState();
    expect(canDeclareAssist(state, P1, RESERVE)).toBe(true);
    expect(assistControlEnabled(state, P1, RESERVE, true)).toBe(true);
    expect(canDeclareAssist(state, P1, ACTIVE)).toBe(false);
  });

  it("allows a KOed Reserve to Assist", () => {
    const state = assistState();
    const reserve = state.creatures[RESERVE]!;
    const knocked = assistState({
      creatures: {
        ...state.creatures,
        [RESERVE]: { ...reserve, defeated: true },
      },
    });
    expect(canDeclareAssist(knocked, P1, RESERVE)).toBe(true);
  });

  it("allows Assist when the defender has priority against an opponent hit", () => {
    const state = assistState({
      activePlayerId: P2,
      pendingDecision: {
        type: "reaction-priority",
        priorityPlayerId: P1,
        consecutivePasses: 1,
      },
      chainStack: [
        {
          kind: "combat-action",
          controllerId: P2,
          sequenceRole: "starter",
        },
      ] as unknown as GameState["chainStack"],
    });
    expect(canDeclareAssist(state, P1, RESERVE)).toBe(true);
    expect(assistControlEnabled(state, P1, RESERVE, false)).toBe(true);
    expect(canDeclareAssist(state, P2, RESERVE)).toBe(false);
  });

  it("refuses Assist against your own hit and when exceptional Meter is unpaid", () => {
    const ownHit = assistState({
      pendingDecision: {
        type: "reaction-priority",
        priorityPlayerId: P1,
        consecutivePasses: 0,
      },
      chainStack: [
        {
          kind: "combat-action",
          controllerId: P1,
          sequenceRole: "starter",
        },
      ] as unknown as GameState["chainStack"],
    });
    expect(canDeclareAssist(ownHit, P1, RESERVE)).toBe(false);

    const costly = testCreature({
      id: "creature-test-assist-costly",
      exceptionalAssistMeter: 3,
      assistEffects: [{ type: "draw-cards", amount: 1 }],
      attacks: [],
    });
    const broke = assistState();
    const reserve = broke.creatures[RESERVE]!;
    const unpaid = assistState({
      creatures: {
        ...broke.creatures,
        [RESERVE]: { ...reserve, definitionId: costly.id },
      },
    });
    expect(canDeclareAssist(unpaid, P1, RESERVE)).toBe(false);
    const player = unpaid.players[P1]!;
    const paid = assistState({
      ...unpaid,
      players: { ...unpaid.players, [P1]: { ...player, meter: 3 } },
    });
    expect(canDeclareAssist(paid, P1, RESERVE)).toBe(true);
  });
});
