import { describe, expect, it } from "vitest";
import { getFaceCard } from "../content/faces.js";
import { DEFAULT_RULES_CONFIG } from "../model/config.js";
import { FACE_SLOTS_PER_DIE } from "../model/dice.js";
import { SHIELD } from "../model/symbols.js";
import { hasSixPhysicalFaces, symbolCountsOn } from "../rules/dice.js";
import { leftoverFacePool } from "../rules/loadout.js";
import { faceCardLocationIsConsistent, knownFaceCardOwnerships, openingSlotFromFace } from "../rules/faces.js";
import {
  TEST_BODY_A,
  TEST_BODY_B,
  TEST_FACE_DECK,
  TEST_LEGAL_DECK,
  TEST_LEGEND,
  TEST_SQUAD,
  TEST_STARTING_DICE,
} from "../testing/fixtures/index.js";
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
    const lanes = state.players[P1]?.creatureIds.map((id) => state.creatures[id]?.lane);
    expect(lanes).toEqual([0, 1, null]);
  });

  it("places the legendary in the back regardless of squad index", () => {
    const state = createMatch({
      matchId: "m",
      seed: 1,
      config: { ...DEFAULT_RULES_CONFIG, deckMinCards: 0 },
      players: [
        {
          id: P1,
          squad: [TEST_LEGEND, TEST_BODY_A, TEST_BODY_B],
          deck: [],
          faceDeck: TEST_FACE_DECK,
          startingDice: TEST_STARTING_DICE,
        },
        {
          id: P2,
          squad: TEST_SQUAD,
          deck: [],
          faceDeck: TEST_FACE_DECK,
          startingDice: TEST_STARTING_DICE,
        },
      ],
    });
    const positions = state.players[P1]?.creatureIds.map((id) => ({
      definitionId: state.creatures[id]?.definitionId,
      position: state.creatures[id]?.position,
      lane: state.creatures[id]?.lane,
    }));

    expect(positions).toEqual([
      { definitionId: TEST_LEGEND, position: "back", lane: null },
      { definitionId: TEST_BODY_A, position: "frontline", lane: 0 },
      { definitionId: TEST_BODY_B, position: "frontline", lane: 1 },
    ]);
  });

  it("builds every die with exactly six physical faces", () => {
    const state = newMatch();

    for (const die of Object.values(state.dice)) {
      expect(hasSixPhysicalFaces(die)).toBe(true);
      expect(die.slots).toHaveLength(FACE_SLOTS_PER_DIE);
    }
  });

  it("hydrates starting dice from the test loadout", () => {
    const state = createMatch({
      matchId: "fixture",
      seed: 1,
      config: DEFAULT_RULES_CONFIG,
      players: [
        {
          id: P1,
          squad: TEST_SQUAD,
          deck: TEST_LEGAL_DECK,
          faceDeck: TEST_FACE_DECK,
          startingDice: TEST_STARTING_DICE,
        },
        {
          id: P2,
          squad: TEST_SQUAD,
          deck: TEST_LEGAL_DECK,
          faceDeck: TEST_FACE_DECK,
          startingDice: TEST_STARTING_DICE,
        },
      ],
    });
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    const counts = symbolCountsOn(state.dice[dieId]!);
    expect(counts.mechanical).toBe(2);
    expect(counts.luminar).toBe(2);
    expect(counts.martial).toBe(1);
    expect(counts[SHIELD]).toBe(1);
  });

  it("tracks face-card ownership consistently at setup", () => {
    const state = newMatch();
    for (const [faceCardId, ownerId] of knownFaceCardOwnerships(state)) {
      expect(faceCardLocationIsConsistent(state, faceCardId, ownerId)).toBe(true);
    }
  });

  it("maps opening faces to die slots", () => {
    const faceId = TEST_FACE_DECK[0]!;
    const face = getFaceCard(faceId);
    if (face === undefined) throw new Error("face");
    const slot = openingSlotFromFace(0, faceId, P1);
    expect(slot.faceCardId).toBe(faceId);
  });

  it("computes leftover face pool after starting dice consume specials", () => {
    const pool = leftoverFacePool(TEST_FACE_DECK, TEST_STARTING_DICE);
    expect(pool).toEqual([...TEST_FACE_DECK]);
  });

  it("uses the test face pool leftover when newMatch builds players", () => {
    const state = newMatch();
    expect(state.players[P1]?.facePool).toEqual(
      leftoverFacePool(TEST_FACE_DECK, TEST_STARTING_DICE),
    );
  });
});
