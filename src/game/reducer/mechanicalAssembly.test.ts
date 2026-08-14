import { describe, expect, it } from "vitest";
import { ASSEMBLY_LINE, RATCHET } from "../content/cards.js";
import { FLYWHEEL, faceIdForSymbol, syntheticFaceId } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { CardId, DieId, FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import type { AttributeTokens } from "../model/symbols.js";
import { SHIELD } from "../model/symbols.js";
import { ritualsOf } from "../rules/cards.js";
import { symbolCountsOn } from "../rules/dice.js";
import { usableSymbols } from "../rules/symbols.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withEnergy,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][], energy = 10) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

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

function installFace(state: GameState, faceCardId: FaceCardId, slot = 0): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
  const slots = die.slots.map((s, index) =>
    index === slot ? { ...s, faceCardId, faceCardOwnerId: P1 } : s,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function rollShowingSlot(state: GameState, slot: number): GameState {
  let rolled: GameState = withPhase(state, "roll");
  rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: slot });
  rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 0 });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
}

function placedReadyRitual(cardId: CardId, progress: AttributeTokens) {
  const base = actionsReady([cardId]);
  const placed = expectOk(
    advance(base, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(base, P1, 0),
    }),
  );
  const ritualId = ritualsOf(placed, P1)[0]?.id;
  if (ritualId === undefined) throw new Error("test: no ritual");
  return {
    ritualId,
    state: {
      ...placed,
      cards: {
        ...placed.cards,
        [ritualId]: {
          ...placed.cards[ritualId]!,
          ritualOrientation: "ready" as const,
          ritualProgress: progress,
        },
      },
    },
  };
}

describe("Ratchet", () => {
  const mechanicalFace = syntheticFaceId("mechanical");

  it("attaches to a Mechanical face and refuses any other attribute", () => {
    const ready = installFace(actionsReady([RATCHET, RATCHET]), mechanicalFace);
    const attached = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredFaceCardId: mechanicalFace,
      }),
    );
    expect(eventTypes(attached)).toContain("overload-attached");

    const refused = advance(attached, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(attached, P1, 0),
      declaredFaceCardId: faceIdForSymbol("luminar"),
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INVALID_TARGET");
  });

  it("generates Mechanical when the overloaded face is absorbed", () => {
    const ready = installFace(actionsReady([RATCHET]), mechanicalFace);
    const attached = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredFaceCardId: mechanicalFace,
      }),
    );

    const afterRoll = rollShowingSlot(attached, 0);
    const mechanical = Object.values(afterRoll.symbols).find(
      (s) => s.symbol === "mechanical" && s.status === "rolled" && s.sourceDieId === dieIdOf(afterRoll),
    );
    if (mechanical === undefined) throw new Error("expected rolled Mechanical");

    const after = expectOk(
      advance(afterRoll, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(afterRoll, P1, 0),
        symbolId: mechanical.id,
      }),
    );

    const generated = usableSymbols(after, P1).filter(
      (s) => s.symbol === "mechanical" && s.sourceDieId === null,
    );
    expect(generated).toHaveLength(1);
  });
});

describe("Assembly Line", () => {
  it("pauses to forge 2 Mechanical faces on the controller's die", () => {
    const { state, ritualId } = placedReadyRitual(ASSEMBLY_LINE, { mechanical: 2 });

    const activated = expectOk(
      advance(state, {
        type: "ACTIVATE_RITUAL",
        playerId: P1,
        cardInstanceId: ritualId,
      }),
    );

    expect(eventTypes(activated)).toContain("forge-faces-started");
    expect(activated.pendingDecision).toEqual({
      type: "forge-faces",
      controllerId: P1,
      faces: 2,
      kind: "synthetic",
      attribute: "mechanical",
      target: "own-die",
    });

    const dieId = dieIdOf(activated);
    const faceCardId = syntheticFaceId("mechanical");
    const resolved = expectOk(
      advance(activated, {
        type: "RESOLVE_FORGE_FACES",
        playerId: P1,
        dieId,
        slotIndexes: [0, 1],
        faceCardId,
      }),
    );

    expect(resolved.pendingDecision).toBeNull();
    const die = resolved.dice[dieId];
    expect(die?.slots[0]?.faceCardId).toBe(faceCardId);
    expect(die?.slots[1]?.faceCardId).toBe(faceCardId);
    expect(die?.slots[0]?.faceCardOwnerId).toBe(P1);
    expect(symbolCountsOn(die!).mechanical).toBe(2);
    expect(eventTypes(resolved)).toContain("forge-faces-resolved");
  });

  it("refuses the opponent's die", () => {
    const { state, ritualId } = placedReadyRitual(ASSEMBLY_LINE, { mechanical: 2 });
    const activated = expectOk(
      advance(state, {
        type: "ACTIVATE_RITUAL",
        playerId: P1,
        cardInstanceId: ritualId,
      }),
    );

    const opponentDieId = dieIdOf(activated, P2);
    const refused = advance(activated, {
      type: "RESOLVE_FORGE_FACES",
      playerId: P1,
      dieId: opponentDieId,
      slotIndexes: [0, 1],
      faceCardId: syntheticFaceId("mechanical"),
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INVALID_TARGET");
  });
});

describe("Flywheel", () => {
  it("gains Energy on roll and generates Shield on absorb", () => {
    const seeded = withEnergy(installFace(newMatch(), FLYWHEEL), P1, 5);
    const afterRoll = rollShowingSlot(seeded, 0);
    expect(afterRoll.energy).toEqual({ holderId: P1, value: 6 });

    const mechanical = Object.values(afterRoll.symbols).find(
      (s) => s.symbol === "mechanical" && s.status === "rolled" && s.sourceDieId === dieIdOf(afterRoll),
    );
    if (mechanical === undefined) throw new Error("expected rolled Mechanical");

    const after = expectOk(
      advance(afterRoll, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(afterRoll, P1, 0),
        symbolId: mechanical.id,
      }),
    );

    const shields = usableSymbols(after, P1).filter(
      (s) => s.symbol === SHIELD && s.sourceDieId === null,
    );
    expect(shields).toHaveLength(1);
  });

  it("with Ratchet, absorb returns Mechanical and a Shield", () => {
    const ready = installFace(actionsReady([RATCHET]), FLYWHEEL);
    const attached = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredFaceCardId: FLYWHEEL,
      }),
    );

    const afterRoll = rollShowingSlot(attached, 0);
    const mechanical = Object.values(afterRoll.symbols).find(
      (s) => s.symbol === "mechanical" && s.status === "rolled" && s.sourceDieId === dieIdOf(afterRoll),
    );
    if (mechanical === undefined) throw new Error("expected rolled Mechanical");

    const after = expectOk(
      advance(afterRoll, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(afterRoll, P1, 0),
        symbolId: mechanical.id,
      }),
    );

    expect(
      usableSymbols(after, P1).filter((s) => s.symbol === "mechanical" && s.sourceDieId === null),
    ).toHaveLength(1);
    expect(
      usableSymbols(after, P1).filter((s) => s.symbol === SHIELD && s.sourceDieId === null),
    ).toHaveLength(1);
  });
});
