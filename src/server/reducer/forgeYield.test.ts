import { describe, expect, it } from "vitest";
import { BLACK_PLAGUE, ECLIPSE, MARTIAL_BLESSING } from "../content/cards.js";
import {
  getFaceCard,
  INFECTION,
  naturalFaceId,
  SHADOW_ECHO,
  SHIELD_FACE_ID,
} from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { DieId, FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import {
  eventTypes,
  expectOk,
  forgeAction,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withAttributePool,
  withEnergy,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const forgeReady = (cards: Parameters<typeof withHand>[2]) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

function dieIdOf(state: GameState, playerId = P1, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("test: no die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function installOnSlot(
  state: GameState,
  dieId: DieId,
  slotIndex: number,
  faceCardId: FaceCardId,
  forgeYield: boolean,
): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
  return withDie(state, dieId, {
    slots: die.slots.map((slot) =>
      slot.index === slotIndex
        ? {
            ...slot,
            faceCardId,
            faceCardOwnerId: die.ownerId,
            forgeYield,
          }
        : slot,
    ),
  });
}

/** Both P1 dice show `primarySlot` / slot 4; roll phase. */
function retainBothDice(state: GameState, primarySlot: number): GameState {
  let next = state;
  const ids = next.players[P1]?.dieIds ?? [];
  for (const [i, id] of ids.entries()) {
    if (id === undefined) continue;
    next = withDie(next, id, {
      retained: true,
      rolledSlotIndex: i === 0 ? primarySlot : 4,
    });
  }
  return withPhase(next, "roll");
}

describe("forge yield and synthetic forge bank", () => {
  it("own-die natural FORGE_CARD sets forgeYield and does not bank from forge", () => {
    const state = forgeReady([MARTIAL_BLESSING]);
    const dieId = dieIdOf(state);
    const martialBefore = state.players[P1]?.attributePool.martial ?? 0;

    const result = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4])),
    );

    const slot = result.dice[dieId]?.slots[4];
    expect(slot?.faceCardId).toBe(naturalFaceId("martial"));
    expect(slot?.forgeYield).toBe(true);
    expect(result.players[P1]?.attributePool.martial).toBe(martialBefore);
  });

  it("own-die synthetic FORGE_CARD sets forgeYield and banks 1 of the face attribute", () => {
    const state = forgeReady([ECLIPSE]);
    const dieId = dieIdOf(state);
    // withEnergy(10): pay darkness 2, then bank forgeBankPerFace (1) → 9.
    const result = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4])),
    );

    const slot = result.dice[dieId]?.slots[4];
    expect(slot?.faceCardId).toBe(SHADOW_ECHO);
    expect(slot?.forgeYield).toBe(true);
    expect(getFaceCard(SHADOW_ECHO)?.symbol).toBe("darkness");
    expect(result.players[P1]?.attributePool.darkness).toBe(9);
    expect(eventTypes(result)).toContain("attribute-token-gained");
  });

  it("opponent-die forge does not set forgeYield but still draws", () => {
    let state = forgeReady([BLACK_PLAGUE]);
    const dieId = dieIdOf(state, P2, 0);
    const player = state.players[P1];
    if (player === undefined) throw new Error("test: no player");
    // Seed one deck card so draw-on-forge succeeds.
    const deckCardId = handCardIdAt(
      withHand(state, P1, [BLACK_PLAGUE, ECLIPSE]),
      P1,
      1,
    );
    const forgeCardId = handCardIdAt(state, P1, 0);
    const seeded = withHand(state, P1, [BLACK_PLAGUE, ECLIPSE]);
    const deckPlayer = seeded.players[P1]!;
    state = withEnergy(
      {
        ...seeded,
        cards: Object.fromEntries(
          Object.entries(seeded.cards).map(([id, card]) => [
            id,
            card.id === deckCardId ? { ...card, zone: "deck" as const } : card,
          ]),
        ),
        players: {
          ...seeded.players,
          [P1]: { ...deckPlayer, hand: [forgeCardId], deck: [deckCardId] },
        },
      },
      P1,
      10,
    );

    const result = expectOk(
      advance(state, forgeAction(state, P1, handCardIdAt(state, P1, 0), dieId, [4])),
    );

    expect(result.dice[dieId]?.slots[4]?.faceCardId).toBe(INFECTION);
    expect(result.dice[dieId]?.slots[4]?.forgeYield).toBeFalsy();
    expect(result.players[P1]?.hand).toHaveLength(1);
    expect(eventTypes(result)).toContain("card-drawn");
  });

  it("ROLL_DICE on forgeYield attribute face banks base + yield", () => {
    let withYield = withAttributePool(newMatch(), P1, {});
    withYield = installOnSlot(withYield, dieIdOf(withYield), 0, naturalFaceId("martial"), true);
    // Other die: Shield so only die 0 contributes martial.
    withYield = installOnSlot(withYield, dieIdOf(withYield, P1, 1), 4, SHIELD_FACE_ID, false);
    withYield = retainBothDice(withYield, 0);

    let withoutYield = withAttributePool(newMatch(), P1, {});
    withoutYield = installOnSlot(
      withoutYield,
      dieIdOf(withoutYield),
      0,
      naturalFaceId("martial"),
      false,
    );
    withoutYield = installOnSlot(
      withoutYield,
      dieIdOf(withoutYield, P1, 1),
      4,
      SHIELD_FACE_ID,
      false,
    );
    withoutYield = retainBothDice(withoutYield, 0);

    const yielded = expectOk(advance(withYield, { type: "ROLL_DICE", playerId: P1 }));
    const baseline = expectOk(advance(withoutYield, { type: "ROLL_DICE", playerId: P1 }));

    expect(yielded.players[P1]?.attributePool.martial).toBe(2);
    expect(baseline.players[P1]?.attributePool.martial).toBe(1);
    expect(yielded.players[P1]?.attributePool.martial).toBe(
      (baseline.players[P1]?.attributePool.martial ?? 0) + 1,
    );
  });

  it("forgeYield on Shield does not grant attribute", () => {
    let state = withAttributePool(newMatch(), P1, {});
    for (const id of state.players[P1]?.dieIds ?? []) {
      state = installOnSlot(state, id, 0, SHIELD_FACE_ID, true);
      state = withDie(state, id, { retained: true, rolledSlotIndex: 0 });
    }
    state = withPhase(state, "roll");

    const after = expectOk(advance(state, { type: "ROLL_DICE", playerId: P1 }));
    expect(after.players[P1]?.attributePool).toEqual({});
  });

  it("opening faces without forgeYield bank only the base pip", () => {
    let state = withAttributePool(newMatch(), P1, {});
    state = installOnSlot(state, dieIdOf(state), 0, naturalFaceId("martial"), false);
    state = installOnSlot(state, dieIdOf(state, P1, 1), 4, SHIELD_FACE_ID, false);
    expect(state.dice[dieIdOf(state)]?.slots[0]?.forgeYield).toBeFalsy();
    state = retainBothDice(state, 0);

    const after = expectOk(advance(state, { type: "ROLL_DICE", playerId: P1 }));
    expect(after.players[P1]?.attributePool.martial).toBe(1);
  });
});
