import { describe, expect, it } from "vitest";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import { createDraft } from "../reducer/draft.js";
import { swapCreaturePositions } from "../reducer/creaturePositions.js";
import { createMatch } from "../setup/createMatch.js";
import {
  TEST_BODY_A,
  TEST_BODY_B,
  TEST_FACE_DECK,
  TEST_LEGEND,
  TEST_SQUAD,
  TEST_STARTING_DICE,
} from "../testing/fixtures/index.js";
import { creatureIdAt, newMatch, P1, P2, withDefeatedCreature } from "../testing/scenario.js";
import { backRowCreatures, frontlineLaneSlots } from "./lanes.js";
import {
  canTargetCreature,
  legalSplitDamageTargets,
  legalTargetsFor,
  targetingError,
  type SplitDamagePending,
} from "./targeting.js";

const MELEE = { range: false } as const;
const RANGE = { range: true } as const;

function splitPending(
  overrides: Partial<SplitDamagePending> & Pick<SplitDamagePending, "attackerId" | "range">,
): SplitDamagePending {
  return {
    type: "split-damage",
    controllerId: P1,
    amount: 3,
    maxTargets: 2,
    sourceCreatureId: overrides.attackerId,
    ...overrides,
  };
}

describe("setup lanes", () => {
  it("assigns columns 0 then 1 to non-legendaries in squad order", () => {
    const state = newMatch();
    expect(state.creatures[creatureIdAt(state, P1, 0)]?.lane).toBe(0);
    expect(state.creatures[creatureIdAt(state, P1, 1)]?.lane).toBe(1);
    expect(state.creatures[creatureIdAt(state, P1, 2)]?.lane).toBeNull();
  });

  it("still places a leading legendary in back with null lane", () => {
    const state = createMatch({
      matchId: "m",
      seed: 1,
      config: { ...DEFAULT_RULES_CONFIG, deckMinCards: 0 },
      players: [
        {
          id: P1,
          squad: [TEST_LEGEND, TEST_BODY_A, TEST_BODY_B],
          deck: [],
          faceDeck: TEST_FACE_DECK,
          startingDice: TEST_STARTING_DICE,
        },
        {
          id: P2,
          squad: TEST_SQUAD,
          deck: [],
          faceDeck: TEST_FACE_DECK,
          startingDice: TEST_STARTING_DICE,
        },
      ],
    });
    const rows = state.players[P1]?.creatureIds.map((id) => ({
      definitionId: state.creatures[id]?.definitionId,
      position: state.creatures[id]?.position,
      lane: state.creatures[id]?.lane,
    }));
    expect(rows).toEqual([
      { definitionId: TEST_LEGEND, position: "back", lane: null },
      { definitionId: TEST_BODY_A, position: "frontline", lane: 0 },
      { definitionId: TEST_BODY_B, position: "frontline", lane: 1 },
    ]);
  });
});

