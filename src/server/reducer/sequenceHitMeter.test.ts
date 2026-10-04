import { describe, expect, it } from "vitest";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import type { DieFaceLayout } from "../model/dice.js";
import type { CreatureDefinitionId, DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { advance } from "./reduce.js";
import {
  asTestAttackId,
  asTestCreatureId,
  asTestFaceId,
  TEST_BODY_B,
  TEST_LEGEND,
  testAttack,
  testCard,
  testCreature,
  testFace,
} from "../testing/fixtures/index.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withHand,
} from "../testing/scenario.js";

const LIGHT = asTestFaceId("seq-meter-light");
const HEAVY_FACE = asTestFaceId("seq-meter-heavy-face");
const FIGHTER = asTestCreatureId("seq-meter-fighter");

const NEGATE = testCard({
  id: "card-test-negate-sequence-hit",
  name: "Negate Hit",
  type: "response",
  subtypes: [],
  rulesText: "Negate that hit.",
  effect: { effects: [{ type: "negate-card", cardTypes: "any" }] },
});

const CONFIG = {
  ...DEFAULT_RULES_CONFIG,
  deckMinCards: 0,
  deckOutEnabled: false,
  consumeDiceOnFaceActions: true,
  maxFacesOfSameAttributePerDie: 6,
  startingMaxOnRollFacesPerDie: 6,
  faceDeckMaxCards: 24,
  faceDeckMaxPerAttribute: 12,
};

function install(): void {
  testFace({
    id: LIGHT,
    name: "Light Jab",
    faceType: "attack",
    hitStrength: "light",
    hitType: "punch",
    sequenceRole: "starter",
    primaryEffects: [{ type: "damage", amount: 2, target: { kind: "declared-target" } }],
  });
  testFace({
    id: HEAVY_FACE,
    name: "Heavy Face",
    faceType: "attack",
    hitStrength: "heavy",
    hitType: "kick",
    sequenceRole: "starter",
    primaryEffects: [{ type: "damage", amount: 1, target: { kind: "declared-target" } }],
  });
  testCreature({
    id: FIGHTER,
    name: "Meter Fighter",
    life: 20,
    attacks: [
      testAttack({
        id: asTestAttackId("seq-meter-stub"),
        name: "Stub",
        effect: { type: "damage", amount: 1, target: { kind: "declared-target" } },
      }),
    ],
    techniques: [
      {
        id: "technique-seq-meter-medium",
        name: "Medium Punch",
        primaryFaceId: HEAVY_FACE,
        hitStrength: "medium",
        hitType: "punch",
        secondary: { faceType: "attack" },
        sequenceRole: "starter",
        effects: [{ type: "damage", amount: 5, target: { kind: "declared-target" } }],
      },
    ],
  });
}

const LIGHT_DIE: DieFaceLayout = [LIGHT, LIGHT, LIGHT, LIGHT, LIGHT, LIGHT];
const TECHNIQUE_DIE: DieFaceLayout = [HEAVY_FACE, LIGHT, LIGHT, LIGHT, LIGHT, LIGHT];
const SQUAD: readonly CreatureDefinitionId[] = [FIGHTER, TEST_BODY_B, TEST_LEGEND];

function opened(layout: DieFaceLayout): GameState {
  install();
  const state = newMatch({
    config: CONFIG,
    players: [
      {
        id: P1,
        squad: SQUAD,
        deck: [],
        faceDeck: [LIGHT, HEAVY_FACE],
        startingDice: [layout, layout],
      },
      {
        id: P2,
        squad: SQUAD,
        deck: [],
        faceDeck: [LIGHT, HEAVY_FACE],
        startingDice: [layout, layout],
      },
    ],
  });
  return show(show(state, P1, 0, 0), P1, 1, 1);
}

function show(
  state: GameState,
  playerId: typeof P1 | typeof P2,
  dieIndex: number,
  slotIndex: number,
): GameState {
  const id = dieIdAt(state, playerId, dieIndex);
  const die = state.dice[id];
  if (die === undefined) throw new Error("missing die");
  return {
    ...state,
    phase: "actions",
    dice: { ...state.dice, [id]: { ...die, rolledSlotIndex: slotIndex } },
  };
}

function dieIdAt(state: GameState, playerId: typeof P1 | typeof P2, index: number): DieId {
  return state.players[playerId]!.dieIds[index] as DieId;
}

function activeId(state: GameState, playerId: typeof P1 | typeof P2) {
  return state.players[playerId]!.activeCreatureId;
}

function meterDeltas(state: GameState, playerId: typeof P1 | typeof P2): number[] {
  return state.log.flatMap((entry) =>
    entry.event.type === "meter-changed" && entry.event.playerId === playerId
      ? [entry.event.delta]
      : [],
  );
}

describe("sequence hit meter", () => {
  it("grants 2 to the aggressor and 1 to the defender on a light face hit", () => {
    const state = opened(LIGHT_DIE);
    const resolved = resolveOpenChain(
      expectOk(
        advance(state, {
          type: "USE_FACE",
          playerId: P1,
          creatureId: activeId(state, P1),
        }),
      ),
    );
    expect(resolved.players[P1]?.meter).toBe(2);
    expect(resolved.players[P2]?.meter).toBe(1);
    expect(meterDeltas(resolved, P1)).toEqual([2]);
    expect(meterDeltas(resolved, P2)).toEqual([1]);
    expect(resolved.players[P1]?.comboCount).toBe(0);
    expect(resolved.creatures[activeId(resolved, P2)]?.damage).toBe(2);
  });

  it("grants 3 and 1 from a medium technique, not the face strength", () => {
    const state = opened(TECHNIQUE_DIE);
    const declared = expectOk(
      advance(state, {
        type: "USE_TECHNIQUE",
        playerId: P1,
        creatureId: activeId(state, P1),
        techniqueId: "technique-seq-meter-medium",
        secondaryDieId: dieIdAt(state, P1, 1),
      }),
    );
    expect(declared.chainStack.at(-1)?.hitStrength).toBe("medium");
    const resolved = resolveOpenChain(declared);
    expect(resolved.players[P1]?.meter).toBe(3);
    expect(resolved.players[P2]?.meter).toBe(1);
    expect(meterDeltas(resolved, P1)).toEqual([3]);
    expect(meterDeltas(resolved, P2)).toEqual([1]);
    expect(resolved.players[P1]?.comboCount).toBe(0);
    expect(resolved.creatures[activeId(resolved, P2)]?.damage).toBe(5);
  });

  it("grants nothing when the hit is negated", () => {
    const state = withHand(opened(LIGHT_DIE), P2, [NEGATE.id]);
    const declared = expectOk(
      advance(state, {
        type: "USE_FACE",
        playerId: P1,
        creatureId: activeId(state, P1),
      }),
    );
    const yielded = expectOk(advance(declared, { type: "PASS_PRIORITY", playerId: P1 }));
    const answered = expectOk(
      advance(yielded, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(yielded, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(answered);
    expect(resolved.players[P1]?.meter).toBe(0);
    expect(resolved.players[P2]?.meter).toBe(0);
    expect(meterDeltas(resolved, P1)).toEqual([]);
    expect(meterDeltas(resolved, P2)).toEqual([]);
    expect(resolved.creatures[activeId(resolved, P2)]?.damage).toBe(0);
    expect(resolved.players[P1]?.comboCount).toBe(0);
  });
});
