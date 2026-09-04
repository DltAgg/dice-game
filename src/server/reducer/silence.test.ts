import { describe, expect, it } from "vitest";
import { DRIVESHAFT_RIG, MACHINE_SHOP, NIGHTMARROW_PACT, STILLED_VERSE } from "../content/cards.js";
import { COGTOOTH } from "../content/faces.js";
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
  advanceResolvingChain as advance,
} from "../testing/scenario.js";
import { CRANK, RETOOL } from "../testing/tempoCatalogue.js";

const actionsReady = (playerId: typeof P1 | typeof P2, cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), playerId, cards), playerId, 10);

function playStilledVerse(state: GameState): GameState {
  const ready = withActivePlayer(
    withPile(withHand(withPhase(state, "actions"), P1, [STILLED_VERSE]), P1, 10),
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

function installFace(state: GameState, playerId: typeof P1 | typeof P2, faceCardId: typeof COGTOOTH, slot = 0): GameState {
  const dieId = dieIdOf(state, playerId);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((entry, index) =>
    index === slot ? { ...entry, faceCardId, faceCardOwnerId: playerId } : entry,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function attachEquipment(state: GameState, ownerId: typeof P2, creatureId: CreatureId): GameState {
  const given = withHand(state, ownerId, [DRIVESHAFT_RIG]);
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
    const state = playStilledVerse(newMatch());
    expect(state.pendingDecision?.type).toBe("choose-silence-host");
    expect(eventTypesOf(state)).toContain("choose-silence-host-started");
  });

  it("silences an opposing creature: standing and equipment skip, Strike still deals", () => {
    const attackerId = creatureIdAt(newMatch(), P2, 0);
    const targetId = creatureIdAt(newMatch(), P1, 0);
    let state = attachEquipment(newMatch(), P2, attackerId);
    state = chooseSilence(playStilledVerse(state), { host: "creature", creatureId: attackerId });
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

    state = withPile(state, P2, 10);
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
    expect(afterAttack.pendingDecision?.type).not.toBe("replace-synthetic-face");
  });

  it("skips attack follow-up effects on a silenced attacker", () => {
    const attackerId = creatureIdAt(newMatch(), P2, 0);
    const targetId = creatureIdAt(newMatch(), P1, 0);
    let state = chooseSilence(playStilledVerse(newMatch()), {
      host: "creature",
      creatureId: attackerId,
    });
    state = withPile(withActivePlayer(withPhase(state, "actions"), P2), P2, 10);
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P2,
        attackerId,
        attackId: RETOOL,
        targetId,
      }),
    );
    expect(after.creatures[targetId]?.damage).toBe(2);
    expect(after.pendingDecision).toBeNull();
  });

  it("makes ACTIVATE_RITUAL illegal and skips continuous standing", () => {
    let state = actionsReady(P2, [NIGHTMARROW_PACT, MACHINE_SHOP]);
    state = withActivePlayer(state, P2);
    const pactId = handCardIdAt(state, P2, 0);
    const shopId = handCardIdAt(state, P2, 1);
    state = expectOk(
      advance(state, { type: "PLAY_CARD", playerId: P2, cardInstanceId: pactId }),
    );
    const ritualId = Object.values(state.cards).find(
      (card) => card.cardId === NIGHTMARROW_PACT && card.zone === "ritual",
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
      (card) => card.cardId === MACHINE_SHOP && card.zone === "ritual",
    )?.id;
    if (shopRitualId === undefined) throw new Error("shop");
    state = {
      ...state,
      cards: {
        ...state.cards,
        [shopRitualId]: { ...state.cards[shopRitualId]!, ritualOrientation: "ready" },
      },
    };

    state = chooseSilence(playStilledVerse(state), { host: "ritual", cardInstanceId: ritualId });
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

    state = chooseSilence(playStilledVerse(activate.state), {
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
    let state = installFace(newMatch(), P2, COGTOOTH, 0);
    state = installFace(state, P2, COGTOOTH, 1);
    const dieId = dieIdOf(state, P2);
    state = chooseSilence(playStilledVerse(state), { host: "face", dieId, slotIndex: 0 });
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
    let state = chooseSilence(playStilledVerse(newMatch()), {
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
