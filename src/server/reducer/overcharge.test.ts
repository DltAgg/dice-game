import { describe, expect, it } from "vitest";
import { MENDING_LIGHT, SCHOLARS_LIEN, TWIN_CAM, getCard } from "../content/cards.js";
import { naturalFaceId, PYRE_OF_NAMES } from "../content/faces.js";
import type { CardDefinition } from "../model/cards.js";
import type { DieState } from "../model/dice.js";
import { asCardId, type DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { graveyardOf } from "../rules/cards.js";
import {
  canOvercharge,
  isOverchargeLegalCard,
  legalOverchargeSlots,
} from "../rules/overcharge.js";
import {
  eventTypes,
  expectOk,
  forgeAction,
  handCardIdAt,
  newMatch,
  overchargeAction,
  P1,
  P2,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const DARKNESS_NATURAL = naturalFaceId("darkness");
const DARKNESS_SLOT = 0;
const SHIELD_SLOT = 4;

function dieIdOf(state: GameState, playerId = P1, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("expected a die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("expected die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function installFace(state: GameState, faceCardId: typeof DARKNESS_NATURAL, slot = DARKNESS_SLOT): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((candidate, index) =>
    index === slot ? { ...candidate, faceCardId, faceCardOwnerId: P1 } : candidate,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function actionsReady(cards: Parameters<typeof withHand>[2]): GameState {
  return installFace(withHand(withPhase(newMatch(), "actions"), P1, cards), DARKNESS_NATURAL);
}

function rollShowingSlot(state: GameState, slot: number): GameState {
  let rolled: GameState = withPhase(state, "roll");
  rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: slot });
  rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: SHIELD_SLOT });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
}

function declineOptionalDiscard(state: GameState): GameState {
  if (state.pendingDecision?.type !== "discard-cards") return state;
  return expectOk(
    advance(state, { type: "RESOLVE_DISCARD", playerId: P1, cardInstanceIds: [] }),
  );
}

function opponentDieNatural(): CardDefinition {
  return {
    id: asCardId("card-example-opponent-natural"),
    name: "Example Opponent Natural",
    playCost: { corruption: 2 },
    type: "instant",
    subtypes: [],
    attribute: "corruption",
    forge: { faces: 1, kind: "natural", attribute: "corruption", target: "opponent-die" },
    rulesText: "Test.",
  };
}

describe("tactic Overcharge", () => {
  it("Scholar's Lien Overcharges Darkness Natural; next roll generates Darkness and Arcane", () => {
    const ready = actionsReady([SCHOLARS_LIEN]);
    const dieId = dieIdOf(ready);
    const cardId = handCardIdAt(ready, P1, 0);
    expect(canOvercharge(ready, P1, cardId)).toBe(true);
    expect(
      legalOverchargeSlots(ready, P1).some(
        (slot) => slot.dieId === dieId && slot.slotIndex === DARKNESS_SLOT,
      ),
    ).toBe(true);

    const pileBefore = { ...ready.players[P1]?.attributePool };
    const charged = expectOk(
      advance(ready, overchargeAction(P1, cardId, dieId, DARKNESS_SLOT)),
    );

    expect(charged.dice[dieId]?.slots[DARKNESS_SLOT]?.overcharge).toEqual(["arcane"]);
    expect(graveyardOf(charged, P1).map((card) => card.id)).toEqual([cardId]);
    expect(charged.players[P1]?.attributePool).toEqual(pileBefore);
    expect(eventTypes(charged)).toContain("face-overcharged");
    expect(eventTypes(charged).filter((type) => type === "card-drawn")).toHaveLength(0);
    expect(canOvercharge(charged, P1, cardId)).toBe(false);

    const rolled = rollShowingSlot(charged, DARKNESS_SLOT);
    expect(rolled.players[P1]?.attributePool.darkness).toBe(1);
    expect(rolled.players[P1]?.attributePool.arcane).toBe(1);
  });

  it("Overcharges Pyre of Names the same way (synthetic keeper)", () => {
    const ready = installFace(actionsReady([SCHOLARS_LIEN]), PYRE_OF_NAMES);
    const dieId = dieIdOf(ready);
    const charged = expectOk(
      advance(ready, overchargeAction(P1, handCardIdAt(ready, P1, 0), dieId, DARKNESS_SLOT)),
    );
    expect(charged.dice[dieId]?.slots[DARKNESS_SLOT]?.overcharge).toEqual(["arcane"]);

    const rolled = declineOptionalDiscard(rollShowingSlot(charged, DARKNESS_SLOT));
    expect((rolled.players[P1]?.attributePool.darkness ?? 0) >= 1).toBe(true);
    expect(rolled.players[P1]?.attributePool.arcane).toBe(1);
  });

  it("refuses a second Overcharge the same turn and leaves state identity unchanged", () => {
    const ready = actionsReady([SCHOLARS_LIEN, SCHOLARS_LIEN]);
    const dieId = dieIdOf(ready);
    const charged = expectOk(
      advance(ready, overchargeAction(P1, handCardIdAt(ready, P1, 0), dieId, DARKNESS_SLOT)),
    );
    const second = advance(
      charged,
      overchargeAction(P1, handCardIdAt(charged, P1, 0), dieId, DARKNESS_SLOT),
    );
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("ALREADY_USED");
    expect(second.state).toBe(charged);
  });

  it("synthetic-forge card cannot Overcharge", () => {
    const ready = actionsReady([TWIN_CAM]);
    const dieId = dieIdOf(ready);
    const cardId = handCardIdAt(ready, P1, 0);
    expect(canOvercharge(ready, P1, cardId)).toBe(false);
    const result = advance(ready, overchargeAction(P1, cardId, dieId, DARKNESS_SLOT));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("CARD_HAS_NO_EFFECT");
    expect(result.state).toBe(ready);
  });

  it("opponent-die natural forge cannot Overcharge", () => {
    const scholars = getCard(SCHOLARS_LIEN);
    if (scholars === undefined) throw new Error("Scholar's Lien");
    expect(isOverchargeLegalCard(scholars)).toBe(true);
    expect(isOverchargeLegalCard(opponentDieNatural())).toBe(false);
  });

  it("Shield / untyped slot is illegal", () => {
    const ready = actionsReady([SCHOLARS_LIEN]);
    const dieId = dieIdOf(ready);
    const slots = legalOverchargeSlots(ready, P1);
    expect(slots.some((slot) => slot.dieId === dieId && slot.slotIndex === SHIELD_SLOT)).toBe(
      false,
    );
    const result = advance(
      ready,
      overchargeAction(P1, handCardIdAt(ready, P1, 0), dieId, SHIELD_SLOT),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_FACE");
    expect(result.state).toBe(ready);
  });

  it("overwrite clears Overcharge pips", () => {
    const ready = actionsReady([SCHOLARS_LIEN, MENDING_LIGHT]);
    const dieId = dieIdOf(ready);
    const charged = expectOk(
      advance(ready, overchargeAction(P1, handCardIdAt(ready, P1, 0), dieId, DARKNESS_SLOT)),
    );
    const forged = expectOk(
      advance(
        charged,
        forgeAction(charged, P1, handCardIdAt(charged, P1, 0), dieId, [DARKNESS_SLOT]),
      ),
    );
    expect(forged.dice[dieId]?.slots[DARKNESS_SLOT]?.overcharge ?? []).toEqual([]);
    expect(forged.dice[dieId]?.slots[DARKNESS_SLOT]?.faceCardId).toBe(naturalFaceId("luminar"));

    const rolled = rollShowingSlot(forged, DARKNESS_SLOT);
    expect(rolled.players[P1]?.attributePool.arcane ?? 0).toBe(0);
    expect((rolled.players[P1]?.attributePool.luminar ?? 0) >= 1).toBe(true);
  });

  it("suppress inherent still generates Overcharge pips", () => {
    const ready = actionsReady([SCHOLARS_LIEN]);
    const dieId = dieIdOf(ready);
    const charged = expectOk(
      advance(ready, overchargeAction(P1, handCardIdAt(ready, P1, 0), dieId, DARKNESS_SLOT)),
    );
    const suppressed = withDie(charged, dieId, {
      slots: charged.dice[dieId]!.slots.map((slot) =>
        slot.index === DARKNESS_SLOT ? { ...slot, suppressInherentNextRoll: true } : slot,
      ),
    });
    const rolled = rollShowingSlot(suppressed, DARKNESS_SLOT);
    expect(rolled.players[P1]?.attributePool.arcane).toBe(1);
    expect(rolled.players[P1]?.attributePool.darkness ?? 0).toBe(0);
  });

  it("does not Overcharge an opponent's die", () => {
    const ready = actionsReady([SCHOLARS_LIEN]);
    const theirs = dieIdOf(ready, P2);
    const result = advance(
      ready,
      overchargeAction(P1, handCardIdAt(ready, P1, 0), theirs, DARKNESS_SLOT),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
    expect(result.state).toBe(ready);
  });
});
