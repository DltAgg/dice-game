import { describe, expect, it } from "vitest";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
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
import { applyToxin } from "./resolution.js";
import { createDraft } from "./draft.js";

/**
 * Toxin counters sit on creatures. At the end of the creature's owner's turn
 * they deal damage equal to current markers, then clear. Soft-capped by
 * `maxToxinMarkers` on apply.
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
  it("deals damage equal to markers at end of the owner's turn, then clears", () => {
    const base = withEnergy(withPhase(newMatch(), "actions"), P2, 3);
    const creatureId = creatureIdAt(base, P2, 0);
    const poisoned = withToxin(withDamage(base, creatureId, 0), creatureId, 2);
    const asP2 = { ...poisoned, activePlayerId: P2, energy: { holderId: P2, value: 3 } };

    const result = advance(asP2, { type: "END_TURN", playerId: P2 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.activePlayerId).toBe(P1);
    expect(result.state.creatures[creatureId]?.damage).toBe(2);
    expect(eventTypes(result.state)).toContain("toxin-tick");
    expect(result.state.creatures[creatureId]?.toxinMarkers).toBe(0);
  });

  it("does not tick when the opponent ends their turn", () => {
    const base = newMatch();
    const creatureId = creatureIdAt(base, P2, 0);
    const poisoned = withToxin(withDamage(base, creatureId, 0), creatureId, 3);

    // P1 ends turn — P2's poisoned creatures must not detonate yet.
    const result = advance(poisoned, { type: "END_TURN", playerId: P1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.activePlayerId).toBe(P2);
    expect(result.state.creatures[creatureId]?.damage).toBe(0);
    expect(result.state.creatures[creatureId]?.toxinMarkers).toBe(3);
    expect(eventTypes(result.state)).not.toContain("toxin-tick");
  });

  it("detonates markers applied during the owner's own turn at that turn's end", () => {
    const base = withEnergy(withPhase(newMatch(), "actions"), P1, 3);
    const creatureId = creatureIdAt(base, P1, 0);
    const poisoned = withToxin(withDamage(base, creatureId, 0), creatureId, 2);

    const result = advance(poisoned, { type: "END_TURN", playerId: P1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.creatures[creatureId]?.damage).toBe(2);
    expect(result.state.creatures[creatureId]?.toxinMarkers).toBe(0);
  });

  it("clamps applyToxin so markers never exceed maxToxinMarkers", () => {
    const base = newMatch({
      config: { ...DEFAULT_RULES_CONFIG, deckMinCards: 0, maxToxinMarkers: 3 },
    });
    const creatureId = creatureIdAt(base, P2, 0);
    const seeded = withToxin(base, creatureId, 2);

    const draft = createDraft(seeded);
    applyToxin(draft, creatureId, 5);

    expect(draft.creatures[creatureId]?.toxinMarkers).toBe(3);
    expect(eventTypes(draft as GameState)).toContain("toxin-applied");
  });

  it("does not grant markers when already at maxToxinMarkers", () => {
    const base = newMatch({
      config: { ...DEFAULT_RULES_CONFIG, deckMinCards: 0, maxToxinMarkers: 3 },
    });
    const creatureId = creatureIdAt(base, P2, 0);
    const atCap = withToxin(base, creatureId, 3);

    const draft = createDraft(atCap);
    applyToxin(draft, creatureId, 2);

    expect(draft.creatures[creatureId]?.toxinMarkers).toBe(3);
    expect(eventTypes(draft as GameState)).not.toContain("toxin-applied");
  });
});
