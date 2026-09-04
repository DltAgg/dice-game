import { describe, expect, it } from "vitest";
import {
  BEACON_ARRAY,
  IDLER_GEAR,
  MACHINE_SHOP,
} from "../content/cards.js";
import { COGTOOTH } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { CreatureId, DieId, FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  withPile,
  withHand,
  withPhase,
  withSymbols,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

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

function withDamage(state: GameState, creatureId: CreatureId, damage: number): GameState {
  const creature = state.creatures[creatureId];
  if (creature === undefined) throw new Error("expected creature");
  return {
    ...state,
    creatures: { ...state.creatures, [creatureId]: { ...creature, damage } },
  };
}

function showingFace(state: GameState, faceCardId: FaceCardId): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("expected die");
  const slots = die.slots.map((slot, index) =>
    index === 0 ? { ...slot, faceCardId, faceCardOwnerId: P1 } : slot,
  );
  let next: GameState = {
    ...state,
    dice: { ...state.dice, [dieId]: { ...die, slots } },
  };
  next = withDie(next, dieId, { retained: true, rolledSlotIndex: 0 });
  next = withDie(next, dieIdOf(next, P1, 1), { retained: true, rolledSlotIndex: 4 });
  return next;
}

describe("Beacon Array", () => {
  it("heals the equipped host when the bearer banks Luminar", () => {
    const base = actionsReady([BEACON_ARRAY]);
    const bearerId = creatureIdAt(base, P1, 0);
    const equipped = expectOk(
      advance(
        withDamage(base, bearerId, 3),
        {
          type: "PLAY_CARD",
          playerId: P1,
          cardInstanceId: handCardIdAt(base, P1, 0),
          declaredTargetCreatureId: bearerId,
        },
      ),
    );
    const withPool = withSymbols(withPhase(equipped, "actions"), P1, ["luminar"], "rolled");
    const luminar = Object.values(withPool.symbols).find(
      (symbol) => symbol.symbol === "luminar" && symbol.status === "rolled",
    );
    if (luminar === undefined) throw new Error("expected rolled luminar");

    let after = expectOk(
      advance(withPool, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        symbolId: luminar.id,
      }),
    );
    if (after.pendingDecision?.type === "choose-creature") {
      after = expectOk(
        advance(after, {
          type: "RESOLVE_CHOOSE_CREATURE",
          playerId: P1,
          creatureId: bearerId,
        }),
      );
    }
    expect(after.creatures[bearerId]?.damage).toBe(2);
  });
});

describe("Idler Gear", () => {
  it("generates Mechanical on roll from an overloaded Mechanical face", () => {
    const base = showingFace(actionsReady([IDLER_GEAR]), COGTOOTH);
    const attached = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: COGTOOTH,
      }),
    );
    const afterRoll = expectOk(advance(withPhase(attached, "roll"), { type: "ROLL_DICE", playerId: P1 }));
    expect(afterRoll.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });
});

describe("Machine Shop", () => {
  it("generates Mechanical on roll while the continuous ritual is active", () => {
    const ready = actionsReady([MACHINE_SHOP]);
    const placed = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const afterRoll = expectOk(advance(withPhase(placed, "roll"), { type: "ROLL_DICE", playerId: P1 }));
    expect(afterRoll.players[P1]?.attributePool.mechanical ?? 0).toBeGreaterThanOrEqual(1);
  });
});
