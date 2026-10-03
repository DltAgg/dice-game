import { describe, expect, it } from "vitest";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import type { DieFaceLayout } from "../model/dice.js";
import type { CreatureDefinitionId, DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { canRerollDice } from "../rules/offensive.js";
import { legalFaceActions } from "../rules/faceActions.js";
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
  advanceResolvingChain,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withHand,
} from "../testing/scenario.js";

const JAB = asTestFaceId("seq-jab");
const METER_JAB = asTestFaceId("seq-meter-jab");
const LARIAT = asTestFaceId("seq-lariat");
const FINISH = asTestFaceId("seq-finish");
const GRAB = asTestFaceId("seq-grab");
const GUARD = asTestFaceId("seq-guard");
const FIGHTER = asTestCreatureId("seq-fighter");

const REVERSAL = testCard({
  id: "card-test-reversal",
  name: "Reversal",
  type: "reaction",
  subtypes: [],
  attribute: "martial",
  playCost: { martial: 2 },
  seizesOffense: true,
  rulesText: "Seize the offense.",
  effect: {
    effects: [{ type: "damage", amount: 1, target: { kind: "declared-target" } }],
  },
});

const ANSWER = testCard({
  id: "card-test-answer",
  name: "Answer",
  type: "reaction",
  subtypes: [],
  attribute: "martial",
  playCost: { martial: 2 },
  rulesText: "Respond.",
  effect: { effects: [{ type: "draw-cards", amount: 1 }] },
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
    id: JAB,
    name: "Jab",
    kind: "natural",
    symbol: "martial",
    faceType: "attack",
    sequenceRole: "starter",
    primaryEffects: [{ type: "damage", amount: 2, target: { kind: "declared-target" } }],
  });
  testFace({
    id: METER_JAB,
    name: "Meter Jab",
    kind: "natural",
    symbol: "martial",
    faceType: "attack",
    sequenceRole: "starter",
    meterCost: 2,
    meterGain: 1,
    primaryEffects: [{ type: "damage", amount: 2, target: { kind: "declared-target" } }],
  });
  testFace({
    id: LARIAT,
    name: "Lariat",
    kind: "natural",
    symbol: "martial",
    faceType: "attack",
    sequenceRole: "extender",
    primaryEffects: [{ type: "damage", amount: 1, target: { kind: "declared-target" } }],
    secondaryEffects: [{ type: "next-attack-bonus", amount: 1 }],
  });
  testFace({
    id: FINISH,
    name: "Finisher",
    kind: "natural",
    symbol: "martial",
    faceType: "attack",
    sequenceRole: "finisher",
    primaryEffects: [{ type: "damage", amount: 3, target: { kind: "declared-target" } }],
    secondaryEffects: [{ type: "next-attack-bonus", amount: 1 }],
  });
  testFace({
    id: GRAB,
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
    secondaryEffects: [
      { type: "grant-shield", amount: 1, target: { kind: "source-creature" } },
    ],
  });
  testCreature({
    id: FIGHTER,
    name: "Sequence Fighter",
    life: 20,
    attributes: ["martial"],
    attacks: [
      testAttack({
        id: asTestAttackId("seq-stub"),
        name: "Stub",
        effect: { type: "damage", amount: 1, target: { kind: "declared-target" } },
      }),
    ],
    techniques: [
      {
        id: "technique-seq-lariat-grab",
        name: "Lariat Grab",
        primaryFaceId: LARIAT,
        secondary: { faceType: "grab" },
        sequenceRole: "starter",
        effects: [{ type: "damage", amount: 3, target: { kind: "declared-target" } }],
      },
      {
        id: "technique-seq-lariat-finish",
        name: "Lariat Finish",
        primaryFaceId: LARIAT,
        secondary: { faceId: FINISH },
        sequenceRole: "starter",
        effects: [{ type: "damage", amount: 2, target: { kind: "declared-target" } }],
      },
      {
        id: "technique-seq-lariat-extend",
        name: "Lariat Extend",
        primaryFaceId: LARIAT,
        secondary: { faceType: "grab" },
        sequenceRole: "extender",
        effects: [{ type: "damage", amount: 1, target: { kind: "declared-target" } }],
      },
    ],
  });
}

