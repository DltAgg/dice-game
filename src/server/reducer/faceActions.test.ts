import { describe, expect, it } from "vitest";
import { getFaceCard } from "../content/faces.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import type { DieFaceLayout } from "../model/dice.js";
import type { CreatureDefinitionId, DieId, FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { createDraft } from "./draft.js";
import { grantMeter, setMeter, spendMeter } from "./meter.js";
import { advance } from "./reduce.js";
import {
  clampMeter,
  legalFaceActions,
  matchingTechniques,
  meterOf,
  secondaryDiceFor,
} from "../index.js";
import {
  asTestAttackId,
  asTestCreatureId,
  asTestFaceId,
  TEST_BODY_B,
  TEST_LEGEND,
  testAttack,
  testCreature,
  testFace,
} from "../testing/fixtures/index.js";
import { expectOk, newMatch, P1, P2 } from "../testing/scenario.js";

/** Overlay mirror of catalogue Grappler (live JSON stays in content/). */
const LARIAT = asTestFaceId("grappler-lariat");
const JAB = asTestFaceId("grappler-jab");
const COMMAND_GRAB = asTestFaceId("grappler-command-grab");
const GUARD = asTestFaceId("grappler-guard");
const MOVEMENT = asTestFaceId("grappler-movement");
const TAG = asTestFaceId("grappler-tag");
const GRAPPLER = asTestCreatureId("grappler");

const CONFIG = {
  ...DEFAULT_RULES_CONFIG,
  deckMinCards: 0,
  consumeDiceOnFaceActions: true,
  maxFacesOfSameAttributePerDie: 6,
  startingMaxOnRollFacesPerDie: 6,
  faceDeckMaxCards: 24,
  faceDeckMaxPerAttribute: 12,
};

function installGrapplerCatalogue(): void {
  testFace({
    id: LARIAT,
    name: "Lariat",
    kind: "natural",
    symbol: "martial",
    faceType: "attack",
    primaryEffects: [{ type: "damage", amount: 2, target: { kind: "declared-target" } }],
    secondaryEffects: [{ type: "next-attack-bonus", amount: 1 }],
  });
  testFace({
    id: JAB,
    name: "Jab",
    kind: "natural",
    symbol: "martial",
    faceType: "attack",
    primaryEffects: [{ type: "damage", amount: 1, target: { kind: "declared-target" } }],
    secondaryEffects: [{ type: "damage", amount: 1, target: { kind: "declared-target" } }],
  });
  testFace({
    id: COMMAND_GRAB,
    name: "Command Grab",
    kind: "natural",
    symbol: "martial",
    faceType: "grab",
    primaryEffects: [{ type: "damage", amount: 1, target: { kind: "declared-target" } }],
    secondaryEffects: [{ type: "next-attack-bonus", amount: 1 }],
  });
  testFace({
    id: GUARD,
    name: "Guard",
    kind: "natural",
    symbol: "martial",
    faceType: "guard",
    primaryEffects: [
      { type: "grant-shield", amount: 1, target: { kind: "source-creature" } },
    ],
    secondaryEffects: [
      { type: "grant-shield", amount: 1, target: { kind: "source-creature" } },
    ],
  });
  testFace({
    id: MOVEMENT,
    name: "Movement",
    kind: "natural",
    symbol: "martial",
    faceType: "movement",
    primaryEffects: [],
    secondaryEffects: [],
  });
  testFace({
    id: TAG,
    name: "Tag",
    kind: "natural",
    symbol: "martial",
    faceType: "tag",
    primaryEffects: [],
    secondaryEffects: [],
  });
  testCreature({
    id: GRAPPLER,
    name: "Grappler",
    life: 16,
    attributes: ["martial"],
    attacks: [
      testAttack({
        id: asTestAttackId("grappler-stub"),
        name: "Stub",
        effect: { type: "damage", amount: 1, target: { kind: "declared-target" } },
      }),
    ],
    techniques: [
      {
        id: "technique-grappler-power-lariat",
        name: "Power Lariat",
        primaryFaceId: LARIAT,
        secondary: { faceType: "grab" },
        effects: [{ type: "damage", amount: 3, target: { kind: "declared-target" } }],
      },
      {
        id: "technique-grappler-lariat-guard",
        name: "Lariat Guard",
        primaryFaceId: LARIAT,
        secondary: { faceType: "guard" },
        effects: [{ type: "damage", amount: 2, target: { kind: "declared-target" } }],
      },
      {
        id: "technique-grappler-jab-command",
        name: "Jab Command",
        primaryFaceId: JAB,
        secondary: { faceId: COMMAND_GRAB },
        effects: [{ type: "damage", amount: 2, target: { kind: "declared-target" } }],
      },
    ],
  });
}

const GRAPPLER_DIE: DieFaceLayout = [LARIAT, JAB, COMMAND_GRAB, GUARD, MOVEMENT, TAG];
const SECONDARY_DIE: DieFaceLayout = [COMMAND_GRAB, GUARD, LARIAT, JAB, MOVEMENT, TAG];
const SQUAD: readonly CreatureDefinitionId[] = [GRAPPLER, TEST_BODY_B, TEST_LEGEND];
const FACE_DECK = [
  LARIAT,
  LARIAT,
  JAB,
  JAB,
  COMMAND_GRAB,
  COMMAND_GRAB,
  GUARD,
  GUARD,
  MOVEMENT,
  MOVEMENT,
  TAG,
  TAG,
] as const;

function grapplerMatch(): GameState {
  installGrapplerCatalogue();
  return newMatch({
    config: CONFIG,
    players: [
      {
        id: P1,
        squad: SQUAD,
        deck: [],
        faceDeck: FACE_DECK,
        startingDice: [GRAPPLER_DIE, SECONDARY_DIE],
      },
      {
        id: P2,
        squad: SQUAD,
        deck: [],
        faceDeck: FACE_DECK,
        startingDice: [GRAPPLER_DIE, SECONDARY_DIE],
      },
    ],
  });
}

function show(
  state: GameState,
  playerId: typeof P1 | typeof P2,
  dieIndex: number,
  slotIndex: number,
): GameState {
  const id = state.players[playerId]?.dieIds[dieIndex] as DieId;
  const die = state.dice[id];
  if (die === undefined) throw new Error("missing die");
  return {
    ...state,
    phase: "actions",
    dice: { ...state.dice, [id]: { ...die, rolledSlotIndex: slotIndex } },
  };
}

function activeId(state: GameState, playerId: typeof P1 | typeof P2) {
  return state.players[playerId]!.activeCreatureId;
}

function dieIdAt(state: GameState, playerId: typeof P1 | typeof P2, index: number): DieId {
  return state.players[playerId]!.dieIds[index] as DieId;
}

function damageOf(state: GameState, playerId: typeof P1 | typeof P2): number {
  return state.creatures[activeId(state, playerId)]?.damage ?? 0;
}

function shieldsOf(state: GameState, playerId: typeof P1 | typeof P2): number {
  return state.creatures[activeId(state, playerId)]?.shields ?? 0;
}

describe("029 fighter combat core", () => {
  it("Grappler die has named typed faces with primary/secondary", () => {
    installGrapplerCatalogue();
    expect(getFaceCard(LARIAT)?.faceType).toBe("attack");
    expect(getFaceCard(LARIAT)?.primaryEffects?.[0]).toMatchObject({
      type: "damage",
      amount: 2,
    });
    expect(getFaceCard(COMMAND_GRAB)?.faceType).toBe("grab");
    expect(getFaceCard(COMMAND_GRAB)?.secondaryEffects?.[0]).toMatchObject({
      type: "next-attack-bonus",
      amount: 1,
    });
    const state = grapplerMatch();
    const primary = state.dice[dieIdAt(state, P1, 0)]!;
    expect(primary.slots.map((slot) => slot.faceCardId)).toEqual([
      LARIAT,
      JAB,
      COMMAND_GRAB,
      GUARD,
      MOVEMENT,
      TAG,
    ]);
  });

  it("USE_FACE resolves Lariat Primary (deal 2)", () => {
    let state = grapplerMatch();
    state = show(state, P1, 0, 0);
    const before = damageOf(state, P2);
    const meterBefore = meterOf(state, P1);
    const result = expectOk(
      advance(state, { type: "USE_FACE", playerId: P1, creatureId: activeId(state, P1) }),
    );
    expect(damageOf(result, P2)).toBe(before + 2);
    expect(meterOf(result, P1)).toBe(meterBefore);
    expect(legalFaceActions(result, P1)).toEqual([]);
  });

  it("Power Lariat + Grab-type applies base 3 + Grab Secondary (+1 damage)", () => {
    let state = grapplerMatch();
    state = show(state, P1, 0, 0);
    state = show(state, P1, 1, 0);
    const before = damageOf(state, P2);
    const meterBefore = meterOf(state, P1);
    const matches = matchingTechniques(state, P1, activeId(state, P1));
    expect(matches.some((m) => m.techniqueId === "technique-grappler-power-lariat")).toBe(true);
    const result = expectOk(
      advance(state, {
        type: "USE_TECHNIQUE",
        playerId: P1,
        creatureId: activeId(state, P1),
        techniqueId: "technique-grappler-power-lariat",
        secondaryDieId: dieIdAt(state, P1, 1),
      }),
    );
    expect(damageOf(result, P2)).toBe(before + 4);
    expect(meterOf(result, P1)).toBe(meterBefore);
  });

  it("Lariat + Guard resolves differently (damage 2 + self Shield)", () => {
    let state = grapplerMatch();
    state = show(state, P1, 0, 0);
    state = show(state, P1, 1, 1);
    const beforeDmg = damageOf(state, P2);
    const beforeShield = shieldsOf(state, P1);
    const result = expectOk(
      advance(state, {
        type: "USE_TECHNIQUE",
        playerId: P1,
        creatureId: activeId(state, P1),
        techniqueId: "technique-grappler-lariat-guard",
        secondaryDieId: dieIdAt(state, P1, 1),
      }),
    );
    expect(damageOf(result, P2)).toBe(beforeDmg + 2);
    expect(shieldsOf(result, P1)).toBe(beforeShield + 1);
  });

  it("specific-face secondary requirement (Jab + Command Grab id)", () => {
    let state = grapplerMatch();
    state = show(state, P1, 0, 1);
    state = show(state, P1, 1, 0);
    const before = damageOf(state, P2);
    const result = expectOk(
      advance(state, {
        type: "USE_TECHNIQUE",
        playerId: P1,
        creatureId: activeId(state, P1),
        techniqueId: "technique-grappler-jab-command",
        secondaryDieId: dieIdAt(state, P1, 1),
      }),
    );
    expect(damageOf(result, P2)).toBe(before + 3);
  });

  it("ordered primary role: Grab on own die + Lariat secondary does not fire Power Lariat", () => {
    let state = grapplerMatch();
    state = show(state, P1, 0, 2);
    state = show(state, P1, 1, 2);
    const matches = matchingTechniques(state, P1, activeId(state, P1));
    expect(matches.some((m) => m.techniqueId === "technique-grappler-power-lariat")).toBe(false);
    const failed = advance(state, {
      type: "USE_TECHNIQUE",
      playerId: P1,
      creatureId: activeId(state, P1),
      techniqueId: "technique-grappler-power-lariat",
      secondaryDieId: dieIdAt(state, P1, 1),
    });
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.state).toBe(state);
      expect(failed.error).toBe("ATTACK_NOT_FUELLED");
    }
  });

  it("illegal: wrong face, unrolled die, same die as secondary, non-matching secondary", () => {
    let state = grapplerMatch();
    state = show(state, P1, 0, 4);
    const noPrimary = advance(state, {
      type: "USE_FACE",
      playerId: P1,
      creatureId: activeId(state, P1),
    });
    expect(noPrimary.ok).toBe(false);
    if (!noPrimary.ok) expect(noPrimary.state).toBe(state);

    let unrolled = grapplerMatch();
    unrolled = { ...unrolled, phase: "actions" };
    const unrolledFail = advance(unrolled, {
      type: "USE_FACE",
      playerId: P1,
      creatureId: activeId(unrolled, P1),
    });
    expect(unrolledFail.ok).toBe(false);
    if (!unrolledFail.ok) expect(unrolledFail.state).toBe(unrolled);

    let same = grapplerMatch();
    same = show(same, P1, 0, 0);
    same = show(same, P1, 1, 0);
    const sameFail = advance(same, {
      type: "USE_TECHNIQUE",
      playerId: P1,
      creatureId: activeId(same, P1),
      techniqueId: "technique-grappler-power-lariat",
      secondaryDieId: dieIdAt(same, P1, 0),
    });
    expect(sameFail.ok).toBe(false);
    if (!sameFail.ok) {
      expect(sameFail.state).toBe(same);
      expect(sameFail.error).toBe("INVALID_TARGET");
    }

    let mismatch = grapplerMatch();
    mismatch = show(mismatch, P1, 0, 0);
    mismatch = show(mismatch, P1, 1, 1);
    const mismatchFail = advance(mismatch, {
      type: "USE_TECHNIQUE",
      playerId: P1,
      creatureId: activeId(mismatch, P1),
      techniqueId: "technique-grappler-power-lariat",
      secondaryDieId: dieIdAt(mismatch, P1, 1),
    });
    expect(mismatchFail.ok).toBe(false);
    if (!mismatchFail.ok) {
      expect(mismatchFail.state).toBe(mismatch);
      expect(mismatchFail.error).toBe("ATTACK_NOT_FUELLED");
    }
  });

  it("Meter query / grant / spend / set clamp; new actions do not change Meter", () => {
    const state = grapplerMatch();
    expect(meterOf(state, P1)).toBe(0);
    expect(clampMeter(99, 8)).toBe(8);
    expect(clampMeter(-3, 8)).toBe(0);

    const draft = createDraft(state);
    grantMeter(draft, P1, 3);
    expect(draft.players[P1]?.meter).toBe(3);
    setMeter(draft, P1, 100);
    expect(draft.players[P1]?.meter).toBe(draft.config.meterCap);
    expect(spendMeter(draft, P1, 2)).toBeNull();
    expect(draft.players[P1]?.meter).toBe(draft.config.meterCap - 2);
    expect(spendMeter(draft, P1, 99)).toBe("INSUFFICIENT_METER");

    let play = grapplerMatch();
    play = {
      ...play,
      players: { ...play.players, [P1]: { ...play.players[P1]!, meter: 5 } },
    };
    play = show(play, P1, 0, 0);
    const afterFace = expectOk(
      advance(play, { type: "USE_FACE", playerId: P1, creatureId: activeId(play, P1) }),
    );
    expect(meterOf(afterFace, P1)).toBe(5);

    let tech = grapplerMatch();
    tech = {
      ...tech,
      players: { ...tech.players, [P1]: { ...tech.players[P1]!, meter: 4 } },
    };
    tech = show(tech, P1, 0, 0);
    tech = show(tech, P1, 1, 0);
    const afterTech = expectOk(
      advance(tech, {
        type: "USE_TECHNIQUE",
        playerId: P1,
        creatureId: activeId(tech, P1),
        techniqueId: "technique-grappler-power-lariat",
        secondaryDieId: dieIdAt(tech, P1, 1),
      }),
    );
    expect(meterOf(afterTech, P1)).toBe(4);
  });

  it("extensibility: second fixture fighter uses the same code path", () => {
    const strikerFace = asTestFaceId("fixture-striker-slash");
    const boostFace = asTestFaceId("fixture-striker-boost");
    const fillerA = asTestFaceId("fixture-striker-a");
    const fillerB = asTestFaceId("fixture-striker-b");
    const fillerC = asTestFaceId("fixture-striker-c");
    const fillerD = asTestFaceId("fixture-striker-d");
    const striker = asTestCreatureId("fixture-striker");

    testFace({
      id: strikerFace,
      name: "Slash",
      kind: "natural",
      symbol: "wild",
      faceType: "attack",
      primaryEffects: [{ type: "damage", amount: 3, target: { kind: "declared-target" } }],
      secondaryEffects: [],
    });
    testFace({
      id: boostFace,
      name: "Boost",
      kind: "natural",
      symbol: "wild",
      faceType: "grab",
      primaryEffects: [],
      secondaryEffects: [{ type: "next-attack-bonus", amount: 2 }],
    });
    for (const id of [fillerA, fillerB, fillerC, fillerD] as const) {
      testFace({
        id,
        name: "Filler",
        kind: "natural",
        symbol: "wild",
        faceType: "movement",
        primaryEffects: [],
        secondaryEffects: [],
      });
    }
    testCreature({
      id: striker,
      name: "Striker",
      life: 12,
      attributes: ["wild"],
      attacks: [
        testAttack({
          id: asTestAttackId("fixture-striker-stub"),
          name: "Stub",
          effect: { type: "damage", amount: 1, target: { kind: "declared-target" } },
        }),
      ],
      techniques: [
        {
          id: "technique-fixture-striker-power-slash",
          name: "Power Slash",
          primaryFaceId: strikerFace as FaceCardId,
          secondary: { faceType: "grab" },
          effects: [{ type: "damage", amount: 2, target: { kind: "declared-target" } }],
        },
      ],
    });

    const dieA: DieFaceLayout = [
      strikerFace as FaceCardId,
      fillerA as FaceCardId,
      fillerB as FaceCardId,
      fillerC as FaceCardId,
      fillerD as FaceCardId,
      fillerA as FaceCardId,
    ];
    const dieB: DieFaceLayout = [
      boostFace as FaceCardId,
      fillerA as FaceCardId,
      fillerB as FaceCardId,
      fillerC as FaceCardId,
      fillerD as FaceCardId,
      fillerA as FaceCardId,
    ];
    const faceDeck = [
      strikerFace,
      boostFace,
      fillerA,
      fillerB,
      fillerC,
      fillerD,
      boostFace,
      fillerA,
      fillerB,
      fillerC,
      fillerD,
      fillerA,
    ] as FaceCardId[];

    let state = newMatch({
      config: CONFIG,
      players: [
        {
          id: P1,
          squad: [striker, TEST_BODY_B, TEST_LEGEND],
          deck: [],
          faceDeck,
          startingDice: [dieA, dieB],
        },
        {
          id: P2,
          squad: [striker, TEST_BODY_B, TEST_LEGEND],
          deck: [],
          faceDeck,
          startingDice: [dieA, dieB],
        },
      ],
    });
    state = show(state, P1, 0, 0);
    state = show(state, P1, 1, 0);
    expect(secondaryDiceFor(state, P1, dieIdAt(state, P1, 0))).toContain(dieIdAt(state, P1, 1));
    const before = damageOf(state, P2);
    const result = expectOk(
      advance(state, {
        type: "USE_TECHNIQUE",
        playerId: P1,
        creatureId: activeId(state, P1),
        techniqueId: "technique-fixture-striker-power-slash",
        secondaryDieId: dieIdAt(state, P1, 1),
      }),
    );
    expect(damageOf(result, P2)).toBe(before + 4);
  });
});
