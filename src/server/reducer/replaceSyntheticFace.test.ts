import { describe, expect, it } from "vitest";
import type { GameState } from "../model/state.js";
import type { DieId, FaceCardId } from "../model/ids.js";
import {
  canResolvePlayEffects,
  eligiblePoolFacesForReforge,
} from "../rules/reforge.js";
import {
  TEST_SYNTHETIC_LUMINAR_A,
  TEST_SYNTHETIC_MECHANICAL_A,
  TEST_SYNTHETIC_MECHANICAL_B,
  TEST_SYNTHETIC_MECHANICAL_C,
  testCard,
  testNaturalFaceId,
} from "../testing/fixtures/index.js";
import {
  expectOk,
  eventTypes,
  handCardIdAt,
  newMatch,
  P1,
  withPile,
  withHand,
  withPhase,
  advanceResolvingChain as advance,
} from "../testing/scenario.js";

const REFORGE_TWO = testCard({
  id: "card-test-reforge-any-two",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  forge: { faces: 2, kind: "synthetic", attribute: "mechanical", target: "own-die" },
  effect: {
    effects: [{ type: "replace-synthetic-face", faces: 2, attribute: "mechanical" }],
  },
});

const CROSS_FORGE = testCard({
  id: "card-test-cross-forge",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  effect: {
    effects: [
      {
        type: "replace-synthetic-face",
        faces: 1,
        attribute: "luminar",
        fromAttribute: "mechanical",
      },
    ],
  },
});

const CROSS_FORGE_CHOICE = testCard({
  id: "card-test-cross-forge-choice-play",
  playCost: { mechanical: 2, any: 1 },
  attribute: "mechanical",
  forge: { faces: 2, kind: "synthetic", attribute: "mechanical", target: "own-die" },
  effect: {
    requires: { mechanical: 2 },
    effects: [
      {
        type: "choose-effect-mode",
        modes: [
          [
            {
              type: "replace-synthetic-face",
              faces: 2,
              attribute: "luminar",
              fromAttribute: "mechanical",
            },
          ],
          [
            {
              type: "replace-synthetic-face",
              faces: 2,
              attribute: "mechanical",
              fromAttribute: "luminar",
            },
          ],
        ],
        modeLabels: ["Mechanical → Luminar", "Luminar → Mechanical"],
      },
    ],
  },
});

const CROSS_FORGE_CHOICE_ONE = testCard({
  id: "card-test-cross-forge-choice-one",
  playCost: { mechanical: 2, any: 1 },
  attribute: "mechanical",
  effect: {
    requires: { mechanical: 2 },
    effects: [
      {
        type: "choose-effect-mode",
        modes: [
          [
            {
              type: "replace-synthetic-face",
              faces: 1,
              attribute: "luminar",
              fromAttribute: "mechanical",
            },
          ],
          [
            {
              type: "replace-synthetic-face",
              faces: 1,
              attribute: "mechanical",
              fromAttribute: "luminar",
            },
          ],
        ],
        modeLabels: ["Mechanical → Luminar", "Luminar → Mechanical"],
      },
    ],
  },
});

const REFORGE_THREE = testCard({
  id: "card-test-reforge-three",
  playCost: { mechanical: 2 },
  attribute: "mechanical",
  effect: {
    effects: [{ type: "replace-synthetic-face", faces: 3, attribute: "mechanical" }],
  },
});

const TEMPO_DIE = [
  testNaturalFaceId("mechanical"),
  testNaturalFaceId("mechanical"),
  testNaturalFaceId("mechanical"),
  testNaturalFaceId("luminar"),
  testNaturalFaceId("luminar"),
  testNaturalFaceId("luminar"),
] as const;

const FOUR_MECHANICAL_TWO_LUMINAR = [
  testNaturalFaceId("mechanical"),
  testNaturalFaceId("mechanical"),
  testNaturalFaceId("mechanical"),
  testNaturalFaceId("mechanical"),
  testNaturalFaceId("luminar"),
  testNaturalFaceId("luminar"),
] as const;

const actionsReady = (cards: readonly Parameters<typeof withHand>[2][number][]) =>
  withPile(withHand(withPhase(newMatch(), "actions"), P1, cards), P1, 10);

function dieIdOf(state: GameState, index = 0): DieId {
  const id = state.players[P1]?.dieIds[index];
  if (id === undefined) throw new Error("die");
  return id;
}

function installFromPool(state: GameState, faceCardId: FaceCardId, slot = 0, dieIndex = 0): GameState {
  const dieId = dieIdOf(state, dieIndex);
  const die = state.dice[dieId];
  if (die === undefined) throw new Error("die");
  const player = state.players[P1];
  if (player === undefined) throw new Error("player");
  const pool = [...player.facePool];
  const index = pool.indexOf(faceCardId);
  if (index < 0) throw new Error("missing face");
  pool.splice(index, 1);
  const slots = die.slots.map((s, i) =>
    i === slot ? { ...s, faceCardId, faceCardOwnerId: P1 } : s,
  );
  return {
    ...state,
    dice: { ...state.dice, [dieId]: { ...die, slots } },
    players: { ...state.players, [P1]: { ...player, facePool: pool } },
  };
}

