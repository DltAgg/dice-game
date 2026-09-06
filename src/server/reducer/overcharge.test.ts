import { describe, expect, it } from "vitest";
import type { DieState } from "../model/dice.js";
import { type DieId, type FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { graveyardOf } from "../rules/cards.js";
import { canOvercharge, legalOverchargeFaces } from "../rules/overcharge.js";
import {
  TEST_NATURAL_FORGE,
  TEST_OVERCHARGE_ARCANE,
  TEST_OVERCHARGE_MECHANICAL,
  TEST_SHIELD_FACE_ID,
  testFace,
  testNaturalFaceId,
} from "../testing/fixtures/index.js";
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

const DARKNESS_NATURAL = testNaturalFaceId("darkness");
const DARKNESS_SLOT = 0;
const SHIELD_SLOT = 4;

const CONVERT_KEEPER = testFace({
  id: "face-test-convert-keeper",
  kind: "synthetic",
  symbol: "darkness",
  convertRoll: true,
  onRoll: [
    {
      type: "drain-life",
      amount: 2,
      target: { kind: "choose-enemy" },
      with: { kind: "most-damaged-ally" },
    },
  ],
});

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

function installFaceOnDie(
  state: GameState,
  dieId: DieId,
  faceCardId: FaceCardId,
  slot = DARKNESS_SLOT,
  ownerId = P1,
): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((candidate, index) =>
    index === slot ? { ...candidate, faceCardId, faceCardOwnerId: ownerId } : candidate,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function installFace(
  state: GameState,
  faceCardId: FaceCardId,
  slot = DARKNESS_SLOT,
  dieIndex = 0,
): GameState {
  return installFaceOnDie(state, dieIdOf(state, P1, dieIndex), faceCardId, slot);
}

function actionsReady(cards: Parameters<typeof withHand>[2]): GameState {
  return installFace(withHand(withPhase(newMatch(), "actions"), P1, cards), DARKNESS_NATURAL);
}

function rollShowingSlots(state: GameState, slot0: number, slot1: number): GameState {
  let rolled: GameState = withPhase(state, "roll");
  rolled = withDie(rolled, dieIdOf(rolled, P1, 0), { retained: true, rolledSlotIndex: slot0 });
  rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: slot1 });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
}

function rollShowingSlot(state: GameState, slot: number): GameState {
  return rollShowingSlots(state, slot, SHIELD_SLOT);
}

