import { describe, expect, it } from "vitest";
import {
  ADAPTIVE_TOXIN,
  CATALYST,
  CRUSH,
  DECAY,
  FLYWHEEL,
  INSTINCT,
  INFECTION,
  OVERCHARGE,
  STAIN,
  VENOM,
} from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { CreatureId, DieId, FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { usableSymbols } from "../rules/symbols.js";
import {
  creatureIdAt,
  expectOk,
  newMatch,
  P1,
  P2,
  withDamage,
  withEnergy,
  withPhase,
  withTokens,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

function dieIdOf(state: GameState, playerId = P1, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function installFace(
  state: GameState,
  faceCardId: FaceCardId,
  opts: { playerId?: typeof P1; dieIndex?: number; slot?: number } = {},
): GameState {
  const playerId = opts.playerId ?? P1;
  const dieId = dieIdOf(state, playerId, opts.dieIndex ?? 0);
  const slot = opts.slot ?? 0;
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((s, index) =>
    index === slot ? { ...s, faceCardId, faceCardOwnerId: playerId } : s,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function withCorruptionMarker(
  state: GameState,
  playerId: typeof P1 | typeof P2,
  dieIndex: number,
  slotIndex: number,
  markers: number,
): GameState {
  const dieId = dieIdOf(state, playerId, dieIndex);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const slots = die.slots.map((s) =>
    s.index === slotIndex ? { ...s, corruptionMarkers: markers } : s,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function withToxin(state: GameState, creatureId: CreatureId, toxinMarkers: number): GameState {
  const creature = state.creatures[creatureId];
  if (creature === undefined) throw new Error("creature");
  return {
    ...state,
    creatures: { ...state.creatures, [creatureId]: { ...creature, toxinMarkers } },
  };
}

/** Retain-roll so slot shows the installed face; other die stays on Shield. */
function rollShowingSlot(state: GameState, slot: number, playerId: typeof P1 = P1): GameState {
  let rolled = withPhase(state, "roll");
  rolled = withDie(rolled, dieIdOf(rolled, playerId, 0), {
    retained: true,
    rolledSlotIndex: slot,
  });
  rolled = withDie(rolled, dieIdOf(rolled, playerId, 1), {
    retained: true,
    rolledSlotIndex: 4,
  });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId }));
}

describe("face markers / suppress / lock (013)", () => {
  it("Adaptive Toxin roll caps further toxin receive until owner turn", () => {
    const enemyId = creatureIdAt(newMatch(), P2, 0);
    let state = withToxin(installFace(newMatch(), ADAPTIVE_TOXIN), enemyId, 2);
    state = rollShowingSlot(state, 0);
    expect(state.pendingDecision?.type).toBe("choose-creature");
    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: enemyId,
      }),
    );
    expect(state.creatures[enemyId]?.toxinReceiveCapRemaining).toBe(1);
    // Drain auto-bank On absorb (remove-toxin) so later rolls are not gated.
    if (state.pendingDecision?.type === "choose-creature") {
      state = expectOk(
        advance(state, {
          type: "RESOLVE_CHOOSE_CREATURE",
          playerId: P1,
          creatureId: enemyId,
        }),
      );
    }

    // Apply toxin via Venom on die 1 while the cap is active.
    state = installFace(state, VENOM, { dieIndex: 1, slot: 0 });
    let rolled = withPhase(state, "roll");
    rolled = withDie(rolled, dieIdOf(rolled, P1, 0), { retained: true, rolledSlotIndex: 4 });
    rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 0 });
    state = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
    // Venom On roll + auto-bank On absorb each open choose-enemy.
    while (state.pendingDecision?.type === "choose-creature") {
      state = expectOk(
        advance(state, {
          type: "RESOLVE_CHOOSE_CREATURE",
          playerId: P1,
          creatureId: enemyId,
        }),
      );
    }
    expect(state.creatures[enemyId]?.toxinMarkers).toBe(1);
    expect(state.creatures[enemyId]?.toxinReceiveCapRemaining).toBe(0);

    // Further Venom applications grant nothing.
    state = installFace(state, VENOM, { dieIndex: 1, slot: 0 });
    rolled = withPhase(state, "roll");
    rolled = withDie(rolled, dieIdOf(rolled, P1, 0), { retained: true, rolledSlotIndex: 4 });
    rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 0 });
    state = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
    while (state.pendingDecision?.type === "choose-creature") {
      state = expectOk(
        advance(state, {
          type: "RESOLVE_CHOOSE_CREATURE",
          playerId: P1,
          creatureId: enemyId,
        }),
      );
    }
    expect(state.creatures[enemyId]?.toxinMarkers).toBe(1);

    state = withEnergy(withPhase(state, "actions"), P1, 5);
    state = expectOk(advance(state, { type: "END_TURN", playerId: P1 }));
    expect(state.activePlayerId).toBe(P2);
    expect(state.creatures[enemyId]?.toxinReceiveCapRemaining ?? null).toBeNull();
  });

  it("Adaptive Toxin absorb removes toxin for damage", () => {
    const enemyId = creatureIdAt(newMatch(), P2, 0);
    let state = withToxin(withDamage(installFace(newMatch(), ADAPTIVE_TOXIN), enemyId, 0), enemyId, 3);
    state = rollShowingSlot(state, 0);
    // Cap choose: pick enemy
    if (state.pendingDecision?.type === "choose-creature") {
      state = expectOk(
        advance(state, {
          type: "RESOLVE_CHOOSE_CREATURE",
          playerId: P1,
          creatureId: enemyId,
        }),
      );
    }
    // Auto-bank then opens On absorb remove-toxin choice.
    expect(state.pendingDecision?.type).toBe("choose-creature");
    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: enemyId,
      }),
    );
    expect(state.pendingDecision).toBeNull();
    expect(state.creatures[enemyId]?.toxinMarkers).toBe(0);
    expect(state.creatures[enemyId]?.damage).toBe(3);
  });

  it("Stain puts a Corruption marker on an opposing synthetic face", () => {
    let state = installFace(newMatch(), STAIN);
    state = installFace(state, FLYWHEEL, { playerId: P2, slot: 1 });
    state = rollShowingSlot(state, 0);
    expect(state.pendingDecision?.type).toBe("choose-die-slot");
    const oppDie = dieIdOf(state, P2, 0);
    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_DIE_SLOT",
        playerId: P1,
        dieId: oppDie,
        slotIndex: 1,
      }),
    );
    expect(state.dice[oppDie]?.slots[1]?.corruptionMarkers).toBe(1);
  });

  it("Stain absorb locks a Corrupted face as a resource", () => {
    let state = installFace(newMatch(), STAIN);
    state = installFace(state, FLYWHEEL, { playerId: P2, slot: 1 });
    state = withCorruptionMarker(state, P2, 0, 1, 1);
    state = rollShowingSlot(state, 0);
    // On-roll: put another marker on a synthetic (Flywheel)
    if (state.pendingDecision?.type === "choose-die-slot") {
      state = expectOk(
        advance(state, {
          type: "RESOLVE_CHOOSE_DIE_SLOT",
          playerId: P1,
          dieId: dieIdOf(state, P2),
          slotIndex: 1,
        }),
      );
    }
    // Auto-bank On absorb: lock a Corrupted face.
    expect(state.pendingDecision?.type).toBe("choose-die-slot");
    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_DIE_SLOT",
        playerId: P1,
        dieId: dieIdOf(state, P2),
        slotIndex: 1,
      }),
    );
    expect(state.dice[dieIdOf(state, P2)]?.slots[1]?.resourceLockedThisTurn).toBe(true);
  });

  it("Infection spreads a Corruption marker to another face on the same die", () => {
    let state = installFace(newMatch(), INFECTION);
    const oppDie = dieIdOf(state, P2, 0);
    state = withCorruptionMarker(state, P2, 0, 0, 1);
    state = rollShowingSlot(state, 0);
    expect(state.pendingDecision?.type).toBe("choose-die-slot");
    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_DIE_SLOT",
        playerId: P1,
        dieId: oppDie,
        slotIndex: 0,
      }),
    );
    expect(state.pendingDecision?.type).toBe("choose-die-slot");
    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_DIE_SLOT",
        playerId: P1,
        dieId: oppDie,
        slotIndex: 1,
      }),
    );
    expect(state.dice[oppDie]?.slots[1]?.corruptionMarkers).toBe(1);
  });

  it("Decay suppresses an opposing Natural inherent until the next roll", () => {
    let state = installFace(newMatch(), DECAY);
    // Put Crush (has onRoll) on P2 natural slot — Crush is synthetic. Use a
    // natural face: starting faces have empty onRoll. Install suppress on
    // P2 slot 0 (natural martial) and verify flag.
    const oppDie = dieIdOf(state, P2, 0);
    state = rollShowingSlot(state, 0);
    expect(state.pendingDecision?.type).toBe("choose-die-slot");
    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_DIE_SLOT",
        playerId: P1,
        dieId: oppDie,
        slotIndex: 0,
      }),
    );
    expect(state.dice[oppDie]?.slots[0]?.suppressInherentNextRoll).toBe(true);
  });

  it("Decay absorb strips Corrupted face into an unusable Corruption symbol", () => {
    let state = withCorruptionMarker(installFace(newMatch(), DECAY), P2, 0, 1, 1);
    state = installFace(state, FLYWHEEL, { playerId: P2, slot: 1 });
    // Re-apply corruption on Flywheel slot after install
    state = withCorruptionMarker(state, P2, 0, 1, 1);
    state = rollShowingSlot(state, 0);
    if (state.pendingDecision?.type === "choose-die-slot") {
      // Decay on-roll suppress natural
      state = expectOk(
        advance(state, {
          type: "RESOLVE_CHOOSE_DIE_SLOT",
          playerId: P1,
          dieId: dieIdOf(state, P2),
          slotIndex: 0,
        }),
      );
    }
    // Auto-bank On absorb: strip Corrupted face into unusable Corruption.
    expect(state.pendingDecision?.type).toBe("choose-die-slot");
    const oppDie = dieIdOf(state, P2);
    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_DIE_SLOT",
        playerId: P1,
        dieId: oppDie,
        slotIndex: 1,
      }),
    );
    expect(state.dice[oppDie]?.slots[1]?.faceCardId).not.toBe(FLYWHEEL);
    const unusable = Object.values(state.symbols).filter(
      (s) => s.symbol === "corruption" && s.usable === false,
    );
    expect(unusable.length).toBeGreaterThanOrEqual(1);
    expect(usableSymbols(state, P1).some((s) => s.usable === false)).toBe(false);
  });

  it("Catalyst roll arms a wildcard from a synthetic pool symbol", () => {
    let state = installFace(newMatch(), CATALYST);
    state = installFace(state, FLYWHEEL, { dieIndex: 1, slot: 0 });
    // Roll Catalyst on die0 and Flywheel on die1
    let rolled = withPhase(state, "roll");
    rolled = withDie(rolled, dieIdOf(rolled, P1, 0), { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 0 });
    state = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
    // Optional overcharge may not apply; Catalyst opens choose-pool-symbol
    // May also open choose-die-slot if overcharge — Catalyst only.
    expect(state.pendingDecision?.type).toBe("choose-pool-symbol");
    const pending = state.pendingDecision;
    if (pending?.type !== "choose-pool-symbol") throw new Error("expected pool");
    const symbolId = pending.eligibleSymbolIds[0];
    if (symbolId === undefined) throw new Error("eligible");
    state = expectOk(
      advance(state, { type: "RESOLVE_CHOOSE_POOL_SYMBOL", playerId: P1, symbolId }),
    );
    expect((state.requirementWildcardsThisTurn[P1] ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("Catalyst absorb copies an appeared synthetic face onRoll", () => {
    let state = installFace(newMatch(), CATALYST);
    state = installFace(state, CRUSH, { dieIndex: 1, slot: 0 });
    let rolled = withPhase(state, "roll");
    rolled = withDie(rolled, dieIdOf(rolled, P1, 0), { retained: true, rolledSlotIndex: 0 });
    rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 0 });
    state = expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
    // Resolve Catalyst pool choose if present
    if (state.pendingDecision?.type === "choose-pool-symbol") {
      const id = state.pendingDecision.eligibleSymbolIds[0]!;
      state = expectOk(
        advance(state, { type: "RESOLVE_CHOOSE_POOL_SYMBOL", playerId: P1, symbolId: id }),
      );
    }
    const bonusBefore = state.attackBonusThisTurn[P1] ?? 0;
    // Auto-bank On absorb: copy appeared synthetic.
    expect(state.pendingDecision?.type).toBe("choose-die-slot");
    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_DIE_SLOT",
        playerId: P1,
        dieId: dieIdOf(state, P1, 1),
        slotIndex: 0,
      }),
    );
    // Crush onRoll: next-attack-bonus +1
    expect(state.attackBonusThisTurn[P1] ?? 0).toBe(bonusBefore + 1);
  });

  it("Overcharge optional energy suppresses next inherent; absorb doubles next face effect", () => {
    let state = withEnergy(installFace(newMatch(), OVERCHARGE), P1, 3);
    const energyBefore = state.energy.value;
    state = rollShowingSlot(state, 0);
    expect(state.pendingDecision?.type).toBe("optional-overcharge");
    state = expectOk(
      advance(state, { type: "RESOLVE_OPTIONAL_OVERCHARGE", playerId: P1, accept: true }),
    );
    expect(state.energy.value).toBe(energyBefore + 1);
    expect(state.dice[dieIdOf(state)]?.slots[0]?.suppressInherentNextRoll).toBe(true);
    // Auto-bank On absorb after optional resolves.
    expect(state.resolveNextFaceEffectTwice[P1]).toBe(true);
  });

  it("Instinct absorb grants Empower 2 on a chosen ally", () => {
    const attackerId = creatureIdAt(newMatch(), P1, 0);
    let state = withTokens(installFace(newMatch(), INSTINCT), attackerId, { martial: 2 });
    state = rollShowingSlot(state, 0);
    if (state.pendingDecision?.type === "choose-creature") {
      state = expectOk(
        advance(state, {
          type: "RESOLVE_CHOOSE_CREATURE",
          playerId: P1,
          creatureId: attackerId,
        }),
      );
    }
    // Auto-bank then opens On absorb Empower 2.
    expect(state.pendingDecision?.type).toBe("choose-creature");
    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: attackerId,
      }),
    );
    // Roll Empower 1 + absorb Empower 2 on the same ally.
    expect(state.creatures[attackerId]?.nextAttackBonus).toBe(3);
  });

  it("Instinct absorb Empower can target a different ally", () => {
    const firstId = creatureIdAt(newMatch(), P1, 0);
    const secondId = creatureIdAt(newMatch(), P1, 1);
    let state = installFace(newMatch(), INSTINCT);
    state = rollShowingSlot(state, 0);
    if (state.pendingDecision?.type === "choose-creature") {
      state = expectOk(
        advance(state, { type: "RESOLVE_CHOOSE_CREATURE", playerId: P1, creatureId: firstId }),
      );
    }
    expect(state.pendingDecision?.type).toBe("choose-creature");
    state = expectOk(
      advance(state, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: secondId,
      }),
    );
    expect(state.creatures[secondId]?.nextAttackBonus).toBe(2);
    expect(state.creatures[firstId]?.nextAttackBonus).toBe(1);
  });
});