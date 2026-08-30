import { describe, expect, it } from "vitest";
import { TEMPO_SQUAD, LODESTAR_ARTIFICER, TORQUE_WRIGHT, DAWN_WARDEN } from "../content/creatures.js";
import {
  DEFAULT_BASIC_LAYOUT,
  ENGINE_TEST_FACE_DECK,
  getFaceCard,
  legacyStartingLayout,
} from "../content/faces.js";
import { TEMPO_DECK, TEMPO_FACE_DECK, TEMPO_STARTING_DICE } from "../content/loadouts/index.js";
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

  it("places the legendary in the back regardless of squad index", () => {
    const state = createMatch({
      matchId: "m",
      seed: 1,
      config: { ...DEFAULT_RULES_CONFIG, deckMinCards: 0 },
      players: [
        {
          id: P1,
          squad: [LODESTAR_ARTIFICER, TORQUE_WRIGHT, DAWN_WARDEN],
          deck: [],
          faceDeck: [],
          startingDice: legacyStartingLayout(),
        },
        {
          id: P2,
          squad: TEMPO_SQUAD,
          deck: [],
          faceDeck: [],
          startingDice: legacyStartingLayout(),
        },
      ],
    });
    const positions = state.players[P1]?.creatureIds.map((id) => ({
      definitionId: state.creatures[id]?.definitionId,
      position: state.creatures[id]?.position,
    }));

    expect(positions).toEqual([
      { definitionId: LODESTAR_ARTIFICER, position: "back" },
      { definitionId: TORQUE_WRIGHT, position: "frontline" },
      { definitionId: DAWN_WARDEN, position: "frontline" },
    ]);
  });

  it("builds every die with exactly six physical faces", () => {
    const state = newMatch();

    for (const die of Object.values(state.dice)) {
      expect(hasSixPhysicalFaces(die)).toBe(true);
      expect(die.slots).toHaveLength(FACE_SLOTS_PER_DIE);
    }
  });

  it("hydrates Tempo starting dice from the loadout document", () => {
    const state = createMatch({
      matchId: "tempo",
      seed: 1,
      config: DEFAULT_RULES_CONFIG,
      players: [
        {
          id: P1,
          squad: TEMPO_SQUAD,
          deck: TEMPO_DECK,
          faceDeck: TEMPO_FACE_DECK,
          startingDice: TEMPO_STARTING_DICE,
        },
        {
          id: P2,
          squad: TEMPO_SQUAD,
          deck: TEMPO_DECK,
          faceDeck: TEMPO_FACE_DECK,
          startingDice: TEMPO_STARTING_DICE,
        },
      ],
    });
    const dieId = state.players[P1]?.dieIds[0];
    if (dieId === undefined) throw new Error("die");
    const counts = symbolCountsOn(state.dice[dieId]!);
    expect(counts.mechanical).toBe(3);
    expect(counts.luminar).toBe(2);
    expect(counts[SHIELD]).toBe(1);
  });

  it("tracks face-card ownership consistently at setup", () => {
    const state = newMatch();
    for (const [faceCardId, ownerId] of knownFaceCardOwnerships(state)) {
      expect(faceCardLocationIsConsistent(state, faceCardId, ownerId)).toBe(true);
    }
  });

  it("maps opening faces to die slots", () => {
    const faceId = TEMPO_FACE_DECK[0]!;
    const face = getFaceCard(faceId);
    if (face === undefined) throw new Error("face");
    const slot = openingSlotFromFace(0, faceId, P1);
    expect(slot.faceCardId).toBe(faceId);
  });

  it("computes leftover face pool after starting dice consume specials", () => {
    const pool = leftoverFacePool(TEMPO_FACE_DECK, TEMPO_STARTING_DICE);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.length).toBeLessThanOrEqual(TEMPO_FACE_DECK.length);
  });

  it("uses engine-test face pool when no loadout face deck is passed", () => {
    const state = newMatch();
    expect(state.players[P1]?.facePool).toEqual([...ENGINE_TEST_FACE_DECK]);
  });

  it("legacy starting layout matches default basic symbols", () => {
    const layout = legacyStartingLayout();
    expect(layout[0]).toHaveLength(DEFAULT_BASIC_LAYOUT.length);
  });
});