function playFromHand(state: GameState): GameState {
  return expectOk(
    advance(state, {
      type: "PLAY_CARD",
      playerId: P1,
      cardInstanceId: handCardIdAt(state, P1, 0),
    }),
  );
}

function withAllDiceFaces(state: GameState, faces: readonly FaceCardId[]): GameState {
  const player = state.players[P1];
  if (player === undefined) throw new Error("player");
  const dice = { ...state.dice };
  for (const dieId of player.dieIds) {
    const die = dice[dieId];
    if (die === undefined) continue;
    dice[dieId] = {
      ...die,
      slots: die.slots.map((slot, index) => ({
        ...slot,
        faceCardId: faces[index] ?? slot.faceCardId,
      })),
    };
  }
  return { ...state, dice };
}

function dieFaceIds(state: GameState): readonly (readonly FaceCardId[])[] {
  return (state.players[P1]?.dieIds ?? []).map(
    (dieId) => state.dice[dieId]?.slots.map((slot) => slot.faceCardId) ?? [],
  );
}

function playCardAction(state: GameState) {
  return {
    type: "PLAY_CARD" as const,
    playerId: P1,
    cardInstanceId: handCardIdAt(state, P1, 0),
  };
}

describe("replace-synthetic-face (Reforge)", () => {
  it("opens Reforge 2 for any replaceable faces on one die", () => {
    const played = playFromHand(actionsReady([REFORGE_TWO.id]));
    expect(played.pendingDecision).toMatchObject({
      type: "replace-synthetic-face",
      faces: 2,
      attribute: "mechanical",
    });
    expect(played.pendingDecision).not.toHaveProperty("fromAttribute");
  });

  it("installs two synthetic Mechanical faces from the pool and returns displaced faces when orphaned", () => {
    const played = playFromHand(actionsReady([REFORGE_TWO.id]));
    const dieId = dieIdOf(played);
    const pool = eligiblePoolFacesForReforge(played, P1, "mechanical");
    const first = pool[0];
    const second = pool[1];
    if (first === undefined || second === undefined) throw new Error("pool too small");
    const installed = [first, second] as const;
    const displaced = [
      played.dice[dieId]?.slots[0]?.faceCardId,
      played.dice[dieId]?.slots[1]?.faceCardId,
    ];
    const resolved = expectOk(
      advance(played, {
        type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
        playerId: P1,
        dieId,
        slotIndexes: [0, 1],
        faceCardIds: [...installed],
      }),
    );
    expect(resolved.pendingDecision).toBeNull();
    expect(resolved.dice[dieId]?.slots[0]?.faceCardId).toBe(installed[0]);
    expect(resolved.dice[dieId]?.slots[1]?.faceCardId).toBe(installed[1]);
    const nextPool = resolved.players[P1]?.facePool ?? [];
    expect(nextPool).not.toContain(installed[0]);
    expect(nextPool).not.toContain(installed[1]);
    for (const id of displaced) {
      if (id === undefined) continue;
      const stillInstalled = Object.values(resolved.dice).some((die) =>
        die.slots.some((slot) => slot.faceCardId === id),
      );
      if (!stillInstalled) expect(nextPool).toContain(id);
    }
    expect(eventTypes(resolved)).toContain("replace-synthetic-face-resolved");
  });

  it("rejects duplicate slot indexes", () => {
    const played = playFromHand(actionsReady([REFORGE_TWO.id]));
    const pool = eligiblePoolFacesForReforge(played, P1, "mechanical");
    const rejected = advance(played, {
      type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
      playerId: P1,
      dieId: dieIdOf(played, 0),
      slotIndexes: [0, 0],
      faceCardIds: [pool[0]!, pool[1]!],
    });
    expect(rejected.ok).toBe(false);
  });

  it("refuses play when the pool has fewer than N destination synthetics", () => {
    let state = actionsReady([REFORGE_TWO.id]);
    state = installFromPool(state, TEST_SYNTHETIC_MECHANICAL_A, 0, 0);
    state = installFromPool(state, TEST_SYNTHETIC_MECHANICAL_B, 1, 0);
    state = installFromPool(state, TEST_SYNTHETIC_MECHANICAL_C, 0, 1);
    const refused = advance(state, playCardAction(state));
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("FACE_NOT_AVAILABLE");
    expect(refused.state).toBe(state);
  });
});

