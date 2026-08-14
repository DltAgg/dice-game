import { describe, expect, it } from "vitest";
import {
  ASSEMBLY_LINE,
  BLUEPRINT,
  CAMSHAFT,
  CLOCKWORK,
  COUPLING,
  DIE_PRESS,
  FOUNDRY,
  GOVERNOR,
  RATCHET,
  RECALIBRATE,
  SAFETY_LATCH,
  SERVOMOTOR,
  SPARE_COG,
  STAMP,
  TRANSMISSION,
} from "../content/cards.js";
import { FLYWHEEL, PISTON, faceIdForSymbol, syntheticFaceId } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import { asAttackId, type CardId, type DieId, type FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import type { AttributeTokens } from "../model/symbols.js";
import { SHIELD } from "../model/symbols.js";
import { ritualsOf } from "../rules/cards.js";
import { symbolCountsOn } from "../rules/dice.js";
import { usableSymbols } from "../rules/symbols.js";
import { advance as reduceAdvance } from "./reduce.js";
import {
  creatureIdAt,
  eventTypes,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  resolveOpenChain,
  withEnergy,
  withHand,
  withPhase,
  withSymbols,
  withTokens,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const HEAVY_AXE = asAttackId("attack-minotaur-heavy-axe");

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

describe("Governor", () => {
  const mechanicalFace = syntheticFaceId("mechanical");

  it("attaches to a Mechanical face and generates Mechanical on roll", () => {
    const ready = installFace(actionsReady([GOVERNOR]), mechanicalFace);
    const attached = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredFaceCardId: mechanicalFace,
      }),
    );

    const afterRoll = rollShowingSlot(attached, 0);
    const generated = usableSymbols(afterRoll, P1).filter((s) => s.symbol === "mechanical");
    expect(generated).toHaveLength(1);
    expect(generated[0]?.sourceDieId).toBeNull();
  });

  it("refuses a non-Mechanical face", () => {
    const ready = installFace(actionsReady([GOVERNOR]), faceIdForSymbol("luminar"));
    const refused = advance(ready, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(ready, P1, 0),
      declaredFaceCardId: faceIdForSymbol("luminar"),
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INVALID_TARGET");
  });
});

describe("Spare Cog", () => {
  it("generates 1 Mechanical when played", () => {
    const ready = actionsReady([SPARE_COG]);
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    const generated = usableSymbols(after, P1).filter((s) => s.symbol === "mechanical");
    expect(generated).toHaveLength(1);
    expect(generated[0]?.sourceDieId).toBeNull();
  });
});

