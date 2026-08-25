import { describe, expect, it } from "vitest";
import {
  CONTROL_DECK,
  GLOOM_RESONANCE,
  RIFT_COLLAPSE,
  UMBRAL_BOLT,
  UMBRAL_BRAND,
  UNMAKE,
  WAR_AXE,
} from "../content/cards.js";
import {
  ARCHMAGE,
  CONTROL_SQUAD,
  MINOTAUR,
  NIGHTBOUND_ADEPT,
  VOID_SUMMONER,
} from "../content/creatures.js";
import { CONTROL_FACE_DECK, CONTROL_STARTING_DICE, ENGINE_TEST_FACE_DECK, NIGHTWELL, RUNEFLARE } from "../content/faces.js";
import type { DieState } from "../model/dice.js";
import { asSymbolInstanceId, type CardId, type DieId, type FaceCardId } from "../model/ids.js";
import type { GameState } from "../model/state.js";
import { equipmentOf, graveyardOf, ritualsOf } from "../rules/cards.js";
import { usableSymbols } from "../rules/symbols.js";
import { advance as reduceAdvance } from "./reduce.js";
import {
  creatureIdAt,
  expectOk,
  handCardIdAt,
  newMatch,
  P1,
  P2,
  withActivePlayer,
  withEnergy,
  withHand,
  withAttributePool,
  withPhase,
  withSymbols,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const actionsReady = (cards: readonly CardId[], energy = 10) =>
  withEnergy(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, energy);

function dieIdOf(state: GameState, playerId = P1, index = 0): DieId {
  const id = state.players[playerId]?.dieIds[index];
  if (id === undefined) throw new Error("test: no die");
  return id;
}

function withDie(state: GameState, dieId: DieId, patch: Partial<DieState>): GameState {
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, ...patch } } };
}

function installFace(state: GameState, faceCardId: FaceCardId, slot = 0): GameState {
  const dieId = dieIdOf(state);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("test: missing die");
  const slots = die.slots.map((s, index) =>
    index === slot ? { ...s, faceCardId, faceCardOwnerId: P1 } : s,
  );
  return { ...state, dice: { ...state.dice, [dieId]: { ...die, slots } } };
}

function rollShowingSlot(state: GameState, slot: number): GameState {
  let rolled: GameState = withPhase(state, "roll");
  rolled = withDie(rolled, dieIdOf(rolled), { retained: true, rolledSlotIndex: slot });
  rolled = withDie(rolled, dieIdOf(rolled, P1, 1), { retained: true, rolledSlotIndex: 0 });
  return expectOk(advance(rolled, { type: "ROLL_DICE", playerId: P1 }));
}

describe("builtin Control two-color identity", () => {
  it("fields Nightbound Adept and no Corruption tactics", () => {
    expect(CONTROL_SQUAD).toContain(NIGHTBOUND_ADEPT);
    expect(CONTROL_SQUAD).not.toContain("creature-corrupting-elder");
    expect(CONTROL_DECK).toHaveLength(60);
  });
});

describe("Umbral Bolt", () => {
  it("deals 3 after choosing an enemy when Darkness is in the pool", () => {
    const ready = withSymbols(actionsReady([UMBRAL_BOLT]), P1, ["darkness"]);
    const played = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
      }),
    );
    expect(played.pendingDecision?.type).toBe("choose-creature");
    const targetId = creatureIdAt(played, P2, 0);
    const after = expectOk(
      advance(played, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: targetId,
      }),
    );
    expect(after.creatures[targetId]?.damage).toBe(3);
  });

  it("refuses without Darkness in the pool", () => {
    const ready = actionsReady([UMBRAL_BOLT]);
    const refused = reduceAdvance(ready, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(ready, P1, 0),
    });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INSUFFICIENT_SYMBOLS");
  });
});

describe("Rift Collapse", () => {
  it("deals 4 to a chosen enemy when the ritual is ready", () => {
    const base = actionsReady([RIFT_COLLAPSE]);
    const placed = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
      }),
    );
    const ritualId = ritualsOf(placed, P1)[0]?.id;
    if (ritualId === undefined) throw new Error("test: no ritual");
    const ready = withAttributePool(
      {
        ...placed,
        cards: {
          ...placed.cards,
          [ritualId]: {
            ...placed.cards[ritualId]!,
            ritualOrientation: "ready" as const,
          },
        },
      },
      P1,
      { arcane: 1, darkness: 1 },
    );
    const activated = expectOk(
      advance(ready, { type: "ACTIVATE_RITUAL", playerId: P1, cardInstanceId: ritualId }),
    );
    expect(activated.pendingDecision?.type).toBe("choose-creature");
    const targetId = creatureIdAt(activated, P2, 0);
    const after = expectOk(
      advance(activated, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: targetId,
      }),
    );
    expect(after.creatures[targetId]?.damage).toBe(4);
  });
});