describe("tactic Overcharge", () => {
  it("Overcharges a Darkness Natural face; next roll generates Darkness and Arcane", () => {
    const ready = actionsReady([TEST_OVERCHARGE_ARCANE]);
    const cardId = handCardIdAt(ready, P1, 0);
    expect(canOvercharge(ready, P1, cardId)).toBe(true);
    expect(legalOverchargeFaces(ready, P1)).toContain(DARKNESS_NATURAL);

    const pileBefore = { ...ready.players[P1]?.attributePool };
    const charged = expectOk(advance(ready, overchargeAction(P1, cardId, DARKNESS_NATURAL)));

    expect(charged.players[P1]?.overchargeByFace[DARKNESS_NATURAL]).toEqual(["arcane"]);
    expect(charged.dice[dieIdOf(charged)]?.slots[DARKNESS_SLOT]).not.toHaveProperty("overcharge");
    expect(graveyardOf(charged, P1).map((card) => card.id)).toEqual([cardId]);
    expect(charged.players[P1]?.attributePool).toEqual(pileBefore);
    expect(eventTypes(charged)).toContain("face-overcharged");
    expect(eventTypes(charged).filter((type) => type === "card-drawn")).toHaveLength(0);
    expect(canOvercharge(charged, P1, cardId)).toBe(false);

    const rolled = rollShowingSlot(charged, DARKNESS_SLOT);
    expect(rolled.players[P1]?.attributePool.darkness).toBe(1);
    expect(rolled.players[P1]?.attributePool.arcane).toBe(1);
  });

  it("Overcharges a convert synthetic the same way (keeper does not bank)", () => {
    const ready = installFace(actionsReady([TEST_OVERCHARGE_ARCANE]), CONVERT_KEEPER.id);
    const charged = expectOk(
      advance(ready, overchargeAction(P1, handCardIdAt(ready, P1, 0), CONVERT_KEEPER.id)),
    );
    expect(charged.players[P1]?.overchargeByFace[CONVERT_KEEPER.id]).toEqual(["arcane"]);

    const rolled = rollShowingSlot(charged, DARKNESS_SLOT);
    expect(rolled.players[P1]?.attributePool.darkness ?? 0).toBe(0);
    expect(rolled.players[P1]?.attributePool.arcane ?? 0).toBe(0);
    expect(rolled.pendingDecision?.type).toBe("choose-creature");
  });

  it("one Overcharge on two copies generates Arcane once per showing die", () => {
    const ready = installFace(actionsReady([TEST_OVERCHARGE_ARCANE]), DARKNESS_NATURAL, DARKNESS_SLOT, 1);
    expect(legalOverchargeFaces(ready, P1).filter((id) => id === DARKNESS_NATURAL)).toHaveLength(1);

    const charged = expectOk(
      advance(ready, overchargeAction(P1, handCardIdAt(ready, P1, 0), DARKNESS_NATURAL)),
    );
    expect(charged.players[P1]?.overchargeByFace[DARKNESS_NATURAL]).toEqual(["arcane"]);

    const rolled = rollShowingSlots(charged, DARKNESS_SLOT, DARKNESS_SLOT);
    expect(rolled.players[P1]?.attributePool.darkness).toBe(2);
    expect(rolled.players[P1]?.attributePool.arcane).toBe(2);
  });

  it("overwrite of one copy keeps Overcharge on the remaining copy", () => {
    const ready = installFace(
      actionsReady([TEST_OVERCHARGE_ARCANE, TEST_NATURAL_FORGE]),
      DARKNESS_NATURAL,
      DARKNESS_SLOT,
      1,
    );
    const charged = expectOk(
      advance(ready, overchargeAction(P1, handCardIdAt(ready, P1, 0), DARKNESS_NATURAL)),
    );
    const die0 = dieIdOf(charged);
    const forged = expectOk(
      advance(
        charged,
        forgeAction(charged, P1, handCardIdAt(charged, P1, 0), die0, [DARKNESS_SLOT]),
      ),
    );
    expect(forged.players[P1]?.overchargeByFace[DARKNESS_NATURAL]).toEqual(["arcane"]);
    expect(forged.dice[dieIdOf(forged, P1, 1)]?.slots[DARKNESS_SLOT]?.faceCardId).toBe(
      DARKNESS_NATURAL,
    );

    const rolled = rollShowingSlots(forged, SHIELD_SLOT, DARKNESS_SLOT);
    expect(rolled.players[P1]?.attributePool.arcane).toBe(1);
    expect(rolled.players[P1]?.attributePool.darkness).toBe(1);
  });

  it("overwrite of the last copy clears Overcharge", () => {
    const ready = actionsReady([TEST_OVERCHARGE_ARCANE, TEST_NATURAL_FORGE]);
    const dieId = dieIdOf(ready);
    const charged = expectOk(
      advance(ready, overchargeAction(P1, handCardIdAt(ready, P1, 0), DARKNESS_NATURAL)),
    );
    const forged = expectOk(
      advance(
        charged,
        forgeAction(charged, P1, handCardIdAt(charged, P1, 0), dieId, [DARKNESS_SLOT]),
      ),
    );
    expect(forged.players[P1]?.overchargeByFace[DARKNESS_NATURAL]).toBeUndefined();
    expect(forged.dice[dieId]?.slots[DARKNESS_SLOT]?.faceCardId).toBe(testNaturalFaceId("luminar"));

    const rolled = rollShowingSlot(forged, DARKNESS_SLOT);
    expect(rolled.players[P1]?.attributePool.arcane ?? 0).toBe(0);
    expect((rolled.players[P1]?.attributePool.luminar ?? 0) >= 1).toBe(true);
  });

  it("refuses a second Overcharge the same turn and leaves state identity unchanged", () => {
    const ready = actionsReady([TEST_OVERCHARGE_ARCANE, TEST_OVERCHARGE_ARCANE]);
    const charged = expectOk(
      advance(ready, overchargeAction(P1, handCardIdAt(ready, P1, 0), DARKNESS_NATURAL)),
    );
    const second = advance(
      charged,
      overchargeAction(P1, handCardIdAt(charged, P1, 0), DARKNESS_NATURAL),
    );
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("ALREADY_USED");
    expect(second.state).toBe(charged);
  });

  it("stacks two Overcharges on the same face: next roll Generates +2", () => {
    const ready = actionsReady([TEST_OVERCHARGE_ARCANE, TEST_OVERCHARGE_ARCANE]);
    const firstId = handCardIdAt(ready, P1, 0);
    const secondId = handCardIdAt(ready, P1, 1);
    const once = expectOk(advance(ready, overchargeAction(P1, firstId, DARKNESS_NATURAL)));
    const p2Turn = expectOk(advance(once, { type: "END_TURN", playerId: P1 }));
    const p1Again = withPhase(
      expectOk(advance(p2Turn, { type: "END_TURN", playerId: P2 })),
      "actions",
    );
    expect(canOvercharge(p1Again, P1, secondId)).toBe(true);
    const twice = expectOk(advance(p1Again, overchargeAction(P1, secondId, DARKNESS_NATURAL)));
    expect(twice.players[P1]?.overchargeByFace[DARKNESS_NATURAL]).toEqual(["arcane", "arcane"]);

    const rolled = rollShowingSlot(twice, DARKNESS_SLOT);
    expect(rolled.players[P1]?.attributePool.darkness).toBe(1);
    expect(rolled.players[P1]?.attributePool.arcane).toBe(2);
  });

  it("synthetic-forge card can Overcharge with Mechanical", () => {
    const ready = actionsReady([TEST_OVERCHARGE_MECHANICAL]);
    const cardId = handCardIdAt(ready, P1, 0);
    expect(canOvercharge(ready, P1, cardId)).toBe(true);
    const charged = expectOk(advance(ready, overchargeAction(P1, cardId, DARKNESS_NATURAL)));
    expect(charged.players[P1]?.overchargeByFace[DARKNESS_NATURAL]).toEqual(["mechanical"]);
    expect(graveyardOf(charged, P1).map((card) => card.id)).toEqual([cardId]);

    const rolled = rollShowingSlot(charged, DARKNESS_SLOT);
    expect(rolled.players[P1]?.attributePool.darkness).toBe(1);
    expect(rolled.players[P1]?.attributePool.mechanical).toBe(1);
  });

  it("Shield / untyped face is illegal", () => {
    const ready = actionsReady([TEST_OVERCHARGE_ARCANE]);
    expect(legalOverchargeFaces(ready, P1)).not.toContain(TEST_SHIELD_FACE_ID);
    const result = advance(
      ready,
      overchargeAction(P1, handCardIdAt(ready, P1, 0), TEST_SHIELD_FACE_ID),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_FACE");
    expect(result.state).toBe(ready);
  });

  it("suppress inherent still generates Overcharge pips", () => {
    const ready = actionsReady([TEST_OVERCHARGE_ARCANE]);
    const dieId = dieIdOf(ready);
    const charged = expectOk(
      advance(ready, overchargeAction(P1, handCardIdAt(ready, P1, 0), DARKNESS_NATURAL)),
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

  it("does not Overcharge an opponent's face card", () => {
    const ready = withHand(withPhase(newMatch(), "actions"), P1, [TEST_OVERCHARGE_ARCANE]);
    const onTheirs = installFaceOnDie(
      ready,
      dieIdOf(ready, P2),
      DARKNESS_NATURAL,
      DARKNESS_SLOT,
      P2,
    );
    expect(legalOverchargeFaces(onTheirs, P1)).not.toContain(DARKNESS_NATURAL);
    const result = advance(
      onTheirs,
      overchargeAction(P1, handCardIdAt(onTheirs, P1, 0), DARKNESS_NATURAL),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
    expect(result.state).toBe(onTheirs);
  });
});