describe("Die Press", () => {
  it("pauses to forge 2 Mechanical faces when the pool has Mechanical + Mechanical", () => {
    const ready = withSymbols(actionsReady([DIE_PRESS]), P1, ["mechanical", "mechanical"]);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );

    expect(played.pendingDecision).toEqual({
      type: "forge-faces",
      controllerId: P1,
      faces: 2,
      kind: "synthetic",
      attribute: "mechanical",
      target: "own-die",
    });

    const dieId = dieIdOf(played);
    const faceCardId = syntheticFaceId("mechanical");
    const resolved = expectOk(
      advance(played, {
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
    expect(symbolCountsOn(die!).mechanical).toBe(2);
  });

  it("refuses without two Mechanical in the pool", () => {
    const ready = withSymbols(actionsReady([DIE_PRESS]), P1, ["mechanical"]);
    const refused = advance(ready, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(ready, P1, 0),
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INSUFFICIENT_SYMBOLS");
  });
});

describe("Foundry", () => {
  const mechanicalFace = syntheticFaceId("mechanical");

  it("gains Energy when a controller creature absorbs Mechanical", () => {
    const { state } = placedReadyRitual(FOUNDRY, { mechanical: 2 });
    const seeded = withEnergy(installFace(state, mechanicalFace), P1, 5);
    const afterRoll = rollShowingSlot(seeded, 0);
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
    expect(after.energy).toEqual({ holderId: P1, value: 6 });
  });

  it("does not gain Energy when the opponent absorbs Mechanical", () => {
    const { state } = placedReadyRitual(FOUNDRY, { mechanical: 2 });
    const seeded: GameState = {
      ...withEnergy(
        withSymbols(withPhase(state, "absorption"), P2, ["mechanical"], "rolled"),
        P1,
        5,
      ),
      activePlayerId: P2,
    };
    const mechanical = Object.values(seeded.symbols).find(
      (s) => s.symbol === "mechanical" && s.ownerId === P2 && s.status === "rolled",
    );
    if (mechanical === undefined) throw new Error("expected opponent Mechanical");

    const after = expectOk(
      advance(seeded, {
        type: "ABSORB_SYMBOL",
        playerId: P2,
        creatureId: creatureIdAt(seeded, P2, 0),
        symbolId: mechanical.id,
      }),
    );
    expect(after.energy).toEqual({ holderId: P1, value: 5 });
  });
});

describe("Piston", () => {
  it("generates Mechanical on roll and gains Energy on absorb", () => {
    const seeded = withEnergy(installFace(newMatch(), PISTON), P1, 5);
    const afterRoll = rollShowingSlot(seeded, 0);
    expect(usableSymbols(afterRoll, P1).filter((s) => s.symbol === "mechanical")).toHaveLength(1);

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
    expect(after.energy).toEqual({ holderId: P1, value: 6 });
  });
});

describe("Mechanical combo wave 2", () => {
  const mechanicalFace = syntheticFaceId("mechanical");

  it("Blueprint generates Mechanical and arms a forge discount", () => {
    const ready = actionsReady([BLUEPRINT]);
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(usableSymbols(after, P1).filter((s) => s.symbol === "mechanical")).toHaveLength(1);
    expect(after.forgeDiscountThisTurn[P1]).toBe(1);
  });

  it("Transmission copies another pool symbol on absorb", () => {
    const ready = installFace(actionsReady([TRANSMISSION]), mechanicalFace);
    const attached = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredFaceCardId: mechanicalFace,
      }),
    );
    const withExtra = withSymbols(attached, P1, ["luminar"], "available");
    const afterRoll = rollShowingSlot(withExtra, 0);
    const mechanical = Object.values(afterRoll.symbols).find(
      (s) => s.symbol === "mechanical" && s.status === "rolled" && s.sourceDieId === dieIdOf(afterRoll),
    );
    if (mechanical === undefined) throw new Error("expected rolled Mechanical");

    const afterAbsorb = expectOk(
      advance(afterRoll, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: creatureIdAt(afterRoll, P1, 0),
        symbolId: mechanical.id,
      }),
    );
    expect(afterAbsorb.pendingDecision?.type).toBe("copy-pool-symbol");
  });

  it("Camshaft arms forge discount on roll", () => {
    const ready = installFace(actionsReady([CAMSHAFT]), mechanicalFace);
    const attached = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredFaceCardId: mechanicalFace,
      }),
    );
    const afterRoll = rollShowingSlot(attached, 0);
    expect(afterRoll.forgeDiscountThisTurn[P1]).toBe(1);
  });

  it("Servomotor generates Mechanical when the bearer absorbs Mechanical", () => {
    const ready = actionsReady([SERVOMOTOR]);
    const equipped = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredTargetCreatureId: creatureIdAt(ready, P1, 0),
      }),
    );
    const seeded = installFace(equipped, mechanicalFace);
    const afterRoll = rollShowingSlot(seeded, 0);
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

  it("Clockwork generates Mechanical when the controller rolls Mechanical", () => {
    const { state } = placedReadyRitual(CLOCKWORK, { mechanical: 2 });
    const seeded = installFace(state, mechanicalFace);
    const afterRoll = rollShowingSlot(seeded, 0);
    const generated = usableSymbols(afterRoll, P1).filter(
      (s) => s.symbol === "mechanical" && s.sourceDieId === null,
    );
    expect(generated).toHaveLength(1);
  });

  it("Stamp requires Mechanical and reapplies a rolled die's modifiers", () => {
    let ready = withSymbols(installFace(actionsReady([STAMP]), mechanicalFace), P1, [
      "mechanical",
    ]);
    ready = withPhase(rollShowingSlot(ready, 0), "actions");
    // Extra Mechanical still available for [Requires] after the roll pip is in the pool.
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.pendingDecision?.type === "choose-die" || eventTypes(after).includes("effect-resolved")).toBe(
      true,
    );
  });

  it("Coupling requires Mech×2 and arms resolve-next-face-effect-twice", () => {
    const ready = withSymbols(actionsReady([COUPLING]), P1, ["mechanical", "mechanical"]);
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.resolveNextFaceEffectTwice[P1]).toBe(true);
  });

  it("Safety Latch prevents 1 from an attack and generates Mechanical", () => {
    const combat = withPhase(newMatch(), "actions");
    const attacker = creatureIdAt(combat, P1, 0);
    const target = creatureIdAt(combat, P2, 0);
    const armed = withHand(
      withTokens(withEnergy(combat, P2, 5), attacker, { martial: 2 }),
      P2,
      [SAFETY_LATCH],
    );
    const opened = expectOk(
      reduceAdvance(armed, {
        type: "ATTACK",
        playerId: P1,
        attackerId: attacker,
        attackId: HEAVY_AXE,
        targetId: target,
      }),
    );
    const latched = expectOk(
      reduceAdvance(opened, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(opened, P2, 0),
      }),
    );
    const resolved = resolveOpenChain(latched);
    expect(eventTypes(resolved)).toContain("symbol-generated");
    expect(resolved.creatures[target]?.damage).toBe(2);
  });

  it("Recalibrate returns a cheap card from the graveyard", () => {
    let ready = actionsReady([RECALIBRATE, SPARE_COG]);
    const spareId = handCardIdAt(ready, P1, 1);
    ready = {
      ...ready,
      cards: {
        ...ready.cards,
        [spareId]: { ...ready.cards[spareId]!, zone: "graveyard" },
      },
      players: {
        ...ready.players,
        [P1]: {
          ...ready.players[P1]!,
          hand: ready.players[P1]!.hand.filter((id) => id !== spareId),
          graveyard: [...ready.players[P1]!.graveyard, spareId],
        },
      },
    };
    const after = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(after.pendingDecision?.type).toBe("search-graveyard");
  });
});
