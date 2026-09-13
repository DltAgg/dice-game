import { describe, expect, it } from "vitest";
import type { CardInstance } from "../model/cards.js";
import type { DieState } from "../model/dice.js";
import {
  asCardInstanceId,
  asEffectInstanceId,
  asSymbolInstanceId,
  type CreatureId,
  type DieId,
} from "../model/ids.js";
import type { GameState } from "../model/state.js";
import {
  isCreatureSilenced,
  isRitualSilenced,
  isSlotSilenced,
} from "../rules/silence.js";
import { createDraft } from "./draft.js";
import { applyDeferredEffect, drainResolution } from "./resolution.js";
import {
  TEST_SQUAD,
  testAttack,
  testCard,
  testCreature,
  testFace,
} from "../testing/fixtures/index.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withActivePlayer,
  withHand,
  withPhase,
  withPile,
  withShowingFaces,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";
import { CRANK } from "../testing/tempoCatalogue.js";

const SILENCE = testCard({
  id: "card-test-silence",
  playCost: { arcane: 2 },
  attribute: "arcane",
  effect: {
    effects: [
      {
        type: "silence",
        hosts: ["creature", "ritual", "face"],
        target: { kind: "choose-opponent-silence-host", hosts: ["creature", "ritual", "face"] },
      },
    ],
  },
});

const EQUIP = testCard({
  id: "card-test-silence-equip",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  type: "equipment",
  equipment: {
    mayTargetOpponent: false,
    abilities: [
      {
        type: "on-absorb",
        symbols: ["mechanical"],
        absorberRelation: "ally",
        oncePerTurn: true,
        effects: [{ type: "next-attack-bonus", amount: 1 }],
      },
    ],
  },
});

const ACTIVATE_RITUAL = testCard({
  id: "card-test-silence-activate-ritual",
  playCost: { darkness: 2 },
  attribute: "darkness",
  type: "ritual",
  subtypes: ["continuous"],
  ritual: {
    spend: { darkness: 1 },
    effects: [
      {
        type: "drain-life",
        amount: 2,
        target: { kind: "choose-enemy" },
        with: { kind: "choose-ally" },
      },
    ],
  },
});

const STANDING_RITUAL = testCard({
  id: "card-test-silence-standing-ritual",
  playCost: { mechanical: 1, any: 1 },
  attribute: "mechanical",
  type: "ritual",
  subtypes: ["continuous"],
  ritual: {
    spend: { mechanical: 1, any: 1 },
    effects: [{ type: "reapply-die-modifiers" }],
    standingAbilities: [
      {
        type: "on-roll-symbol",
        symbol: "martial",
        rollingPlayer: "controller",
        effects: [{ type: "generate-symbol", symbol: "mechanical", amount: 1 }],
      },
    ],
  },
});

const DISCOUNT_FACE = testFace({
  id: "face-test-silence-discount",
  kind: "synthetic",
  symbol: "mechanical",
  pips: { mechanical: 2 },
  onRoll: [{ type: "play-cost-discount", amount: 1 }],
});

const FOLLOW_UP_ATTACK = testAttack({
  id: "attack-test-silence-follow-up",
  unlock: { mechanical: 2 },
  followUpEffects: [{ type: "arm-forge-discount", amount: 2 }],
});
const FOLLOW_UP_BODY = testCreature({
  id: "creature-test-silence-follow-up",
  attributes: ["mechanical"],
  attacks: [FOLLOW_UP_ATTACK],
});

const actionsReady = (playerId: typeof P1 | typeof P2, cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), playerId, cards), playerId, 10);

function playSilence(state: GameState): GameState {
  const ready = withActivePlayer(
    withPile(withHand(withPhase(state, "actions"), P1, [SILENCE.id]), P1, 10),
    P1,
  );
  return expectOk(
    advance(ready, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(ready, P1, 0),
    }),
  );
}

