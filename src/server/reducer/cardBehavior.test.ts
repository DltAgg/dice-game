import { describe, expect, it } from "vitest";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import type { DieFaceLayout } from "../model/dice.js";
import type { CreatureDefinitionId, DieId } from "../model/ids.js";
import { asCreatureId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { matchingTechniques } from "../rules/faceActions.js";
import { advance } from "./reduce.js";
import {
  asTestCreatureId,
  asTestFaceId,
  TEST_LEGEND,
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

const JAB = asTestFaceId("beh-jab");
const LARIAT = asTestFaceId("beh-lariat");
const FINISH = asTestFaceId("beh-finish");
const GRAB = asTestFaceId("beh-grab");
const GUARD = asTestFaceId("beh-guard");
const ASSIST_FACE = asTestFaceId("beh-assist");
const TAG_FACE = asTestFaceId("beh-tag");
const FIGHTER = asTestCreatureId("beh-fighter");
const ASSIST_FIGHTER = asTestCreatureId("beh-assist-fighter");

const RESPONSE = testCard({
  id: "card-test-beh-response",
  name: "Response",
  type: "response",
  subtypes: [],
  playCost: { martial: 2 },
  exceptionalMeterCost: 2,
  rulesText: "Respond.",
  effect: { effects: [{ type: "draw-cards", amount: 1 }] },
});

const RESPONSE_TWO = testCard({
  id: "card-test-beh-response-two",
  name: "Response Two",
  type: "response",
  subtypes: [],
  playCost: { martial: 2 },
  rulesText: "Respond again.",
  effect: { effects: [{ type: "draw-cards", amount: 1 }] },
});

const ROLL_MOD = testCard({
  id: "card-test-beh-roll",
  name: "Roll Modify",
  type: "modify",
  subtypes: [],
  playCost: { martial: 2 },
  modifySubject: "roll",
  exceptionalMeterCost: 2,
  rulesText: "Change the roll.",
});

const DIE_MOD = testCard({
  id: "card-test-beh-die",
  name: "Die Modify",
  type: "modify",
  subtypes: [],
  playCost: { martial: 2 },
  modifySubject: "die",
  rulesText: "Change the die.",
});

const MOVESET_MOD = testCard({
  id: "card-test-beh-moveset",
  name: "Moveset Modify",
  type: "modify",
  subtypes: [],
  playCost: { martial: 2 },
  modifySubject: "moveset",
  rulesText: "Enable a technique.",
});

const TARGET_MOD = testCard({
  id: "card-test-beh-target",
  name: "Target Modify",
  type: "modify",
  subtypes: [],
  playCost: { martial: 2 },
  modifySubject: "target",
  rulesText: "Redirect.",
});

const TAG_MOD = testCard({
  id: "card-test-beh-tag",
  name: "Tag Modify",
  type: "modify",
  subtypes: [],
  playCost: { martial: 2 },
  modifySubject: "tag",
  exceptionalMeterCost: 3,
  rulesText: "Tag outside the action.",
});

const LAYOUT: DieFaceLayout = [JAB, LARIAT, FINISH, GRAB, GUARD, JAB];
const SQUAD: readonly CreatureDefinitionId[] = [FIGHTER, FIGHTER, TEST_LEGEND];
const ASSIST_SQUAD: readonly CreatureDefinitionId[] = [ASSIST_FIGHTER, ASSIST_FIGHTER, TEST_LEGEND];

function install(): void {
  testFace({
    id: JAB,
    name: "Jab",
    faceType: "attack",
    sequenceRole: "starter",
    primaryEffects: [{ type: "damage", amount: 2, target: { kind: "declared-target" } }],
  });
  testFace({
    id: LARIAT,
    name: "Lariat",
    faceType: "attack",
    sequenceRole: "starter",
    primaryEffects: [{ type: "damage", amount: 1, target: { kind: "declared-target" } }],
  });
  testFace({
    id: FINISH,
    name: "Finish",
    faceType: "attack",
  });
  testFace({
    id: GRAB,
    name: "Grab",
    faceType: "grab",
  });
  testFace({
    id: GUARD,
    name: "Guard",
    faceType: "guard",
  });
  testFace({
    id: ASSIST_FACE,
    name: "Assist",
    technique: "assist",
  });
  testFace({
    id: TAG_FACE,
    name: "Tag",
    technique: "tag",
  });
  testCreature({
    id: FIGHTER,
    name: "Behavior Fighter",
    life: 20,
    attacks: [],
    techniques: [
      {
        id: "technique-beh-lariat-grab",
        name: "Lariat Grab",
        primaryFaceId: LARIAT,
        secondary: { faceType: "grab" },
        effects: [{ type: "damage", amount: 3, target: { kind: "declared-target" } }],
      },
    ],
  });
  testCreature({
    id: ASSIST_FIGHTER,
    name: "Assist Fighter",
    life: 20,
    attacks: [],
    exceptionalAssistMeter: 3,
    assistEffects: [{ type: "draw-cards", amount: 1 }],
  });
}

function matchWith(squad: readonly CreatureDefinitionId[] = SQUAD): GameState {
  install();
  return newMatch({
    config: {
      ...DEFAULT_RULES_CONFIG,
      deckMinCards: 0,
      deckOutEnabled: false,
      consumeDiceOnFaceActions: false,
      maxFacesOfSameAttributePerDie: 6,
      startingMaxOnRollFacesPerDie: 6,
      faceDeckMaxCards: 24,
      faceDeckMaxPerAttribute: 12,
    },
    players: [
      {
        id: P1,
        squad,
        deck: [],
        faceDeck: [JAB, LARIAT, FINISH, GRAB, GUARD, ASSIST_FACE, TAG_FACE, JAB],
        startingDice: [LAYOUT, LAYOUT],
      },
      {
        id: P2,
        squad,
        deck: [],
        faceDeck: [JAB, LARIAT, FINISH, GRAB, GUARD, ASSIST_FACE, TAG_FACE, JAB],
        startingDice: [LAYOUT, LAYOUT],
      },
    ],
  });
}

function dieIdAt(state: GameState, playerId: typeof P1 | typeof P2, index: number): DieId {
  return state.players[playerId]!.dieIds[index] as DieId;
}

function creatureAt(state: GameState, playerId: typeof P1 | typeof P2, index: number) {
  const id = state.players[playerId]?.creatureIds[index];
  if (id === undefined) throw new Error("missing fighter");
  return id;
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

function withMeter(state: GameState, playerId: typeof P1 | typeof P2, meter: number): GameState {
  const player = state.players[playerId];
  if (player === undefined) throw new Error("player");
  return { ...state, players: { ...state.players, [playerId]: { ...player, meter } } };
}

function ready(): GameState {
  return show(show(matchWith(), P1, 0, 0), P2, 0, 0);
}

function declare(state: GameState): GameState {
  return expectOk(
    advance(state, {
      type: "USE_FACE",
      playerId: P1,
      creatureId: creatureAt(state, P1, 0),
    }),
  );
}

function pass(state: GameState, playerId: typeof P1 | typeof P2): GameState {
  return expectOk(advance(state, { type: "PASS_PRIORITY", playerId }));
}

describe("030 card behavior", () => {
  it("rejects a Response against your own action and accepts one against the opponent", () => {
    const opened = withHand(declare(ready()), P1, [RESPONSE.id]);
    expect(opened.pendingDecision).toMatchObject({ priorityPlayerId: P1 });
    const own = advance(opened, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(opened, P1, 0),
    });
    expect(own.ok).toBe(false);
    if (!own.ok) expect(own.error).toBe("INVALID_CHAIN_TARGET");

    const yielded = pass(opened, P1);
    const answered = withHand(yielded, P2, [RESPONSE.id]);
    const played = expectOk(
      advance(answered, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(answered, P2, 0),
      }),
    );
    expect(played.chainStack.map((link) => link.controllerId)).toEqual([P1, P2]);
    expect(played.pendingDecision).toMatchObject({
      priorityPlayerId: P2,
      consecutivePasses: 0,
    });
  });

  it("lets a Response answer an opponent Response", () => {
    const opened = withHand(withHand(declare(ready()), P2, [RESPONSE.id]), P1, [RESPONSE_TWO.id]);
    const afterPass = pass(opened, P1);
    const first = expectOk(
      advance(afterPass, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(afterPass, P2, 0),
      }),
    );
    const back = pass(first, P2);
    const second = expectOk(
      advance(back, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(back, P1, 0),
      }),
    );
    expect(second.chainStack).toHaveLength(3);
    expect(second.chainStack[2]?.controllerId).toBe(P1);
  });

  it("rejects a Response when no opponent object exists", () => {
    const state = withMeter(withHand(show(matchWith(), P1, 0, 0), P1, [RESPONSE.id]), P1, 2);
    const played = advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
      mode: "exceptional",
    });
    expect(played.ok).toBe(false);
    if (!played.ok) expect(played.error).toBe("INVALID_CHAIN_TARGET");
    expect(state.players[P1]?.meter).toBe(2);
  });

  it("lets either player Modify a legal roll and rejects a missing roll", () => {
    const opened = declare(ready());
    const dieId = dieIdAt(opened, P1, 0);
    const before = opened.dice[dieId]!.slots.map((slot) => slot.faceCardId);
    const handed = withHand(withHand(opened, P1, [ROLL_MOD.id]), P2, [ROLL_MOD.id]);
    const first = expectOk(
      advance(handed, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(handed, P1, 0),
        dieId,
        slotIndex: 1,
      }),
    );
    expect(first.chainStack).toHaveLength(2);
    const toOpponent = pass(first, P1);
    const p2Die = dieIdAt(toOpponent, P2, 0);
    const second = expectOk(
      advance(toOpponent, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(toOpponent, P2, 0),
        dieId: p2Die,
        slotIndex: 2,
      }),
    );
    const resolved = resolveOpenChain(pass(second, P2));
    expect(resolved.dice[dieId]?.rolledSlotIndex).toBe(1);
    expect(resolved.dice[dieId]?.slots.map((slot) => slot.faceCardId)).toEqual(before);
    expect(resolved.dice[p2Die]?.rolledSlotIndex).toBe(2);

    const fresh = declare(ready());
    const other = dieIdAt(fresh, P1, 1);
    const cleared = {
      ...fresh,
      dice: {
        ...fresh.dice,
        [other]: { ...fresh.dice[other]!, rolledSlotIndex: null },
      },
    };
    const bad = withHand(cleared, P1, [ROLL_MOD.id]);
    const rejected = advance(bad, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(bad, P1, 0),
      dieId: other,
      slotIndex: 1,
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error).toBe("INVALID_TARGET");
  });

  it("writes a die slot permanently and leaves the roll alone", () => {
    const opened = withHand(declare(ready()), P1, [DIE_MOD.id]);
    const dieId = dieIdAt(opened, P1, 0);
    const showing = opened.dice[dieId]?.rolledSlotIndex;
    const played = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(opened, P1, 0),
        dieId,
        slotIndex: 2,
        declaredFaceCardId: GUARD,
      }),
    );
    const resolved = resolveOpenChain(played);
    expect(resolved.dice[dieId]?.rolledSlotIndex).toBe(showing);
    expect(resolved.dice[dieId]?.slots[2]?.faceCardId).toBe(GUARD);
    const ended = expectOk(advance(resolved, { type: "END_TURN", playerId: P1 }));
    expect(ended.dice[dieId]?.slots[2]?.faceCardId).toBe(GUARD);
  });

  it("enables a technique the secondary input does not match, and rejects an unknown one", () => {
    const shown = show(show(matchWith(), P1, 0, 1), P1, 1, 4);
    const fighter = creatureAt(shown, P1, 0);
    expect(matchingTechniques(shown, P1, fighter)).toEqual([]);
    const opened = withHand(declare(shown), P1, [MOVESET_MOD.id]);
    const rejected = advance(opened, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(opened, P1, 0),
      declaredTargetCreatureId: fighter,
      techniqueId: "technique-missing",
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error).toBe("INVALID_TARGET");
    const played = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(opened, P1, 0),
        declaredTargetCreatureId: fighter,
        techniqueId: "technique-beh-lariat-grab",
      }),
    );
    const resolved = resolveOpenChain(played);
    expect(matchingTechniques(resolved, P1, fighter).map((row) => row.techniqueId)).toContain(
      "technique-beh-lariat-grab",
    );
    const attached = Object.values(resolved.cards).find((card) => card.cardId === MOVESET_MOD.id);
    expect(attached?.zone).toBe("equipment");
    expect(attached?.attachedToCreatureId).toBe(fighter);
    expect(resolved.creatures[fighter]?.equipmentIds).toContain(attached?.id);
  });

  it("redirects an unresolved target and rejects a missing one", () => {
    const opened = withHand(declare(ready()), P1, [TARGET_MOD.id]);
    const reserve = creatureAt(opened, P2, 1);
    const played = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(opened, P1, 0),
        declaredTargetCreatureId: reserve,
      }),
    );
    const resolved = resolveOpenChain(played);
    expect(resolved.creatures[creatureAt(resolved, P2, 0)]?.damage).toBe(0);
    expect(resolved.creatures[reserve]?.damage).toBe(2);

    const missing = withHand(declare(ready()), P1, [TARGET_MOD.id]);
    const rejected = advance(missing, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(missing, P1, 0),
      declaredTargetCreatureId: asCreatureId("creature-not-in-match"),
    });
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.error).toBe("INVALID_TARGET");
  });

  it("tags through the action, and spends Meter only for an exceptional tag card", () => {
    const acting = withMeter(show(matchWith(), P1, 0, 0), P1, 2);
    const reserve = creatureAt(acting, P1, 1);
    const tagged = resolveOpenChain(
      expectOk(advance(acting, { type: "TAG", playerId: P1, reserveCreatureId: reserve })),
    );
    expect(tagged.players[P1]?.activeCreatureId).toBe(reserve);
    expect(tagged.log.some((entry) => entry.event.type === "card-played")).toBe(false);

    const free = show(matchWith(), P1, 0, 0);
    const tagDie = dieIdAt(free, P1, 0);
    const showing = {
      ...free,
      dice: {
        ...free.dice,
        [tagDie]: {
          ...free.dice[tagDie]!,
          rolledSlotIndex: 0,
          slots: free.dice[tagDie]!.slots.map((slot, index) =>
            index === 0 ? { ...slot, faceCardId: TAG_FACE } : slot,
          ),
        },
      },
    };
    const freeTag = resolveOpenChain(
      expectOk(
        advance(showing, {
          type: "TAG",
          playerId: P1,
          reserveCreatureId: creatureAt(showing, P1, 1),
        }),
      ),
    );
    expect(freeTag.players[P1]?.meter).toBe(0);

    const carded = withMeter(withHand(show(matchWith(), P1, 0, 0), P1, [TAG_MOD.id]), P1, 3);
    const normal = advance(carded, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(carded, P1, 0),
      declaredTargetCreatureId: creatureAt(carded, P1, 1),
    });
    expect(normal.ok).toBe(false);
    if (!normal.ok) expect(normal.error).toBe("INVALID_PHASE");

    const exceptional = expectOk(
      advance(carded, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(carded, P1, 0),
        declaredTargetCreatureId: creatureAt(carded, P1, 1),
        mode: "exceptional",
      }),
    );
    const resolved = resolveOpenChain(exceptional);
    expect(resolved.players[P1]?.meter).toBe(0);
    expect(resolved.players[P1]?.activeCreatureId).toBe(creatureAt(carded, P1, 1));
  });

  it("keeps normal Assist free and charges the Fighter's exceptional Assist", () => {
    install();
    const base = show(matchWith(ASSIST_SQUAD), P1, 0, 0);
    const reserve = creatureAt(base, P1, 1);
    const broke = advance(base, { type: "ASSIST", playerId: P1, reserveCreatureId: reserve });
    expect(broke.ok).toBe(false);
    if (!broke.ok) expect(broke.error).toBe("INSUFFICIENT_METER");

    const paid = resolveOpenChain(
      expectOk(
        advance(withMeter(base, P1, 3), { type: "ASSIST", playerId: P1, reserveCreatureId: reserve }),
      ),
    );
    expect(paid.players[P1]?.meter).toBe(0);

    const assistDie = dieIdAt(base, P1, 1);
    const showing = {
      ...base,
      dice: {
        ...base.dice,
        [assistDie]: {
          ...base.dice[assistDie]!,
          rolledSlotIndex: 0,
          slots: base.dice[assistDie]!.slots.map((slot, index) =>
            index === 0 ? { ...slot, faceCardId: ASSIST_FACE } : slot,
          ),
        },
      },
    };
    const free = resolveOpenChain(
      expectOk(advance(showing, { type: "ASSIST", playerId: P1, reserveCreatureId: reserve })),
    );
    expect(free.players[P1]?.meter).toBe(0);
  });

  it("spends Meter only for the exceptional mode", () => {
    const opened = withMeter(withHand(declare(ready()), P1, [ROLL_MOD.id]), P1, 5);
    const dieId = dieIdAt(opened, P1, 0);
    const normal = expectOk(
      advance(opened, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(opened, P1, 0),
        dieId,
        slotIndex: 1,
      }),
    );
    expect(normal.players[P1]?.meter).toBe(5);

    const outside = withMeter(withHand(show(matchWith(), P1, 0, 0), P1, [ROLL_MOD.id]), P1, 2);
    const blocked = advance(outside, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(outside, P1, 0),
      dieId: dieIdAt(outside, P1, 0),
      slotIndex: 1,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.error).toBe("INVALID_PHASE");

    const short = withMeter(withHand(show(matchWith(), P1, 0, 0), P1, [ROLL_MOD.id]), P1, 1);
    const broke = advance(short, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(short, P1, 0),
      dieId: dieIdAt(short, P1, 0),
      slotIndex: 1,
      mode: "exceptional",
    });
    expect(broke.ok).toBe(false);
    if (!broke.ok) expect(broke.error).toBe("INSUFFICIENT_METER");
    expect(short.players[P1]?.meter).toBe(1);

    const paid = expectOk(
      advance(withMeter(short, P1, 2), {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(short, P1, 0),
        dieId: dieIdAt(short, P1, 0),
        slotIndex: 1,
        mode: "exceptional",
      }),
    );
    expect(paid.players[P1]?.meter).toBe(0);
    const resolved = resolveOpenChain(paid);
    expect(resolved.dice[dieIdAt(short, P1, 0)]?.rolledSlotIndex).toBe(1);
  });

  it("yields Priority on Pass, resets it when someone plays, and does not put Pass on the Chain", () => {
    const opened = withHand(declare(ready()), P1, [ROLL_MOD.id]);
    const links = opened.chainStack.length;
    const yielded = pass(opened, P1);
    expect(yielded.chainStack).toHaveLength(links);
    expect(yielded.pendingDecision).toMatchObject({
      priorityPlayerId: P2,
      consecutivePasses: 1,
    });
    const withP2 = withHand(yielded, P2, [ROLL_MOD.id]);
    const played = expectOk(
      advance(withP2, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(withP2, P2, 0),
        dieId: dieIdAt(withP2, P2, 0),
        slotIndex: 1,
      }),
    );
    expect(played.pendingDecision).toMatchObject({
      priorityPlayerId: P2,
      consecutivePasses: 0,
    });
    expect(played.chainStack.some((link) => link.kind === "tactic-effect")).toBe(true);
    const once = pass(played, P2);
    expect(once.pendingDecision?.type).toBe("reaction-priority");
    expect(once.creatures[creatureAt(once, P2, 0)]?.damage).toBe(0);
    const resolved = pass(once, P1);
    expect(resolved.pendingDecision).toBeNull();
    expect(resolved.creatures[creatureAt(resolved, P2, 0)]?.damage).toBe(2);
  });
});
