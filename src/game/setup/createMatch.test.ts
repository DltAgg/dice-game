import { describe, expect, it } from "vitest";
import { PROTOTYPE_SQUAD } from "../content/creatures.js";
import {
  CONTROL_FACE_DECK,
  CONTROL_STARTING_DICE,
  CRUSH,
  DEFAULT_BASIC_LAYOUT,
  NEEDLE,
  PESTILENT_PLAGUE,
  PROTOTYPE_FACE_DECK,
  PROTOTYPE_STARTING_DICE,
  getFaceCard,
  legacyStartingLayout,
} from "../content/faces.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import { FACE_SLOTS_PER_DIE } from "../model/dice.js";
import { SHIELD } from "../model/symbols.js";
import { hasSixPhysicalFaces, symbolCountsOn } from "../rules/dice.js";
import { leftoverFacePool } from "../rules/loadout.js";
import { faceCardLocationIsConsistent, knownFaceCardOwnerships, openingSlotFromFace } from "../rules/faces.js";
import { newMatch, P1, P2 } from "../testing/scenario.js";
import { createMatch } from "./createMatch.js";

describe("match setup", () => {
  it("gives each player three creatures and two dice", () => {
    const state = newMatch();

    for (const playerId of [P1, P2]) {
      expect(state.players[playerId]?.creatureIds).toHaveLength(3);
      expect(state.players[playerId]?.dieIds).toHaveLength(2);
    }
  });

  it("fills the frontline before the back row", () => {
    const state = newMatch();
    const positions = state.players[P1]?.creatureIds.map(
      (id) => state.creatures[id]?.position,
    );

    expect(positions).toEqual(["frontline", "frontline", "back"]);
  });

  it("builds every die with exactly six physical faces", () => {
    const state = newMatch();

    for (const die of Object.values(state.dice)) {
      expect(die.slots).toHaveLength(FACE_SLOTS_PER_DIE);
      expect(hasSixPhysicalFaces(die)).toBe(true);
    }
  });

  it("respects the four-faces-per-attribute limit on the opening dice", () => {
    const state = newMatch();

    for (const die of Object.values(state.dice)) {
      for (const count of Object.values(symbolCountsOn(die))) {
        expect(count).toBeLessThanOrEqual(DEFAULT_RULES_CONFIG.maxFacesOfSameAttributePerDie);
      }
    }
  });

  it("starts the marker with the first player at the configured Energy", () => {
    const state = newMatch();

    expect(state.energy.holderId).toBe(P1);
    expect(state.energy.value).toBe(DEFAULT_RULES_CONFIG.energy.startingEnergy);
  });

  it("produces byte-identical state for the same setup", () => {
    expect(JSON.stringify(newMatch())).toEqual(JSON.stringify(newMatch()));
  });

  it("produces state that survives a JSON round trip unchanged", () => {
    const state = newMatch();
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("keeps every face card either installed or pooled, never both", () => {
    const state = newMatch();

    for (const [faceCardId, ownerId] of knownFaceCardOwnerships(state)) {
      expect(faceCardLocationIsConsistent(state, faceCardId, ownerId)).toBe(true);
    }
  });

  it("attributes each installed face to the player whose die it sits on at setup", () => {
    const state = newMatch();

    for (const die of Object.values(state.dice)) {
      for (const slot of die.slots) {
        expect(slot.faceCardOwnerId).toBe(die.ownerId);
      }
    }
  });

  it("rejects a squad that is not the configured size", () => {
    expect(() =>
      createMatch({
        matchId: "m",
        seed: 1,
        players: [
          {
            id: P1,
            squad: PROTOTYPE_SQUAD.slice(0, 2),
            deck: [],
            faceDeck: [],
            startingDice: legacyStartingLayout(),
          },
          {
            id: P2,
            squad: PROTOTYPE_SQUAD,
            deck: [],
            faceDeck: [],
            startingDice: legacyStartingLayout(),
          },
        ],
        config: { ...DEFAULT_RULES_CONFIG, deckMinCards: 0 },
      }),
    ).toThrow(/squad has 2/);
  });
});

describe("starting face layout", () => {
  it("keeps DEFAULT_BASIC_LAYOUT as the test-only six-symbol helper", () => {
    expect(DEFAULT_BASIC_LAYOUT).toEqual(["martial", "wild", "arcane", "luminar", SHIELD, SHIELD]);
    expect(legacyStartingLayout()[0]?.map((id) => getFaceCard(id)?.symbol)).toEqual([
      ...DEFAULT_BASIC_LAYOUT,
    ]);
  });

  it("lets two seats open with different layouts and different leftover pools", () => {
    const state = createMatch({
      matchId: "m",
      seed: 1,
      config: { ...DEFAULT_RULES_CONFIG, deckMinCards: 0 },
      players: [
        {
          id: P1,
          squad: PROTOTYPE_SQUAD,
          deck: [],
          faceDeck: PROTOTYPE_FACE_DECK,
          startingDice: PROTOTYPE_STARTING_DICE,
        },
        {
          id: P2,
          squad: PROTOTYPE_SQUAD,
          deck: [],
          faceDeck: CONTROL_FACE_DECK,
          startingDice: CONTROL_STARTING_DICE,
        },
      ],
    });

    const p1Die0 = state.dice[state.players[P1]!.dieIds[0]!]!;
    const p2Die0 = state.dice[state.players[P2]!.dieIds[0]!]!;
    expect(p1Die0.slots[0]?.faceCardId).toBe(CRUSH);
    expect(p2Die0.slots[0]?.faceCardId).not.toBe(CRUSH);
    expect(state.players[P1]?.facePool).toEqual(
      leftoverFacePool(PROTOTYPE_FACE_DECK, PROTOTYPE_STARTING_DICE),
    );
    expect(state.players[P2]?.facePool).toEqual(
      leftoverFacePool(CONTROL_FACE_DECK, CONTROL_STARTING_DICE),
    );
    expect(state.players[P1]?.facePool).not.toContain(CRUSH);
    expect(state.players[P1]?.facePool).not.toContain(NEEDLE);
  });

  it("applies forge-lock remaining when a stay face is installed as if just forged", () => {
    const slot = openingSlotFromFace(0, PESTILENT_PLAGUE, P1);
    expect(slot.forgeLockRemaining).toBe(4);
  });
});
