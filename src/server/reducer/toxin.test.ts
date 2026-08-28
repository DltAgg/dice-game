import { describe, expect, it } from "vitest";
import type { CreatureId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { advanceResolvingChain as advance } from "../testing/scenario.js";
import {
  creatureIdAt,
  eventTypes,
  newMatch,
  P1,
  P2,
  withDamage,
  withEnergy,
  withPhase,
} from "../testing/scenario.js";

/**
 * Toxin counters sit on creatures and deal 1 damage each at the start of the
 * creature's owner's turn.
 */

function withToxin(state: GameState, creatureId: CreatureId, toxinMarkers: number): GameState {
  const creature = state.creatures[creatureId];
  if (creature === undefined) throw new Error("test: missing creature");
  return {
    ...state,
    creatures: { ...state.creatures, [creatureId]: { ...creature, toxinMarkers } },
  };
}

describe("toxin counters", () => {
  it("deals 1 damage per counter at the start of the owner's turn", () => {
    const base = newMatch();
    const creatureId = creatureIdAt(base, P2, 0);
    const poisoned = withToxin(withDamage(base, creatureId, 0), creatureId, 2);

    const result = advance(poisoned, { type: "END_TURN", playerId: P1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.activePlayerId).toBe(P2);
    expect(result.state.creatures[creatureId]?.damage).toBe(2);
    expect(eventTypes(result.state)).toContain("toxin-tick");
    // Counters persist; they are not spent by the tick.
    expect(result.state.creatures[creatureId]?.toxinMarkers).toBe(2);
  });

  it("does not tick on the opponent's turn start", () => {
    const base = withEnergy(withPhase(newMatch(), "actions"), P2, 3);
    // Hand the turn to P1 while P2's creature is poisoned — P1's turn start
    // must not damage P2's creatures.
    const creatureId = creatureIdAt(base, P2, 0);
    const poisoned = withToxin(base, creatureId, 3);

    // Force active player P2 ending turn → P1 starts.
    const asP2 = { ...poisoned, activePlayerId: P2, energy: { holderId: P2, value: 3 } };
    const result = advance(asP2, { type: "END_TURN", playerId: P2 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.activePlayerId).toBe(P1);
    expect(result.state.creatures[creatureId]?.damage).toBe(0);
    expect(eventTypes(result.state)).not.toContain("toxin-tick");
  });
});
