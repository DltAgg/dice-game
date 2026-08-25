import { describe, expect, it } from "vitest";
import {
  CONCENTRATE,
  EMBER_TIDE,
  ICHOR_SHEATH,
  VENOM_FONT,
} from "../content/cards.js";
import { BLIGHT, SEEP } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { CreatureId, DieId, FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withEnergy,
  withHand,
  withPhase,
  withSymbols,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: Parameters<typeof withHand>[2]) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

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

function withToxin(state: GameState, creatureId: CreatureId, toxinMarkers: number): GameState {
  const creature = state.creatures[creatureId];
  if (creature === undefined) throw new Error("expected creature");
  return {
    ...state,
    creatures: { ...state.creatures, [creatureId]: { ...creature, toxinMarkers } },
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

describe("Concentrate", () => {
  it("applies 2 extra Toxin to a chosen enemy that already has Toxin", () => {
    const enemyId = creatureIdAt(actionsReady([CONCENTRATE]), P2, 0);
    const ready = withToxin(withSymbols(actionsReady([CONCENTRATE]), P1, ["toxin"]), enemyId, 1);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const after = expectOk(
      advance(played, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: enemyId,
      }),
    );
    expect(after.creatures[enemyId]?.toxinMarkers).toBe(3);
  });

  it("whiffs when no enemy has Toxin", () => {
    const ready = withSymbols(actionsReady([CONCENTRATE]), P1, ["toxin"]);
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.pendingDecision).toBeNull();
    const enemyId = creatureIdAt(after, P2, 0);
    expect(after.creatures[enemyId]?.toxinMarkers).toBe(0);
  });
});

describe("Venom Font", () => {
  it("applies Toxin to a chosen enemy when the bearer absorbs Toxin", () => {
    const base = actionsReady([VENOM_FONT]);
    const bearerId = creatureIdAt(base, P1, 0);
    const equipped = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredTargetCreatureId: bearerId,
      }),
    );
    const withPool = withSymbols(withPhase(equipped, "actions"), P1, ["toxin"], "rolled");
    const toxin = Object.values(withPool.symbols).find(
      (symbol) => symbol.symbol === "toxin" && symbol.status === "rolled",
    );
    if (toxin === undefined) throw new Error("expected rolled toxin");

    const absorbed = expectOk(
      advance(withPool, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: bearerId,
        symbolId: toxin.id,
      }),
    );
    expect(absorbed.pendingDecision?.type).toBe("choose-creature");
    const enemyId = creatureIdAt(absorbed, P2, 0);
    const after = expectOk(
      advance(absorbed, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: enemyId,
      }),
    );
    expect(after.creatures[enemyId]?.toxinMarkers).toBe(1);
  });
});

describe("Ichor Sheath", () => {
  it("deals 1 on absorb from an overloaded Toxin face", () => {
    const base = showingFace(actionsReady([ICHOR_SHEATH]), SEEP);
    const attached = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: SEEP,
      }),
    );
    const afterRoll = expectOk(advance(withPhase(attached, "roll"), { type: "ROLL_DICE", playerId: P1 }));
    expect(afterRoll.players[P1]?.attributePool.toxin ?? 0).toBeGreaterThanOrEqual(1);
    expect(afterRoll.pendingDecision?.type).toBe("choose-creature");
    const enemyId = creatureIdAt(afterRoll, P2, 0);
    const after = expectOk(
      advance(afterRoll, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: enemyId,
      }),
    );
    expect(after.creatures[enemyId]?.damage).toBe(1);
  });
});

describe("Ember Tide", () => {
  it("deals 1 on roll from an overloaded Corruption face", () => {
    const base = showingFace(actionsReady([EMBER_TIDE]), BLIGHT);
    const attached = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredFaceCardId: BLIGHT,
      }),
    );
    const afterRoll = expectOk(
      advance(withPhase(attached, "roll"), { type: "ROLL_DICE", playerId: P1 }),
    );
    expect(afterRoll.pendingDecision?.type).toBe("choose-creature");
    const enemyId = creatureIdAt(afterRoll, P2, 0);
    const after = expectOk(
      advance(afterRoll, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: enemyId,
      }),
    );
    expect(after.creatures[enemyId]?.damage).toBe(1);
  });
});