describe("Unmake", () => {
  it("destroys equipment on a chosen enemy", () => {
    const base = actionsReady([WAR_AXE]);
    const hostId = creatureIdAt(base, P1, 0);
    const equipped = expectOk(
      advance(base, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(base, P1, 0),
        declaredTargetCreatureId: hostId,
      }),
    );
    const p2Turn = withEnergy(
      withHand(withPhase(withActivePlayer(equipped, P2), "actions"), P2, [UNMAKE]),
      P2,
      10,
    );
    const opened = expectOk(
      advance(p2Turn, {
        type: "PLAY_CARD",
        playerId: P2,
        cardInstanceId: handCardIdAt(p2Turn, P2, 0),
      }),
    );
    const after = expectOk(
      advance(opened, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P2,
        creatureId: hostId,
      }),
    );
    expect(after.creatures[hostId]?.equipmentIds).toEqual([]);
    expect(equipmentOf(after, P1)).toEqual([]);
    expect(graveyardOf(after, P1).some((card) => card.cardId === WAR_AXE)).toBe(true);
  });
});

describe("Gloom Resonance", () => {
  it("generates Darkness when the overloaded Darkness face is rolled", () => {
    const ready = withEnergy(
      withHand(
        withPhase(
          newMatch({
            players: [
              {
                id: P1,
                squad: CONTROL_SQUAD,
                deck: [],
                faceDeck: CONTROL_FACE_DECK,
                startingDice: CONTROL_STARTING_DICE,
              },
              {
                id: P2,
                squad: CONTROL_SQUAD,
                deck: [],
                faceDeck: CONTROL_FACE_DECK,
                startingDice: CONTROL_STARTING_DICE,
              },
            ],
          }),
          "actions",
        ),
        P1,
        [GLOOM_RESONANCE],
      ),
      P1,
      10,
    );
    const overloaded = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredFaceCardId: NIGHTWELL,
      }),
    );
    const afterRoll = rollShowingSlot(overloaded, 0);
    expect(
      usableSymbols(afterRoll, P1).filter((s) => s.symbol === "darkness" && s.sourceDieId === null),
    ).toHaveLength(2);
  });
});

describe("Umbral Brand", () => {
  it("deals 1 once per Darkness absorb", () => {
    // Squad without Nightbound — its ally On absorb Darkness would also open
    // choose-creature (discard from pile) and steal the pending window.
    const ready = withEnergy(
      withHand(
        withPhase(
          newMatch({
            players: [
              {
                id: P1,
                squad: [ARCHMAGE, VOID_SUMMONER, MINOTAUR],
                deck: [],
                faceDeck: ENGINE_TEST_FACE_DECK,
              },
              {
                id: P2,
                squad: [ARCHMAGE, VOID_SUMMONER, MINOTAUR],
                deck: [],
                faceDeck: ENGINE_TEST_FACE_DECK,
              },
            ],
          }),
          "actions",
        ),
        P1,
        [UMBRAL_BRAND],
      ),
      P1,
      10,
    );
    const bearerId = creatureIdAt(ready, P1, 0);
    const equipped = expectOk(
      advance(ready, {
        type: "PLAY_CARD",
        playerId: P1,
        cardInstanceId: handCardIdAt(ready, P1, 0),
        declaredTargetCreatureId: bearerId,
      }),
    );
    const symbolId = asSymbolInstanceId("sym-darkness-brand");
    const primed = {
      ...equipped,
      symbols: {
        ...equipped.symbols,
        [symbolId]: {
          id: symbolId,
          ownerId: P1,
          symbol: "darkness" as const,
          status: "rolled" as const,
          sourceDieId: null,
          absorbedByCreatureId: null,
        },
      },
    };
    const absorbed = expectOk(
      advance(primed, {
        type: "ABSORB_SYMBOL",
        playerId: P1,
        creatureId: bearerId,
        symbolId,
      }),
    );
    expect(absorbed.pendingDecision?.type).toBe("choose-creature");
    const targetId = creatureIdAt(absorbed, P2, 0);
    const after = expectOk(
      advance(absorbed, {
        type: "RESOLVE_CHOOSE_CREATURE",
        playerId: P1,
        creatureId: targetId,
      }),
    );
    expect(after.creatures[targetId]?.damage).toBe(1);
  });
});

describe("Control faces", () => {
  it("Nightwell generates Darkness on roll", () => {
    const afterRoll = rollShowingSlot(installFace(newMatch(), NIGHTWELL), 0);
    expect(
      usableSymbols(afterRoll, P1).filter((s) => s.symbol === "darkness" && s.sourceDieId === null),
    ).toHaveLength(1);
  });

  it("Runeflare prompts choose-enemy on roll", () => {
    const state = rollShowingSlot(installFace(newMatch(), RUNEFLARE), 0);
    expect(state.pendingDecision?.type).toBe("choose-creature");
  });
});
