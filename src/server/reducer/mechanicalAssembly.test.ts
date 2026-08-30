import { describe, expect, it } from "vitest";
import {
  COG_DRAFT,
  MACHINE_SHOP,
  RECAST,
  SHIM_KIT,
  TEMPERING_LINE,
  TOOLING_ORDER,
  TWIN_CAM,
} from "../content/cards.js";
import { COGTOOTH, GEAR_TRAIN, MAINSPRING } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { ritualsOf } from "../rules/cards.js";
import { advance } from "./reduce.js";
import {
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  resolveOpenChain,
  withPile,
  withHand,
  withPhase,
} from "../testing/scenario.js";

const playCard = (state: ReturnType<typeof newMatch>, index = 0) =>
  resolveOpenChain(
    expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, index),
      }),
    ),
  );

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

function dieIdOf(state: GameState, index = 0): DieId {
  const id = state.players[P1]?.dieIds[index];
  if (id === undefined) throw new Error("die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function forgedSyntheticCount(state: GameState, dieId: DieId): number {
  const die = state.dice[dieId];
  if (die === undefined) return 0;
  return die.slots.filter((slot) => {
    const id = slot.faceCardId;
    return id.length > 0 && !id.includes("shield") && !id.includes("natural");
  }).length;
}

describe("Tempo mechanical assembly", () => {
  it("Tooling Order forges two synthetic Mechanical faces on play", () => {
    const ready = actionsReady([TOOLING_ORDER]);
    const dieId = dieIdOf(ready);
    const played = playCard(ready);
    expect(played.pendingDecision?.type).toBe("forge-faces");
    const forged = expectOk(
      advance(played, {
        type: "RESOLVE_FORGE_FACES",
        playerId: P1,
        dieId,
        slotIndexes: [3, 4],
        faceCardId: COGTOOTH,
      }),
    );
    expect(forgedSyntheticCount(forged, dieId)).toBeGreaterThanOrEqual(2);
  });

  it("Tempering Line places a ritual and arms forge discount on activate", () => {
    const ready = actionsReady([TEMPERING_LINE]);
    const placed = playCard(ready);
    expect(ritualsOf(placed, P1)).toHaveLength(1);
    const ritualId = ritualsOf(placed, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("ritual");
    const dieId = dieIdOf(placed);
    let activated = expectOk(
      advance(
        {
          ...placed,
          cards: {
            ...placed.cards,
            [ritualId]: { ...placed.cards[ritualId]!, ritualOrientation: "ready" },
          },
          players: {
            ...placed.players,
            [P1]: { ...placed.players[P1]!, attributePool: { mechanical: 4 } },
          },
        },
        { type: "ACTIVATE_RITUAL", playerId: P1, cardInstanceId: ritualId },
      ),
    );
    if (activated.pendingDecision?.type === "forge-faces") {
      activated = expectOk(
        advance(activated, {
          type: "RESOLVE_FORGE_FACES",
          playerId: P1,
          dieId,
          slotIndexes: [3, 4],
          faceCardId: COGTOOTH,
        }),
      );
    }
    activated = resolveOpenChain(activated);
    expect(activated.log.some((entry) => entry.event.type === "ritual-activated")).toBe(true);
  });

  it("Machine Shop generates Mechanical on roll when active", () => {
    const ready = actionsReady([MACHINE_SHOP]);
    const placed = playCard(ready);
    let rolled = withPhase(placed, "roll");
    rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, 1), { retained: true, rolledSlotIndex: 4 });
    const after = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("Twin Cam doubles the next face effect", () => {
    const after = playCard(actionsReady([TWIN_CAM]));
    expect(after.resolveNextFaceEffectTwice[P1]).toBe(true);
  });

  it("Recast opens replace-synthetic-face on a synthetic slot", () => {
    let state = actionsReady([RECAST]);
    const dieId = dieIdOf(state);
    state = {
      ...state,
      dice: {
        ...state.dice,
        [dieId]: {
          ...state.dice[dieId]!,
          slots: state.dice[dieId]!.slots.map((slot, index) =>
            index === 0 ? { ...slot, faceCardId: COGTOOTH, faceCardOwnerId: P1 } : slot,
          ),
        },
      },
    };
    const played = playCard(state);
    expect(played.pendingDecision?.type).toBe("replace-synthetic-face");
  });

  it("catalogue lists the mechanical face trio", () => {
    expect([COGTOOTH, GEAR_TRAIN, MAINSPRING]).toHaveLength(3);
  });

  it("Cog Draft generates pile fuel", () => {
    const after = playCard(actionsReady([COG_DRAFT]));
    expect(after.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("Shim Kit leaves forge discount after play resolves", () => {
    const after = playCard(actionsReady([SHIM_KIT]));
    expect(after.forgeDiscountThisTurn[P1]).toBe(2);
  });
});
