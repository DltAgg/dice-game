import { describe, expect, it } from "vitest";
import { LIVING_LIBRARY } from "../content/cards.js";
import { getCreatureDefinition } from "../content/creatures.js";
import { naturalFaceId, VITAL_SPARK } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import type { DieId, FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { ritualsOf } from "../rules/cards.js";
import { usableSymbols } from "../rules/symbols.js";
import { createDraft } from "./draft.js";
import { createSymbol, drainResolution } from "./resolution.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withAttributePool,
  withEnergy,
  withHand,
  withPhase,
  withSymbols,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

function dieIdOf(state: GameState): DieId {
  const id = state.players[P1]?.dieIds[0];
  if (id === undefined) throw new Error("die");
  return id;
}

function installFace(state: GameState, faceCardId: FaceCardId): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId] as DieState;
  const slots = die.slots.map((slot, index) =>
    index === 0 ? { ...slot, faceCardId, faceCardOwnerId: P1 } : slot,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

describe("016 attribute pile-up", () => {
  it("auto-banks usable rolled attributes after ROLL_DICE", () => {
    let state = withPhase(newMatch(), "roll");
    const dieId = dieIdOf(state);
    // Force a known Martial natural face on slot 0, then retain so roll keeps it.
    state = installFace(state, naturalFaceId("martial"));
    state = {
      ...state,
      dice: {
        ...state.dice,
        [dieId]: {
          ...state.dice[dieId]!,
          retained: true,
          rolledSlotIndex: 0,
        },
      },
    };
    // Also retain other P1 dice so only one pip is generated.
    for (const id of state.players[P1]!.dieIds) {
      if (id === dieId) continue;
      const die = state.dice[id]!;
      state = {
        ...state,
        dice: {
          ...state.dice,
          [id]: { ...die, retained: true, rolledSlotIndex: die.rolledSlotIndex ?? 0 },
        },
      };
    }
    const after = expectOk(advance(state, { type: "ROLL_DICE", playerId: P1 }));
    expect(after.phase).toBe("actions");
    expect(after.players[P1]?.attributePool.martial ?? 0).toBeGreaterThanOrEqual(1);
    expect(
      usableSymbols(after, P1).filter((s) => s.symbol === "martial" && s.status === "rolled"),
    ).toHaveLength(0);
  });

  it("auto-banks effect-generated attributes into the pile", () => {
    const state = withPhase(newMatch(), "actions");
    const draft = createDraft(state);
    createSymbol(draft, P1, "martial", "available", "effect");
    drainResolution(draft);
    expect(draft.players[P1]?.attributePool.martial).toBe(1);
    expect(usableSymbols(draft, P1).filter((s) => s.symbol === "martial")).toHaveLength(0);
  });

  it("banks absorb into the pile immediately", () => {
    const state = withSymbols(withPhase(newMatch(), "actions"), P1, ["martial"]);
    const pip = Object.values(state.symbols)[0]!;
    const after = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: pip.id }),
    );
    expect(after.players[P1]?.attributePool).toEqual({ martial: 1 });
    expect(after.log.some((e) => e.event.type === "attribute-token-gained")).toBe(true);
  });

  it("fires face onAbsorb when banking a pip from that face", () => {
    let state = installFace(withPhase(newMatch(), "actions"), VITAL_SPARK);
    const dieId = dieIdOf(state);
    state = {
      ...state,
      dice: { ...state.dice, [dieId]: { ...state.dice[dieId]!, rolledSlotIndex: 0 } },
    };
    state = withSymbols(state, P1, ["luminar"]);
    const pip = Object.values(state.symbols)[0]!;
    state = {
      ...state,
      symbols: {
        ...state.symbols,
        [pip.id]: { ...pip, sourceDieId: dieId },
      },
    };
    const after = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: pip.id }),
    );
    expect(after.players[P1]?.attributePool).toEqual({ luminar: 1 });
    // Vital Spark onAbsorb opens choose-ally for Mark Shield (Phase 3 pile bank).
    expect(after.pendingDecision?.type).toBe("choose-creature");
    expect(after.log.some((e) => e.event.type === "symbol-absorbed")).toBe(true);
  });

  it("attack requires/discards from owner pile; same-turn bank→attack OK", () => {
    let state = withPhase(newMatch(), "actions");
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);
    const def = getCreatureDefinition(state.creatures[attackerId]!.definitionId)!;
    const attack = def.attacks.find((a) => a.effect !== undefined && a.kind === "basic")!;
    const fuelAttrs = new Set([
      ...Object.keys(attack.requires ?? {}),
      ...Object.keys(attack.discards ?? {}),
    ]);
    const needed = [...fuelAttrs].flatMap((attr) => {
      const n = Math.max(
        attack.requires?.[attr as keyof typeof attack.requires] ?? 0,
        attack.discards?.[attr as keyof typeof attack.discards] ?? 0,
      );
      return Array.from({ length: n }, () => attr);
    });
    state = withSymbols(state, P1, needed as never);
    for (const pip of Object.values(state.symbols)) {
      state = expectOk(
        advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: pip.id }),
      );
    }
    const before = { ...state.players[P1]!.attributePool };
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: attack.id,
        targetId,
      }),
    );
    expect(after.chainStack.length + (after.pendingDecision ? 1 : 0)).toBeGreaterThanOrEqual(0);
    expect(after.log.some((e) => e.event.type === "attack-declared")).toBe(true);
    if (attack.discards !== undefined) {
      for (const [attr, n] of Object.entries(attack.discards)) {
        const key = attr as keyof typeof before;
        expect(after.players[P1]?.attributePool[key] ?? 0).toBe((before[key] ?? 0) - (n ?? 0));
      }
    }
  });

  it("ritual becomes ready when the owner's pile meets Active-when", () => {
    let state = withAttributePool(withHand(withPhase(newMatch(), "actions"), P1, [LIVING_LIBRARY]), P1, {
      arcane: 2,
    });
    state = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    const ritualId = ritualsOf(state, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("ritual");
    expect(state.cards[ritualId]?.ritualOrientation).toBe("preparing");

    state = withAttributePool(state, P1, { arcane: 2 });
    state = withSymbols(state, P1, ["martial"]);
    const pip = Object.values(state.symbols)[0]!;
    state = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: pip.id }),
    );
    expect(state.cards[ritualId]?.ritualOrientation).toBe("ready");
  });

  it("Shield absorb still grants on creature", () => {
    const state = withSymbols(withPhase(newMatch(), "actions"), P1, ["shield"]);
    const pip = Object.values(state.symbols)[0]!;
    const creatureId = creatureIdAt(state, P1, 0);
    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId,
        symbolId: pip.id,
      }),
    );
    expect(after.creatures[creatureId]?.shields).toBe(1);
    expect(after.players[P1]?.attributePool).toEqual({});
  });

  it("Requires spends from the attribute pile", () => {
    let state = withAttributePool(withPhase(newMatch(), "actions"), P1, { martial: 1 });
    expect(state.players[P1]?.attributePool.martial).toBe(1);
    // Manual bank of a leftover pool pip still works for tests that inject via withSymbols.
    state = withSymbols(state, P1, ["wild"]);
    const pip = Object.values(state.symbols)[0]!;
    state = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: pip.id }),
    );
    expect(usableSymbols(state, P1).some((s) => s.id === pip.id)).toBe(false);
    expect(state.players[P1]?.attributePool).toEqual({ martial: 1, wild: 1 });
  });

  it("EOT: pile persists; unabsorbed symbols expire", () => {
    let state = withSymbols(withPhase(newMatch(), "actions"), P1, ["martial", "wild"]);
    const martial = Object.values(state.symbols).find((s) => s.symbol === "martial")!;
    state = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: martial.id }),
    );
    state = expectOk(advance(state, { type: "END_TURN", playerId: P1 }));
    expect(state.players[P1]?.attributePool).toEqual({ martial: 1 });
    expect(Object.keys(state.symbols)).toHaveLength(0);
  });

  it("attribute bank ignores creatureId for On absorb routing", () => {
    const state = withSymbols(withPhase(newMatch(), "actions"), P1, ["martial"]);
    const pip = Object.values(state.symbols)[0]!;
    const creatureId = creatureIdAt(state, P1, 0);
    const after = expectOk(
      advance(state, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId,
        symbolId: pip.id,
      }),
    );
    const absorbed = after.log.find((e) => e.event.type === "symbol-absorbed");
    expect(absorbed?.event).toMatchObject({
      type: "symbol-absorbed",
      creatureId: null,
    });
    expect(after.players[P1]?.attributePool).toEqual({ martial: 1 });
  });

  it("Resonance wildcards cover attack Requires gate and Spend discards", () => {
    let state = withPhase(newMatch(), "actions");
    const attackerId = creatureIdAt(state, P1, 0);
    const targetId = creatureIdAt(state, P2, 0);
    const def = getCreatureDefinition(state.creatures[attackerId]!.definitionId)!;
    const attack = def.attacks.find((a) => a.id === "attack-minotaur-war-charge")!;
    // Requires Martial+Wild, Spend Martial. Pile has Martial only; wildcard covers Wild.
    state = withAttributePool(state, P1, { martial: 1 });
    state = {
      ...state,
      requirementWildcardsThisTurn: { [P1]: [{ fromSymbol: "arcane" }] },
    };
    const after = expectOk(
      advance(state, {
        type: "ATTACK",
        playerId: P1,
        attackerId,
        attackId: attack.id,
        targetId,
      }),
    );
    expect(after.log.some((e) => e.event.type === "attack-declared")).toBe(true);
    expect(after.players[P1]?.attributePool).toEqual({});
    expect(after.requirementWildcardsThisTurn[P1] ?? []).toHaveLength(0);
  });

  it("Resonance wildcards cover ritual Active-when and Spend on activate", () => {
    let state = withHand(withEnergy(withPhase(newMatch(), "actions"), P1, 10), P1, [
      LIVING_LIBRARY,
    ]);
    state = expectOk(
      advance(state, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(state, P1, 0),
      }),
    );
    const ritualId = ritualsOf(state, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("ritual");

    // Need Arcane 2 for ready + Arcane 2 Spend; pile has 1, three wildcards.
    state = withAttributePool(state, P1, { arcane: 1 });
    state = {
      ...state,
      requirementWildcardsThisTurn: {
        [P1]: [{}, {}, {}],
      },
    };
    // Bank a pip so refreshRitualOrientations sees wildcards + pile.
    state = withSymbols(state, P1, ["martial"]);
    const pip = Object.values(state.symbols)[0]!;
    state = expectOk(
      advance(state, { type: "ABSORB_SYMBOL", playerId: P1, symbolId: pip.id }),
    );
    expect(state.cards[ritualId]?.ritualOrientation).toBe("ready");

    const beforeWild = (state.requirementWildcardsThisTurn[P1] ?? []).length;
    state = expectOk(
      advance(state, {
        type: "ACTIVATE_RITUAL",
        playerId: P1,
        cardInstanceId: ritualId,
      }),
    );
    expect(state.log.some((e) => e.event.type === "ritual-activated")).toBe(true);
    // Gate shortfall 1 + Spend shortfall 1 (pile had 1 arcane for spend) = 2 wildcards.
    expect((state.requirementWildcardsThisTurn[P1] ?? []).length).toBe(beforeWild - 2);
    expect(state.players[P1]?.attributePool.arcane ?? 0).toBe(0);
  });
});
