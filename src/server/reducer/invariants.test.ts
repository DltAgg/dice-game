import { describe, expect, it } from "vitest";
import { FACE_SLOTS_PER_DIE } from "../model/dice.js";
import { asAttackId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { requirementTotal } from "../model/symbols.js";
import { hasSixPhysicalFaces } from "../rules/dice.js";
import { faceCardLocationIsConsistent, knownFaceCardOwnerships } from "../rules/faces.js";
import { usableSymbols } from "../rules/symbols.js";
import { totalTokens } from "../rules/tokens.js";
import { autoplay } from "../testing/autoplay.js";
import {
  creatureIdAt,
  expectOk,
  newMatch,
  newMatchWithDecks,
  P1,
  P2,
  withDefeatedCreature,
  withPhase,
  withTokens,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

/**
 * The invariants SPDD §38 asks for, checked against every state a real match
 * passes through rather than against a hand-built fixture.
 */

const SAMPLE_SEEDS = [1, 2, 3, 17, 99, 2026];

/**
 * Matches are played with decks so that forging and card play are inside every
 * invariant below, rather than checked only by the scenario tests.
 */
function everyStateOf(seed: number): readonly GameState[] {
  return autoplay(newMatchWithDecks({ seed })).states;
}

describe("structural invariants across played matches", () => {
  it.each(SAMPLE_SEEDS)("seed %i: every die keeps exactly six physical faces", (seed) => {
    for (const state of everyStateOf(seed)) {
      for (const die of Object.values(state.dice)) {
        expect(die.slots).toHaveLength(FACE_SLOTS_PER_DIE);
        expect(hasSixPhysicalFaces(die)).toBe(true);
      }
    }
  });

  it.each(SAMPLE_SEEDS)("seed %i: no face card is both pooled and installed", (seed) => {
    for (const state of everyStateOf(seed)) {
      for (const [faceCardId, ownerId] of knownFaceCardOwnerships(state)) {
        expect(faceCardLocationIsConsistent(state, faceCardId, ownerId)).toBe(true);
      }
    }
  });

  it.each(SAMPLE_SEEDS)("seed %i: an absorbed symbol never reaches the engine", (seed) => {
    for (const state of everyStateOf(seed)) {
      const absorbed = Object.values(state.symbols).filter(
        (symbol) => symbol.status === "absorbed",
      );
      const engineIds = new Set(
        [...usableSymbols(state, P1), ...usableSymbols(state, P2)].map((symbol) => symbol.id),
      );

      for (const symbol of absorbed) {
        expect(engineIds.has(symbol.id)).toBe(false);
        if (symbol.symbol === "shield") {
          expect(symbol.absorbedByCreatureId).not.toBeNull();
        } else {
          expect(symbol.absorbedByCreatureId).toBeNull();
        }
      }
    }
  });

  it.each(SAMPLE_SEEDS)("seed %i: damage never exceeds what the log accounts for", (seed) => {
    for (const state of everyStateOf(seed)) {
      const dealt = new Map<string, number>();
      for (const { event } of state.log) {
        if (event.type === "damage-dealt") {
          dealt.set(event.creatureId, (dealt.get(event.creatureId) ?? 0) + event.amount);
        }
        if (event.type === "creature-healed") {
          dealt.set(event.creatureId, (dealt.get(event.creatureId) ?? 0) - event.amount);
        }
      }

      for (const creature of Object.values(state.creatures)) {
        // A defeated creature's damage is frozen at the lethal total.
        expect(creature.damage).toBe(dealt.get(creature.id) ?? 0);
      }
    }
  });

  it.each(SAMPLE_SEEDS)("seed %i: every shield is one the log granted", (seed) => {
    for (const state of everyStateOf(seed)) {
      const net = new Map<string, number>();
      for (const { event } of state.log) {
        if (event.type === "shield-gained") {
          net.set(event.creatureId, (net.get(event.creatureId) ?? 0) + event.amount);
        }
        // Spent blocking damage (`damage-prevented` source shield) or stripped by
        // effects (`shield-removed` — Cleaving Strike, Rending Mark, …).
        if (event.type === "damage-prevented" && event.source === "shield") {
          net.set(event.creatureId, (net.get(event.creatureId) ?? 0) - event.amount);
        }
        if (event.type === "shield-removed") {
          net.set(event.creatureId, (net.get(event.creatureId) ?? 0) - event.amount);
        }
      }

      for (const creature of Object.values(state.creatures)) {
        expect(creature.shields).toBe(net.get(creature.id) ?? 0);
        expect(creature.shields).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it.each(SAMPLE_SEEDS)("seed %i: attack fuel is absorb and spend", (seed) => {
    for (const state of everyStateOf(seed)) {
      const net = new Map<string, number>();
      for (const { event } of state.log) {
        if (event.type === "attribute-token-gained") {
          net.set(event.playerId, (net.get(event.playerId) ?? 0) + event.amount);
        }
        if (event.type === "attribute-tokens-discarded") {
          const spent = requirementTotal(event.discarded);
          net.set(event.playerId, (net.get(event.playerId) ?? 0) - spent);
        }
        if (event.type === "attribute-tokens-moved") {
          const moved = requirementTotal(event.tokens);
          if (!event.copy) {
            net.set(event.fromPlayerId, (net.get(event.fromPlayerId) ?? 0) - moved);
          }
          net.set(event.toPlayerId, (net.get(event.toPlayerId) ?? 0) + moved);
        }
        if (event.type === "attribute-tokens-drained") {
          const moved = requirementTotal(event.drained);
          net.set(event.fromPlayerId, (net.get(event.fromPlayerId) ?? 0) - moved);
          net.set(event.toPlayerId, (net.get(event.toPlayerId) ?? 0) + moved);
        }
      }

      for (const player of Object.values(state.players)) {
        expect(totalTokens(player.attributePool)).toBe(net.get(player.id) ?? 0);
      }
    }
  });

  it.each(SAMPLE_SEEDS)("seed %i: every card is in exactly one zone", (seed) => {
    for (const state of everyStateOf(seed)) {
      for (const player of Object.values(state.players)) {
        const zones = [
          player.deck,
          player.hand,
          player.graveyard,
          player.equipment,
          player.overload,
          player.ritual,
        ];
        const all = zones.flat();
        // No card is in two lists, and none is listed twice in one.
        expect(new Set(all).size).toBe(all.length);

        for (const [index, zone] of zones.entries()) {
          const name = (
            ["deck", "hand", "graveyard", "equipment", "overload", "ritual"] as const
          )[index];
          for (const id of zone) {
            expect(state.cards[id]?.zone).toBe(name);
            expect(state.cards[id]?.ownerId).toBe(player.id);
          }
        }
      }

      // And no card exists outside its owner's zone lists.
      for (const card of Object.values(state.cards)) {
        const player = state.players[card.ownerId];
        expect(player?.[card.zone]).toContain(card.id);
        if (card.zone === "equipment") {
          expect(card.attachedToCreatureId).not.toBeNull();
          const host =
            card.attachedToCreatureId === null
              ? undefined
              : state.creatures[card.attachedToCreatureId];
          expect(host?.equipmentIds).toContain(card.id);
          expect(card.attachedToFaceCardId).toBeNull();
          expect(card.ritualOrientation).toBeNull();
        } else if (card.zone === "overload") {
          expect(card.attachedToFaceCardId).not.toBeNull();
          const faceCardId = card.attachedToFaceCardId;
          const installed =
            faceCardId !== null &&
            Object.values(state.dice).some(
              (die) =>
                die.ownerId === card.ownerId &&
                die.slots.some(
                  (slot) =>
                    slot.faceCardId === faceCardId && slot.faceCardOwnerId === card.ownerId,
                ),
            );
          expect(installed).toBe(true);
          expect(card.attachedToCreatureId).toBeNull();
          expect(card.ritualOrientation).toBeNull();
        } else if (card.zone === "ritual") {
          expect(card.ritualOrientation).not.toBeNull();
          expect(card.attachedToCreatureId).toBeNull();
          expect(card.attachedToFaceCardId).toBeNull();
        } else {
          expect(card.attachedToCreatureId).toBeNull();
          expect(card.attachedToFaceCardId).toBeNull();
          expect(card.ritualOrientation).toBeNull();
        }
      }
    }
  });

  it.each(SAMPLE_SEEDS)("seed %i: no card is created or destroyed mid-match", (seed) => {
    const states = everyStateOf(seed);
    const opening = Object.keys(states[0]?.cards ?? {}).sort();

    for (const state of states) {
      expect(Object.keys(state.cards).sort()).toEqual(opening);
    }
  });

  it.each(SAMPLE_SEEDS)("seed %i: exactly one player is active and the log is ordered", (seed) => {
    for (const state of everyStateOf(seed)) {
      expect(state.playerOrder).toContain(state.activePlayerId);
      expect(state.log.map((entry) => entry.seq)).toEqual(
        state.log.map((_unused, index) => index),
      );
    }
  });

  it.each(SAMPLE_SEEDS)("seed %i: state stays JSON serializable throughout", (seed) => {
    for (const state of everyStateOf(seed)) {
      expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    }
  });
});

describe("behavioural invariants", () => {
  it("a defeated creature cannot act", () => {
    const phase = withPhase(newMatch(), "actions");
    const combat = withTokens(phase, creatureIdAt(phase, P1, 0), { martial: 2 });
    const attackerId = creatureIdAt(combat, P1, 0);

    const result = advance(withDefeatedCreature(combat, attackerId), {
      type: "ATTACK",
      playerId: P1,
      attackerId,
      attackId: asAttackId("attack-lodestar-artificer-drive-shaft"),
      targetId: creatureIdAt(combat, P2, 0),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("CREATURE_DEFEATED");
  });

  it("an illegal action returns the very same state object", () => {
    const state = newMatch();

    const result = advance(state, { type: "ADVANCE_PHASE", playerId: P2 });

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(state.log).toHaveLength(3);
  });

  it("a client cannot dictate a random outcome", () => {
    const state = newMatch({ seed: 77 });

    const honest = expectOk(advance(state, { type: "ROLL_DICE", playerId: P1 }));
    // A tampered action carrying a preferred result must change nothing: the
    // action shape has no room for one, and the reducer reads only the RNG.
    const tampered = expectOk(
      advance(state, {
        ...{ type: "ROLL_DICE", playerId: P1 },
        ...({ slotIndex: 0, symbol: "martial" } as Record<string, unknown>),
      } as Parameters<typeof advance>[1]),
    );

    expect(JSON.stringify(tampered)).toEqual(JSON.stringify(honest));
  });

  it("replaying the same actions from the same seed reproduces the match exactly", () => {
    const first = autoplay(newMatchWithDecks({ seed: 31415 }));
    const second = autoplay(newMatchWithDecks({ seed: 31415 }));

    expect(JSON.stringify(second.state)).toEqual(JSON.stringify(first.state));
    expect(second.turnsPlayed).toBe(first.turnsPlayed);
  });

  it("different seeds do not all produce the same match", () => {
    const lengths = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => autoplay(newMatchWithDecks({ seed })).turnsPlayed),
    );

    expect(lengths.size).toBeGreaterThan(1);
  });

  it("the shuffle is part of what a seed determines", () => {
    const first = newMatchWithDecks({ seed: 1 });
    const second = newMatchWithDecks({ seed: 2 });

    const handOfSeed = (state: GameState) =>
      (state.players[P1]?.hand ?? []).map((id) => state.cards[id]?.cardId);

    expect(handOfSeed(first)).not.toEqual(handOfSeed(second));
  });
});
