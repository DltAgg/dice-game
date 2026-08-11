import { describe, expect, it } from "vitest";
import type { DieState } from "../model/dice.js";
import type { DieId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { createRng } from "../rng/rng.js";
import { diceOf } from "../rules/dice.js";
import { newMatch, P1, P2, expectOk, eventTypes } from "../testing/scenario.js";
import { advance, reduce } from "./reduce.js";

const roll = { type: "ROLL_DICE", playerId: P1 } as const;

/**
 * Stun and retention have no player-reachable source yet — the cards that
 * apply them arrive with the card layer — so these tests arrange the die state
 * directly to prove the roll rules honour it.
 */
function withFirstDie(state: GameState, patch: Partial<DieState>): [GameState, DieId] {
  const dieId = state.players[P1]?.dieIds[0];
  const die = dieId === undefined ? undefined : state.dice[dieId];
  if (dieId === undefined || die === undefined) throw new Error("expected a die");

  return [{ ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } }, dieId];
}

describe("rolling dice", () => {
  it("generates one symbol per die and opens the absorption window", () => {
    const state = expectOk(advance(newMatch(), roll));

    const generated = Object.values(state.symbols);
    expect(generated).toHaveLength(2);
    expect(generated.every((symbol) => symbol.status === "rolled")).toBe(true);
    expect(generated.every((symbol) => symbol.ownerId === P1)).toBe(true);
    expect(state.phase).toBe("absorption");
  });

  it("records which physical face came up on each die", () => {
    const state = expectOk(advance(newMatch(), roll));

    for (const die of diceOf(state, P1)) {
      expect(die.rolledSlotIndex).not.toBeNull();
      expect(die.rolledSlotIndex).toBeGreaterThanOrEqual(0);
      expect(die.rolledSlotIndex).toBeLessThan(6);
    }
  });

  it("generates the symbol belonging to the face that came up", () => {
    const state = expectOk(advance(newMatch(), roll));

    for (const symbol of Object.values(state.symbols)) {
      const die = symbol.sourceDieId === null ? undefined : state.dice[symbol.sourceDieId];
      const slotIndex = die?.rolledSlotIndex;
      const slot = slotIndex === undefined || slotIndex === null ? undefined : die?.slots[slotIndex];
      expect(slot?.faceCardId).toContain(symbol.symbol);
    }
  });

  it("produces the same roll for the same seed", () => {
    const symbolsFor = (seed: number): string =>
      Object.values(expectOk(advance(newMatch({ seed }), roll)).symbols)
        .map((symbol) => symbol.symbol)
        .sort()
        .join(",");

    expect(symbolsFor(7)).toEqual(symbolsFor(7));
  });

  it("does not produce the same roll for every seed", () => {
    const outcomes = new Set(
      Array.from({ length: 16 }, (_unused, seed) =>
        Object.values(expectOk(advance(newMatch({ seed }), roll)).symbols)
          .map((symbol) => symbol.symbol)
          .sort()
          .join(","),
      ),
    );

    expect(outcomes.size).toBeGreaterThan(1);
  });

  it("advances the stored rng cursor so the next roll differs", () => {
    const first = expectOk(advance(newMatch(), roll));
    expect(first.rng.cursor).toBeGreaterThan(0);
  });

  it("does not roll a stunned die and generates no symbol for it", () => {
    const [stunned, stunnedId] = withFirstDie(newMatch(), { stunMarkers: 1 });

    const state = expectOk(advance(stunned, roll));

    expect(Object.values(state.symbols)).toHaveLength(1);
    expect(state.dice[stunnedId]?.rolledSlotIndex).toBeNull();
    expect(eventTypes(state)).toContain("die-skipped");
  });

  it("keeps a retained die on its previous result instead of rerolling it", () => {
    const [retained, retainedId] = withFirstDie(newMatch(), {
      retained: true,
      rolledSlotIndex: 4,
    });

    const state = expectOk(advance(retained, roll));

    expect(state.dice[retainedId]?.rolledSlotIndex).toBe(4);
    const fromRetained = Object.values(state.symbols).filter(
      (symbol) => symbol.sourceDieId === retainedId,
    );
    expect(fromRetained).toHaveLength(1);
  });

  it("clears retention after the kept roll so the next turn rolls freely", () => {
    const [retained, retainedId] = withFirstDie(newMatch(), {
      retained: true,
      rolledSlotIndex: 4,
    });

    const state = expectOk(advance(retained, roll));

    expect(state.dice[retainedId]?.retained).toBe(false);
    expect(eventTypes(state)).toContain("die-released");
  });

  it("lets the active player retain a die that has a showing face", () => {
    const rolled = expectOk(advance(newMatch(), roll));
    const dieId = rolled.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");

    const result = advance(rolled, {
      type: "RETAIN_DIE",
      playerId: P1,
      dieId,
      retain: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.dice[dieId]?.retained).toBe(true);
    expect(eventTypes(result.state)).toContain("die-retained");
  });

  it("lets the player release a retained die before rolling", () => {
    const [held, dieId] = withFirstDie(newMatch(), {
      retained: true,
      rolledSlotIndex: 4,
    });

    const released = expectOk(
      advance(held, { type: "RETAIN_DIE", playerId: P1, dieId, retain: false }),
    );
    expect(released.dice[dieId]?.retained).toBe(false);
    expect(eventTypes(released)).toContain("die-released");

    const state = expectOk(advance(released, roll));
    // After release it is free to land on any face; we only care that retain is off.
    expect(state.dice[dieId]?.retained).toBe(false);
  });

  it("refuses to retain a die with no showing face yet", () => {
    const state = newMatch();
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");

    const result = advance(state, {
      type: "RETAIN_DIE",
      playerId: P1,
      dieId,
      retain: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });

  it("refuses to retain an opponent's die", () => {
    const rolled = expectOk(advance(newMatch(), roll));
    const dieId = rolled.players[P2]?.dieIds[0];
    if (dieId === undefined) throw new Error("expected a die");

    const result = advance(rolled, {
      type: "RETAIN_DIE",
      playerId: P1,
      dieId,
      retain: true,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("INVALID_TARGET");
  });

  it("rejects a roll outside the roll phase without touching state", () => {
    const rolled = expectOk(advance(newMatch(), roll));
    const result = advance(rolled, roll);

    expect(result.ok).toBe(false);
    expect(result.state).toBe(rolled);
  });

  it("rejects a roll from the player who is not active", () => {
    const result = advance(newMatch(), { type: "ROLL_DICE", playerId: P2 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("NOT_ACTIVE_PLAYER");
  });

  it("writes the rng position back so a replay reproduces the match", () => {
    const start = newMatch({ seed: 4242 });

    const direct = expectOk(reduce(start, roll, createRng(start.rng)));
    const replayed = expectOk(reduce(start, roll, createRng(start.rng)));

    expect(JSON.stringify(replayed)).toEqual(JSON.stringify(direct));
    expect(direct.rng.cursor).toBe(2);
  });
});