const MIXED: DieFaceLayout = [JAB, LARIAT, FINISH, GRAB, GUARD, JAB];
const METER_DIE: DieFaceLayout = [
  METER_JAB,
  METER_JAB,
  METER_JAB,
  METER_JAB,
  METER_JAB,
  METER_JAB,
];
const SQUAD: readonly CreatureDefinitionId[] = [FIGHTER, TEST_BODY_B, TEST_LEGEND];
const FACE_DECK = [JAB, LARIAT, FINISH, GRAB, GUARD, METER_JAB, JAB, LARIAT, FINISH, GRAB, GUARD, METER_JAB] as const;

function matchWith(layout: DieFaceLayout, consumeDiceOnFaceActions = true): GameState {
  install();
  return newMatch({
    config: { ...CONFIG, consumeDiceOnFaceActions },
    players: [
      { id: P1, squad: SQUAD, deck: [], faceDeck: FACE_DECK, startingDice: [layout, layout] },
      { id: P2, squad: SQUAD, deck: [], faceDeck: FACE_DECK, startingDice: [layout, layout] },
    ],
  });
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

function damageOf(state: GameState, playerId: typeof P1 | typeof P2): number {
  return state.creatures[activeId(state, playerId)]?.damage ?? 0;
}

function withMeter(state: GameState, playerId: typeof P1 | typeof P2, meter: number): GameState {
  const player = state.players[playerId];
  if (player === undefined) throw new Error("player");
  return { ...state, players: { ...state.players, [playerId]: { ...player, meter } } };
}

function readyMixed(consumeDiceOnFaceActions = true): GameState {
  return show(
    show(show(show(matchWith(MIXED, consumeDiceOnFaceActions), P1, 0, 0), P1, 1, 0), P2, 0, 0),
    P2,
    1,
    0,
  );
}

function useFace(state: GameState, playerId: typeof P1 | typeof P2) {
  return advance(state, {
    type: "USE_FACE",
    playerId,
    creatureId: activeId(state, playerId),
  });
}

function resolvedKinds(state: GameState): readonly string[] {
  return state.log.flatMap((entry) =>
    entry.event.type === "chain-link-resolved" ? [entry.event.kind] : [],
  );
}

describe("030 offensive control", () => {
  it("rerolls any number of your dice once, and keeps the named face", () => {
    const rolled = expectOk(
      advance(matchWith(METER_DIE), { type: "ROLL_DICE", playerId: P1 }),
    );
    expect(rolled.phase).toBe("actions");
    expect(rolled.offensiveState).toBe("open");
    expect(canRerollDice(rolled, P1)).toBe(true);

    const dieIds = [dieIdAt(rolled, P1, 0), dieIdAt(rolled, P1, 1)];
    const rerolled = expectOk(
      advance(rolled, { type: "REROLL_DICE", playerId: P1, dieIds }),
    );
    expect(eventTypes(rerolled)).toContain("dice-rerolled");
    const rolledDice = rerolled.log.flatMap((entry) =>
      entry.event.type === "die-rolled" ? [entry.event.dieId] : [],
    );
    expect(rolledDice).toEqual(expect.arrayContaining(dieIds));
    for (const dieId of dieIds) {
      const die = rerolled.dice[dieId];
      expect(die?.rolledSlotIndex).not.toBeNull();
      const faceId = die?.slots[die.rolledSlotIndex ?? 0]?.faceCardId;
      expect(faceId).toBe(METER_JAB);
    }

    const again = advance(rerolled, { type: "REROLL_DICE", playerId: P1, dieIds });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error).toBe("ALREADY_USED");

    const empty = advance(rolled, { type: "REROLL_DICE", playerId: P1, dieIds: [] });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error).toBe("INVALID_TARGET");

    const opponentDie = advance(rolled, {
      type: "REROLL_DICE",
      playerId: P1,
      dieIds: [dieIdAt(rolled, P2, 0)],
    });
    expect(opponentDie.ok).toBe(false);
    if (!opponentDie.ok) expect(opponentDie.error).toBe("INVALID_TARGET");

    const notOwner = advance(rolled, {
      type: "REROLL_DICE",
      playerId: P2,
      dieIds: [dieIdAt(rolled, P2, 0)],
    });
    expect(notOwner.ok).toBe(false);
    if (!notOwner.ok) expect(notOwner.error).toBe("NOT_ACTIVE_PLAYER");

    const ended = expectOk(advance(rerolled, { type: "END_TURN", playerId: P1 }));
    expect(ended.players[P1]?.spentOncePerTurnKeys).not.toContain("turn-reroll");
  });

  it("rejects a reroll after offense is no longer open", () => {
    const opened = readyMixed();
    const combo = expectOk(advanceResolvingChain(opened, {
      type: "USE_FACE",
      playerId: P1,
      creatureId: activeId(opened, P1),
    }));
    expect(combo.offensiveState).toBe("combo");
    const reroll = advance(combo, {
      type: "REROLL_DICE",
      playerId: P1,
      dieIds: [dieIdAt(combo, P1, 1)],
    });
    expect(reroll.ok).toBe(false);
    if (!reroll.ok) expect(reroll.error).toBe("INVALID_PHASE");
  });

  it("establishes combo from a starter and refuses another starter on the same face", () => {
    const opened = readyMixed(false);
    expect(legalFaceActions(opened, P1)).toEqual([activeId(opened, P1)]);
    const declared = expectOk(useFace(opened, P1));
    expect(declared.pendingDecision?.type).toBe("reaction-priority");
    expect(damageOf(declared, P2)).toBe(0);

    const combo = resolveOpenChain(declared);
    expect(combo.phase).toBe("actions");
    expect(combo.offensiveState).toBe("combo");
    expect(combo.aggressorPlayerId).toBe(P1);
    expect(damageOf(combo, P2)).toBe(2);
    expect(combo.players[P1]?.spentOncePerTurnKeys.some((key) => key.startsWith("face-action:"))).toBe(
      false,
    );

    const secondStarter = useFace(combo, P1);
    expect(secondStarter.ok).toBe(false);
    if (!secondStarter.ok) expect(secondStarter.error).toBe("INVALID_TARGET");
    expect(legalFaceActions(combo, P1)).toEqual([]);
  });

  it("extends combo, then a finisher ends it", () => {
    let state = readyMixed(false);
    state = resolveOpenChain(expectOk(useFace(state, P1)));
    state = show(state, P1, 0, 1);
    const extended = resolveOpenChain(expectOk(useFace(state, P1)));
    expect(extended.offensiveState).toBe("combo");
    expect(damageOf(extended, P2)).toBe(3);

    const showingFinisher = show(extended, P1, 0, 2);
    const afterFinish = resolveOpenChain(expectOk(useFace(showingFinisher, P1)));
    expect(afterFinish.offensiveState).toBe("open");
    expect(afterFinish.aggressorPlayerId).toBe(P1);
    expect(afterFinish.phase).toBe("actions");
    const again = useFace(show(afterFinish, P1, 0, 0), P1);
    expect(again.ok).toBe(true);
  });

  it("refuses an extender while the sequence is open", () => {
    const showingExtender = show(readyMixed(), P1, 0, 1);
    const denied = useFace(showingExtender, P1);
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error).toBe("INVALID_TARGET");
  });

  it("applies a secondary bonus through the chain and keeps primary/secondary order", () => {
    const showing = show(show(readyMixed(), P1, 0, 1), P1, 1, 3);
    const opened = expectOk(
      advance(showing, {
        type: "USE_TECHNIQUE",
        playerId: P1,
        creatureId: activeId(showing, P1),
        techniqueId: "technique-seq-lariat-grab",
        secondaryDieId: dieIdAt(showing, P1, 1),
      }),
    );
    const resolved = resolveOpenChain(opened);
    expect(damageOf(resolved, P2)).toBe(4);
    expect(resolved.offensiveState).toBe("combo");

    const swapped = show(show(readyMixed(), P1, 0, 3), P1, 1, 1);
    const illegal = advance(swapped, {
      type: "USE_TECHNIQUE",
      playerId: P1,
      creatureId: activeId(swapped, P1),
      techniqueId: "technique-seq-lariat-grab",
      secondaryDieId: dieIdAt(swapped, P1, 1),
    });
    expect(illegal.ok).toBe(false);

    const specific = show(show(readyMixed(), P1, 0, 1), P1, 1, 2);
    const specificOk = resolveOpenChain(
      expectOk(
        advance(specific, {
          type: "USE_TECHNIQUE",
          playerId: P1,
          creatureId: activeId(specific, P1),
          techniqueId: "technique-seq-lariat-finish",
          secondaryDieId: dieIdAt(specific, P1, 1),
        }),
      ),
    );
    expect(damageOf(specificOk, P2)).toBe(3);

    const wrongFace = show(show(readyMixed(), P1, 0, 1), P1, 1, 4);
    const wrong = advance(wrongFace, {
      type: "USE_TECHNIQUE",
      playerId: P1,
      creatureId: activeId(wrongFace, P1),
      techniqueId: "technique-seq-lariat-finish",
      secondaryDieId: dieIdAt(wrongFace, P1, 1),
    });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.error).toBe("ATTACK_NOT_FUELLED");
  });

  it("spends and grants meter while resolving, and rejects a short meter", () => {
    const rolled = expectOk(
      advance(matchWith(METER_DIE), { type: "ROLL_DICE", playerId: P1 }),
    );
    const short = withMeter(rolled, P1, 1);
    const denied = useFace(short, P1);
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error).toBe("INSUFFICIENT_METER");
    if (!denied.ok) expect(denied.state.players[P1]?.meter).toBe(1);
    expect(short.players[P1]?.spentOncePerTurnKeys.some((key) => key.startsWith("face-action:"))).toBe(
      false,
    );

    const paid = withMeter(rolled, P1, 2);
    const resolved = resolveOpenChain(expectOk(useFace(paid, P1)));
    expect(resolved.players[P1]?.meter).toBe(1);
    expect(damageOf(resolved, P2)).toBe(2);
    expect(resolved.offensiveState).toBe("combo");
    expect(resolved.phase).toBe("actions");
    const deltas = resolved.log.flatMap((entry) =>
      entry.event.type === "meter-changed" && entry.event.playerId === P1
        ? [entry.event.delta]
        : [],
    );
    expect(deltas).toEqual([-2, 1]);
  });

  it("runs roll, reroll, response, meter, and a control transfer", () => {
    const rolled = expectOk(
      advance(matchWith(METER_DIE, false), { type: "ROLL_DICE", playerId: P1 }),
    );
    const dieIds = [dieIdAt(rolled, P1, 0), dieIdAt(rolled, P1, 1)];
    const rerolled = expectOk(
      advance(rolled, { type: "REROLL_DICE", playerId: P1, dieIds }),
    );
    const p2Face = rerolled.dice[dieIdAt(rerolled, P2, 0)];
    const p2Showing = p2Face?.slots[p2Face.rolledSlotIndex ?? 0]?.faceCardId;
    expect(p2Showing).toBe(METER_JAB);

    const state = withMeter(
      withMeter(withHand(withHand(rerolled, P2, [REVERSAL.id]), P1, [ANSWER.id]), P1, 2),
      P2,
      2,
    );
    const declared = expectOk(useFace(state, P1));
    expect(declared.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P1,
    });
    expect(damageOf(declared, P2)).toBe(0);

    const yielded = expectOk(
      advance(declared, { type: "PASS_PRIORITY", playerId: P1 }),
    );
    const answered = expectOk(
      advance(yielded, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(yielded, P2, 0),
        declaredTargetCreatureId: activeId(yielded, P1),
      }),
    );
    expect(answered.pendingDecision).toMatchObject({
      type: "reaction-priority",
      priorityPlayerId: P2,
    });
    const yieldedAgain = expectOk(
      advance(answered, { type: "PASS_PRIORITY", playerId: P2 }),
    );
    const nested = expectOk(
      advance(yieldedAgain, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(yieldedAgain, P1, 0),
      }),
    );
    const resolved = resolveOpenChain(nested);
    expect(resolvedKinds(resolved)).toEqual(["tactic-effect", "tactic-effect", "combat-action"]);
    expect(damageOf(resolved, P1)).toBe(1);
    expect(damageOf(resolved, P2)).toBe(2);
    expect(resolved.players[P1]?.meter).toBe(1);
    expect(resolved.aggressorPlayerId).toBe(P2);
    expect(resolved.offensiveState).toBe("open");
    expect(resolved.phase).toBe("actions");

    const seized = resolveOpenChain(expectOk(useFace(resolved, P2)));
    expect(seized.aggressorPlayerId).toBe(P2);
    expect(seized.offensiveState).toBe("combo");
    expect(damageOf(seized, P1)).toBe(3);

    const turnOwner = useFace(seized, P1);
    expect(turnOwner.ok).toBe(false);
    if (!turnOwner.ok) expect(turnOwner.error).toBe("INVALID_TARGET");
  });

  it("rejects a repeated action and still allows that face inside a technique", () => {
    let state = resolveOpenChain(expectOk(useFace(readyMixed(false), P1)));
    expect(state.offensiveState).toBe("combo");
    state = show(state, P1, 0, 1);
    const extended = resolveOpenChain(expectOk(useFace(state, P1)));
    const again = useFace(show(extended, P1, 0, 1), P1);
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error).toBe("ALREADY_USED");

    const withGrab = show(show(extended, P1, 0, 1), P1, 1, 3);
    const technique = expectOk(
      advance(withGrab, {
        type: "USE_TECHNIQUE",
        playerId: P1,
        creatureId: activeId(withGrab, P1),
        techniqueId: "technique-seq-lariat-extend",
        secondaryDieId: dieIdAt(withGrab, P1, 1),
      }),
    );
    expect(technique.chainStack.some((link) => link.sequenceActionId === "technique:technique-seq-lariat-extend")).toBe(
      true,
    );
  });

  it("does not apply a later effect after an earlier link KOs its target", () => {
    const ready = readyMixed(false);
    const target = activeId(ready, P2);
    const wounded = {
      ...ready,
      creatures: {
        ...ready.creatures,
        [target]: { ...ready.creatures[target]!, damage: 19 },
      },
    };
    const declared = withHand(expectOk(useFace(wounded, P1)), P2, [REVERSAL.id]);
    const passed = expectOk(advance(declared, { type: "PASS_PRIORITY", playerId: P1 }));
    const answered = expectOk(
      advance(passed, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(passed, P2, 0),
        declaredTargetCreatureId: target,
      }),
    );
    const resolved = resolveOpenChain(answered);
    expect(resolved.creatures[target]?.defeated).toBe(true);
    expect(resolved.creatures[target]?.damage).toBe(20);
  });

  it("ends the sequence without passing initiative or yielding Priority", () => {
    const opened = resolveOpenChain(expectOk(useFace(readyMixed(false), P1)));
    expect(opened.offensiveState).toBe("combo");
    const ended = expectOk(advance(opened, { type: "END_SEQUENCE", playerId: P1 }));
    expect(ended.offensiveState).toBe("open");
    expect(ended.aggressorPlayerId).toBe(P1);
    expect(ended.pendingDecision).toBeNull();
    expect(ended.chainStack).toHaveLength(0);
  });
});