function chooseSilence(
  state: GameState,
  choice: {
    readonly host: "creature";
    readonly creatureId: CreatureId;
  } | {
    readonly host: "ritual";
    readonly cardInstanceId: ReturnType<typeof asCardInstanceId>;
  } | {
    readonly host: "face";
    readonly dieId: DieId;
    readonly slotIndex: number;
  },
): GameState {
  expect(state.pendingDecision?.type).toBe("choose-silence-host");
  return expectOk(
    advance(state, { type: "RESOLVE_CHOOSE_SILENCE_HOST", playerId: P1, choice }),
  );
}

function dieIdOf(state: GameState, playerId = P2, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("expected a die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("expected die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function installFace(state: GameState, playerId: typeof P1 | typeof P2, slot = 0): GameState {
  const dieId = dieIdOf(state, playerId);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((entry, index) =>
    index === slot ? { ...entry, faceCardId: DISCOUNT_FACE.id, faceCardOwnerId: playerId } : entry,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function attachEquipment(state: GameState, ownerId: typeof P2, creatureId: CreatureId): GameState {
  const given = withHand(state, ownerId, [EQUIP.id]);
  const cardInstanceId = handCardIdAt(given, ownerId, 0);
  const card = given.cards[cardInstanceId];
  if (card === undefined) throw new Error("equipment instance");
  const attached: CardInstance = {
    ...card,
    zone: "equipment",
    attachedToCreatureId: creatureId,
  };
  const owner = given.players[ownerId];
  if (owner === undefined) throw new Error("owner");
  const creature = given.creatures[creatureId];
  if (creature === undefined) throw new Error("creature");
  return {
    ...given,
    cards: { ...given.cards, [cardInstanceId]: attached },
    players: {
      ...given.players,
      [ownerId]: {
        ...owner,
        hand: owner.hand.filter((id) => id !== cardInstanceId),
        equipment: [...owner.equipment, cardInstanceId],
      },
    },
    creatures: {
      ...given.creatures,
      [creatureId]: { ...creature, equipmentIds: [...creature.equipmentIds, cardInstanceId] },
    },
  };
}

describe("[Silence] instant", () => {
  it("opens a mixed chooser when any opposing host exists", () => {
    const state = playSilence(newMatch());
    expect(state.pendingDecision?.type).toBe("choose-silence-host");
    expect(eventTypesOf(state)).toContain("choose-silence-host-started");
  });

  it("silences an opposing creature: standing and equipment skip, Strike still deals", () => {
    const attackerId = creatureIdAt(newMatch(), P2, 0);
    const targetId = creatureIdAt(newMatch(), P1, 0);
    let state = attachEquipment(newMatch(), P2, attackerId);
    state = chooseSilence(playSilence(state), { host: "creature", creatureId: attackerId });
    expect(isCreatureSilenced(state, attackerId)).toBe(true);
    expect(state.creatures[attackerId]?.silenceExpiresOnTurn).toBe(state.turn + 2);

    const allyId = creatureIdAt(state, P2, 1);
    const symbolId = asSymbolInstanceId("sym-mechanical-silence");
    state = withActivePlayer(withPhase(state, "actions"), P2);
    state = {
      ...state,
      symbols: {
        ...state.symbols,
        [symbolId]: {
          id: symbolId,
          ownerId: P2,
          symbol: "mechanical",
          status: "rolled",
          sourceDieId: null,
          absorbedByCreatureId: null,
        },
      },
    };
    const beforeDiscount = state.forgeDiscountThisTurn[P2] ?? 0;
    const beforePool = state.players[P2]?.attributePool.mechanical ?? 0;
    state = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P2, symbolId, creatureId: allyId }),
    );
    expect(state.forgeDiscountThisTurn[P2] ?? 0).toBe(beforeDiscount);
    expect(state.players[P2]?.attributePool.mechanical ?? 0).toBe(beforePool + 1);

    state = withShowingFaces(withPile(state, P2, 10), P2, ["mechanical"]);
    const afterAttack = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P2,
        attackerId,
        attackId: CRANK,
        targetId,
      }),
    );
    expect(afterAttack.creatures[targetId]?.damage).toBe(2);
  });

  it("skips attack follow-up effects on a silenced attacker", () => {
    const match = newMatch({
      players: [
        { id: P1, squad: TEST_SQUAD, deck: [] },
        { id: P2, squad: [FOLLOW_UP_BODY.id, ...TEST_SQUAD.slice(1)], deck: [] },
      ],
    });
    const attackerId = creatureIdAt(match, P2, 0);
    const targetId = creatureIdAt(match, P1, 0);
    let state = chooseSilence(playSilence(match), {
      host: "creature",
      creatureId: attackerId,
    });
    state = withShowingFaces(withPile(withActivePlayer(withPhase(state, "actions"), P2), P2, 10), P2, [
      "mechanical",
      "mechanical",
    ]);
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P2,
        attackerId,
        attackId: FOLLOW_UP_ATTACK.id,
        targetId,
      }),
    );
    expect(after.creatures[targetId]?.damage).toBe(2);
    expect(after.pendingDecision).toBeNull();
    expect(after.forgeDiscountThisTurn[P2] ?? 0).toBe(0);
  });

  it("makes ACTIVATE_RITUAL illegal and skips continuous standing", () => {
    let state = actionsReady(P2, [ACTIVATE_RITUAL.id, STANDING_RITUAL.id]);
    state = withActivePlayer(state, P2);
    const pactId = handCardIdAt(state, P2, 0);
    const shopId = handCardIdAt(state, P2, 1);
    state = expectOk(
      advance(state, { type: "PLAY_CARD", playerId: P2, cardInstanceId: pactId }),
    );
    const ritualId = Object.values(state.cards).find(
      (card) => card.cardId === ACTIVATE_RITUAL.id && card.zone === "ritual",
    )?.id;
    if (ritualId === undefined) throw new Error("pact");
    state = {
      ...state,
      cards: {
        ...state.cards,
        [ritualId]: { ...state.cards[ritualId]!, ritualOrientation: "ready" },
      },
    };

    state = withActivePlayer(withPhase(state, "actions"), P2);
    state = expectOk(
      advance(state, { type: "PLAY_CARD", playerId: P2, cardInstanceId: shopId }),
    );
    const shopRitualId = Object.values(state.cards).find(
      (card) => card.cardId === STANDING_RITUAL.id && card.zone === "ritual",
    )?.id;
    if (shopRitualId === undefined) throw new Error("shop");
    state = {
      ...state,
      cards: {
        ...state.cards,
        [shopRitualId]: { ...state.cards[shopRitualId]!, ritualOrientation: "ready" },
      },
    };

    state = chooseSilence(playSilence(state), { host: "ritual", cardInstanceId: ritualId });
    expect(isRitualSilenced(state, ritualId)).toBe(true);

    state = withActivePlayer(withPhase(state, "actions"), P2);
    const activate = advance(state, {
      type: "ACTIVATE_RITUAL",
      playerId: P2,
      cardInstanceId: ritualId,
    });
    expect(activate.ok).toBe(false);
    if (activate.ok) return;
    expect(activate.error).toBe("CARD_NOT_AVAILABLE");

    state = chooseSilence(playSilence(activate.state), {
      host: "ritual",
      cardInstanceId: shopRitualId,
    });
    expect(isRitualSilenced(state, shopRitualId)).toBe(true);

    const dieId = dieIdOf(state, P2);
    let rolled = withActivePlayer(withPhase(state, "roll"), P2);
    rolled = withDie(rolled, dieId, { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, P2, 1), { retained: true, rolledSlotIndex: 4 });
    const afterRoll = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P2 }));
    const extra = eventTypesOf(afterRoll).filter((type) => type === "symbol-generated");
    expect(extra.length).toBeGreaterThan(0);
  });

  it("skips face onRoll and overloads on a silenced slot; pip still generates; other slot is free", () => {
    let state = installFace(newMatch(), P2, 0);
    state = installFace(state, P2, 1);
    const dieId = dieIdOf(state, P2);
    state = chooseSilence(playSilence(state), { host: "face", dieId, slotIndex: 0 });
    expect(isSlotSilenced(state, dieId, 0)).toBe(true);
    expect(isSlotSilenced(state, dieId, 1)).toBe(false);

    let rolled = withActivePlayer(withPhase(state, "roll"), P2);
    rolled = withDie(rolled, dieId, { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, P2, 1), { retained: true, rolledSlotIndex: 4 });
    const silencedRoll = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P2 }));
    expect(eventTypesOf(silencedRoll)).toContain("symbol-generated");
    expect(silencedRoll.players[P2]?.attributePool.mechanical ?? 0).toBe(2);
    expect(silencedRoll.playCostDiscountThisTurn[P2] ?? 0).toBe(0);

    let other = withActivePlayer(withPhase(state, "roll"), P2);
    other = withDie(other, dieId, { retained: true, rolledSlotIndex: 1 });
    other = withDie(other, dieIdOf(other, P2, 1), { retained: true, rolledSlotIndex: 4 });
    const otherRoll = expectOk(advance(other, { type: "ROLL_DICE", playerId: P2 }));
    expect((otherRoll.players[P2]?.attributePool.mechanical ?? 0) >= 2).toBe(true);
  });

  it("lasts through the opponent's turn and clears at the start of the silencer's next turn", () => {
    const creatureId = creatureIdAt(newMatch(), P2, 0);
    let state = chooseSilence(playSilence(newMatch()), {
      host: "creature",
      creatureId,
    });
    expect(state.turn).toBe(1);
    expect(isCreatureSilenced(state, creatureId)).toBe(true);

    state = withActivePlayer(state, P1);
    state = expectOk(advance(state, { type: "END_TURN", playerId: P1 }));
    expect(state.turn).toBe(2);
    expect(isCreatureSilenced(state, creatureId)).toBe(true);

    state = expectOk(advance(state, { type: "END_TURN", playerId: P2 }));
    expect(state.turn).toBe(3);
    expect(isCreatureSilenced(state, creatureId)).toBe(false);
  });

  it("whiffs when the legal set is empty", () => {
    const draft = createDraft(withPhase(newMatch(), "actions"));
    applyDeferredEffect(draft, {
      id: asEffectInstanceId("eff-silence-whiff"),
      controllerId: P1,
      effect: {
        type: "silence",
        hosts: ["ritual"],
        target: { kind: "choose-opponent-silence-host", hosts: ["ritual"] },
      },
      sourceCreatureId: null,
      declaredTargetCreatureId: null,
      declaredTargetCardInstanceId: null,
      sourceDieId: null,
      sourceSlotIndex: null,
      sourceCardInstanceId: null,
      ignoreShield: 0,
      fromAttack: false,
    });
    drainResolution(draft);
    expect(draft.pendingDecision).toBeNull();
    expect(Object.values(draft.creatures).some((creature) => creature.silenceExpiresOnTurn !== undefined)).toBe(
      false,
    );
  });

  it("applies the same opcode from an injected overload-sourced effect", () => {
    const creatureId = creatureIdAt(newMatch(), P2, 0);
    const draft = createDraft(withPhase(newMatch(), "actions"));
    applyDeferredEffect(draft, {
      id: asEffectInstanceId("eff-silence-overload"),
      controllerId: P1,
      effect: {
        type: "silence",
        hosts: ["creature"],
        target: { kind: "declared-target" },
      },
      sourceCreatureId: null,
      declaredTargetCreatureId: creatureId,
      declaredTargetCardInstanceId: null,
      sourceDieId: null,
      sourceSlotIndex: null,
      sourceCardInstanceId: asCardInstanceId("injected-overload"),
      ignoreShield: 0,
      fromAttack: false,
    });
    drainResolution(draft);
    expect(isCreatureSilenced(draft, creatureId)).toBe(true);
    expect(draft.creatures[creatureId]?.silenceExpiresOnTurn).toBe(draft.turn + 2);
    expect(draft.dice[dieIdOf(draft, P2)]?.stunMarkers ?? 0).toBe(0);
  });
});

function eventTypesOf(state: GameState): readonly string[] {
  return state.log.map((entry) => entry.event.type);
}
