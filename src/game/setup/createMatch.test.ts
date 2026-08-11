import { describe, expect, it } from "vitest";
import { PROTOTYPE_SQUAD } from "../content/creatures.js";
import { getFaceCard, STARTING_DIE_SYMBOLS } from "../content/faces.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import { FACE_SLOTS_PER_DIE } from "../model/dice.js";
import { SHIELD } from "../model/symbols.js";
import { hasSixPhysicalFaces, symbolCountsOn } from "../rules/dice.js";
import { faceCardLocationIsConsistent, knownFaceCardOwnerships } from "../rules/faces.js";
import { newMatch, P1, P2 } from "../testing/scenario.js";
import { createMatch, validateStartingLayout } from "./createMatch.js";

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
          { id: P1, squad: PROTOTYPE_SQUAD.slice(0, 2), deck: [], faceDeck: [] },
          { id: P2, squad: PROTOTYPE_SQUAD, deck: [], faceDeck: [] },
        ],
        config: { ...DEFAULT_RULES_CONFIG, deckMinCards: 0 },
      }),
    ).toThrow(/squad has 2/);
  });
});

describe("starting face layout", () => {
  it("opens with one face per natural attribute and two shields", () => {
    expect(STARTING_DIE_SYMBOLS).toEqual(["martial", "wild", "arcane", "luminar", SHIELD, SHIELD]);
  });

  it("gives both players identical dice, so only forging can diverge them", () => {
    const state = newMatch();
    const layouts = Object.values(state.dice).map((die) =>
      die.slots.map((slot) => getFaceCard(slot.faceCardId)?.symbol),
    );

    for (const layout of layouts) {
      expect(layout).toEqual([...STARTING_DIE_SYMBOLS]);
    }
  });

  it("refuses a layout that would break the attribute limit", () => {
    const tooMany = Array.from({ length: FACE_SLOTS_PER_DIE }, () => "martial" as const);
    expect(() => validateStartingLayout(tooMany, DEFAULT_RULES_CONFIG)).toThrow(/§9.1/);
  });

  it("refuses a layout that is not six faces", () => {
    expect(() => validateStartingLayout(["martial"], DEFAULT_RULES_CONFIG)).toThrow(/§9/);
  });
});