describe("replace-synthetic-face (Cross forge)", () => {
  it("refuses play when no showing face matches Y", () => {
    let ready = actionsReady([CROSS_FORGE.id]);
    const luminar = testNaturalFaceId("luminar");
    for (const dieId of ready.players[P1]?.dieIds ?? []) {
      const die = ready.dice[dieId];
      if (die === undefined) continue;
      const slots = die.slots.map((slot) =>
        slot.faceCardId === testNaturalFaceId("mechanical")
          ? { ...slot, faceCardId: luminar }
          : slot,
      );
      ready = { ...ready, dice: { ...ready.dice, [dieId]: { ...die, slots } } };
    }
    const refused = advance(ready, playCardAction(ready));
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("INVALID_TARGET");
    expect(refused.state).toBe(ready);
  });

  it("opens Cross forge Mechanical → synthetic Luminar", () => {
    const ready = installFromPool(actionsReady([CROSS_FORGE.id]), TEST_SYNTHETIC_MECHANICAL_A);
    const played = playFromHand(ready);
    expect(played.pendingDecision).toMatchObject({
      type: "replace-synthetic-face",
      faces: 1,
      attribute: "luminar",
      fromAttribute: "mechanical",
    });
  });

  it("installs a synthetic Luminar over a Mechanical slot", () => {
    const ready = installFromPool(actionsReady([CROSS_FORGE.id]), TEST_SYNTHETIC_MECHANICAL_A);
    const played = playFromHand(ready);
    const dieId = dieIdOf(played);
    const resolved = expectOk(
      advance(played, {
        type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
        playerId: P1,
        dieId,
        slotIndexes: [0],
        faceCardIds: [TEST_SYNTHETIC_LUMINAR_A],
      }),
    );
    expect(resolved.dice[dieId]?.slots[0]?.faceCardId).toBe(TEST_SYNTHETIC_LUMINAR_A);
    expect(resolved.players[P1]?.facePool).toContain(TEST_SYNTHETIC_MECHANICAL_A);
    expect(resolved.players[P1]?.facePool).not.toContain(TEST_SYNTHETIC_LUMINAR_A);
  });

  it("rejects a slot that does not show Y", () => {
    const ready = installFromPool(actionsReady([CROSS_FORGE.id]), TEST_SYNTHETIC_MECHANICAL_A);
    const played = playFromHand(ready);
    const rejected = advance(played, {
      type: "RESOLVE_REPLACE_SYNTHETIC_FACE",
      playerId: P1,
      dieId: dieIdOf(played),
      slotIndexes: [3],
      faceCardIds: [TEST_SYNTHETIC_LUMINAR_A],
    });
    expect(rejected.ok).toBe(false);
  });
});

describe("play refusal and legal Choose one modes", () => {
  it("refuses Tempo 3/3 Cross forge 2 with ATTRIBUTE_LIMIT_REACHED and keeps the card", () => {
    const ready = withAllDiceFaces(actionsReady([CROSS_FORGE_CHOICE.id]), [...TEMPO_DIE]);
    expect(canResolvePlayEffects(ready, P1, CROSS_FORGE_CHOICE)).toBe(false);
    const beforeFaces = dieFaceIds(ready);
    const hand = ready.players[P1]?.hand ?? [];
    const refused = advance(ready, playCardAction(ready));
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("ATTRIBUTE_LIMIT_REACHED");
    expect(refused.state).toBe(ready);
    expect(refused.state.players[P1]?.hand).toEqual(hand);
    expect(dieFaceIds(refused.state)).toEqual(beforeFaces);
  });

  it("plays Tempo 3/3 Cross forge 1 and opens both directions", () => {
    const ready = withAllDiceFaces(actionsReady([CROSS_FORGE_CHOICE_ONE.id]), [...TEMPO_DIE]);
    expect(canResolvePlayEffects(ready, P1, CROSS_FORGE_CHOICE_ONE)).toBe(true);
    const played = playFromHand(ready);
    expect(played.pendingDecision).toMatchObject({
      type: "choose-effect-mode",
      modeLabels: ["Mechanical → Luminar", "Luminar → Mechanical"],
    });
    expect(played.players[P1]?.hand).not.toContain(handCardIdAt(ready, P1, 0));
  });

  it("auto-picks the only legal Cross forge direction on 4 Mechanical + 2 Luminar", () => {
    const ready = withAllDiceFaces(
      actionsReady([CROSS_FORGE_CHOICE.id]),
      [...FOUR_MECHANICAL_TWO_LUMINAR],
    );
    const played = playFromHand(ready);
    expect(played.pendingDecision?.type).not.toBe("choose-effect-mode");
    expect(played.pendingDecision).toMatchObject({
      type: "replace-synthetic-face",
      faces: 2,
      attribute: "luminar",
      fromAttribute: "mechanical",
    });
  });

  it("refuses Reforge 3 when the pool has only two matching synthetics", () => {
    const ready = installFromPool(actionsReady([REFORGE_THREE.id]), TEST_SYNTHETIC_MECHANICAL_A);
    expect(eligiblePoolFacesForReforge(ready, P1, "mechanical")).toHaveLength(2);
    const refused = advance(ready, playCardAction(ready));
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toBe("FACE_NOT_AVAILABLE");
    expect(refused.state).toBe(ready);
  });
});