describe("lane combat targeting", () => {
  it("lets a frontliner attack only the enemy in the same lane", () => {
    const state = newMatch();
    const attacker = creatureIdAt(state, P1, 0);
    const sameLane = creatureIdAt(state, P2, 0);
    const otherLane = creatureIdAt(state, P2, 1);
    const legend = creatureIdAt(state, P2, 2);
    expect(canTargetCreature(state, attacker, MELEE, sameLane)).toBe(true);
    expect(targetingError(state, attacker, MELEE, otherLane)).toBe("INVALID_TARGET");
    expect(targetingError(state, attacker, MELEE, legend)).toBe("INVALID_TARGET");
    expect(legalTargetsFor(state, attacker, MELEE)).toEqual([sameLane]);
  });

  it("lets the legendary attack either living enemy frontliner", () => {
    const state = newMatch();
    const attacker = creatureIdAt(state, P1, 2);
    expect(canTargetCreature(state, attacker, MELEE, creatureIdAt(state, P2, 0))).toBe(true);
    expect(canTargetCreature(state, attacker, MELEE, creatureIdAt(state, P2, 1))).toBe(true);
    expect(targetingError(state, attacker, MELEE, creatureIdAt(state, P2, 2))).toBe("INVALID_TARGET");
  });

  it("lets a facing attacker hit the legendary after a same-lane breach", () => {
    const base = newMatch();
    const seeded = withDefeatedCreature(base, creatureIdAt(base, P2, 0));
    const attacker = creatureIdAt(seeded, P1, 0);
    const otherFront = creatureIdAt(seeded, P2, 1);
    const legend = creatureIdAt(seeded, P2, 2);
    expect(canTargetCreature(seeded, attacker, MELEE, legend)).toBe(true);
    expect(targetingError(seeded, attacker, MELEE, otherFront)).toBe("INVALID_TARGET");
    expect(targetingError(seeded, creatureIdAt(seeded, P1, 1), MELEE, legend)).toBe("INVALID_TARGET");
    expect(canTargetCreature(seeded, creatureIdAt(seeded, P1, 2), MELEE, legend)).toBe(true);
  });

  it("opens the legendary to melee once both frontline lanes are empty", () => {
    let state = newMatch();
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 0));
    state = withDefeatedCreature(state, creatureIdAt(state, P2, 1));
    expect(
      canTargetCreature(state, creatureIdAt(state, P1, 0), MELEE, creatureIdAt(state, P2, 2)),
    ).toBe(true);
  });

  it("does not compact the surviving frontliner's lane after a defeat", () => {
    const base = newMatch();
    const lane0 = creatureIdAt(base, P2, 0);
    const lane1 = creatureIdAt(base, P2, 1);
    const state = withDefeatedCreature(base, lane0);
    expect(state.creatures[lane1]?.lane).toBe(1);
    expect(frontlineLaneSlots(state, P2)).toEqual([null, state.creatures[lane1]]);
  });

  it("lets Range ignore lane facing and occupied frontline seats", () => {
    const state = newMatch();
    const attacker = creatureIdAt(state, P1, 0);
    expect(canTargetCreature(state, attacker, RANGE, creatureIdAt(state, P2, 1))).toBe(true);
    expect(canTargetCreature(state, attacker, RANGE, creatureIdAt(state, P2, 2))).toBe(true);
  });

  it("keeps friendly, defeated, and unknown errors", () => {
    const state = newMatch();
    const attacker = creatureIdAt(state, P1, 0);
    expect(targetingError(state, attacker, MELEE, creatureIdAt(state, P1, 1))).toBe("INVALID_TARGET");
    const defeated = withDefeatedCreature(state, creatureIdAt(state, P2, 0));
    expect(targetingError(defeated, attacker, MELEE, creatureIdAt(defeated, P2, 0))).toBe(
      "CREATURE_DEFEATED",
    );
    expect(targetingError(state, attacker, MELEE, "creature-missing" as never)).toBe("UNKNOWN_ENTITY");
  });
});

describe("frontlineLaneSlots", () => {
  it("returns living occupants without packing left", () => {
    const state = newMatch();
    const [a, b] = frontlineLaneSlots(state, P1);
    expect(a?.id).toBe(creatureIdAt(state, P1, 0));
    expect(b?.id).toBe(creatureIdAt(state, P1, 1));
    expect(backRowCreatures(state, P1).map((creature) => creature.id)).toEqual([
      creatureIdAt(state, P1, 2),
    ]);
  });
});

describe("legalSplitDamageTargets", () => {
  it("follows lane combat when the pending names an attacker", () => {
    const state = newMatch();
    const attacker = creatureIdAt(state, P1, 0);
    const legal = legalSplitDamageTargets(state, splitPending({ attackerId: attacker, range: false }));
    expect(legal).toEqual([creatureIdAt(state, P2, 0)]);
  });

  it("allows any living creature when attackerId is null", () => {
    const state = newMatch();
    const legal = legalSplitDamageTargets(state, splitPending({ attackerId: null, range: false }));
    expect(legal).toHaveLength(6);
  });
});

describe("swap lane seats (ASSUMED)", () => {
  it("keeps a non-legendary's lane when swapping with the legendary", () => {
    const state = newMatch();
    const body = creatureIdAt(state, P1, 0);
    const legend = creatureIdAt(state, P1, 2);
    const draft = createDraft(state);
    swapCreaturePositions(draft, legend, body);
    expect(draft.creatures[body]?.position).toBe("back");
    expect(draft.creatures[body]?.lane).toBe(0);
    expect(draft.creatures[legend]?.position).toBe("frontline");
    expect(draft.creatures[legend]?.lane).toBe(0);
  });

  it("treats a lane-null non-legendary as having no facing column", () => {
    const state = newMatch();
    const body = creatureIdAt(state, P1, 0);
    const legend = creatureIdAt(state, P1, 2);
    const draft = createDraft(state);
    swapCreaturePositions(draft, legend, body);
    const swappedOntoLegendSeat = {
      ...state,
      creatures: {
        ...draft.creatures,
        [body]: { ...draft.creatures[body]!, lane: null },
      },
    };
    expect(
      targetingError(swappedOntoLegendSeat, body, MELEE, creatureIdAt(swappedOntoLegendSeat, P2, 0)),
    ).toBe("INVALID_TARGET");
    expect(
      canTargetCreature(swappedOntoLegendSeat, body, MELEE, creatureIdAt(swappedOntoLegendSeat, P2, 2)),
    ).toBe(false);
    const breached = withDefeatedCreature(
      swappedOntoLegendSeat,
      creatureIdAt(swappedOntoLegendSeat, P2, 1),
    );
    expect(canTargetCreature(breached, body, MELEE, creatureIdAt(breached, P2, 2))).toBe(true);
  });
});
