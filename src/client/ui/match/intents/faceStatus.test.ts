import { describe, expect, it } from "vitest";
import type { Attribute, DieId, DieSlot, FaceCardId, GameState, PlayerId } from "@server";
import { testFace } from "@server/testing/fixtures/index.js";
import {
  convertRollCueForFace,
  faceMarkerSummary,
  overchargePipLabel,
  overchargeStatusForFace,
  slotStatusLine,
  whileShowingCues,
  whileShowingStatusForPlayer,
  whileShowingStatusLine,
} from "./faceStatus.js";

const PIERCE_FACE = testFace({
  id: "face-test-status-pierce",
  kind: "synthetic",
  symbol: "luminar",
  whileShowing: [{ type: "pierce", amount: 1 }],
});
const EMPOWER_FACE = testFace({
  id: "face-test-status-empower",
  kind: "synthetic",
  symbol: "luminar",
  whileShowing: [{ type: "empower", amount: 1 }],
});
const PLAY_DISCOUNT_FACE = testFace({
  id: "face-test-status-play-discount",
  kind: "synthetic",
  symbol: "arcane",
  whileShowing: [{ type: "play-discount", amount: 1 }],
});
const FORGE_DISCOUNT_FACE = testFace({
  id: "face-test-status-forge-discount",
  kind: "synthetic",
  symbol: "mechanical",
  whileShowing: [{ type: "forge-discount", amount: 1 }],
});
const CONVERT_FACE = testFace({
  id: "face-test-status-convert",
  kind: "synthetic",
  symbol: "arcane",
  convertRoll: true,
});

function slot(partial: Partial<DieSlot> & { faceCardId: FaceCardId }): DieSlot {
  return {
    index: 0,
    faceCardOwnerId: "p1" as PlayerId,
    ...partial,
  };
}

describe("overchargePipLabel", () => {
  it("returns null when the slot has no pips", () => {
    expect(overchargePipLabel(undefined)).toBeNull();
    expect(overchargePipLabel([])).toBeNull();
  });

  it("counts attributes without merging different kinds", () => {
    const pips: readonly Attribute[] = ["arcane", "arcane", "darkness"];
    expect(overchargePipLabel(pips)).toBe("Overcharge Arcane ×2 · Darkness");
  });
});

describe("slotStatusLine", () => {
  it("lists forge yield and Corruption without Overcharge", () => {
    const line = slotStatusLine(
      slot({
        faceCardId: "face-natural-darkness" as FaceCardId,
        forgeYield: true,
        corruptionMarkers: 2,
      }),
    );
    expect(line).toContain("Forge yield");
    expect(line).toContain("Corruption ×2");
    expect(line).not.toContain("Overcharge");
    expect(line).not.toContain("Silenced");
  });

  it("appends Silenced when isSlotSilenced is true", () => {
    const dieId = "die-1" as DieId;
    const silencedSlot = slot({
      faceCardId: "face-natural-darkness" as FaceCardId,
      silenceExpiresOnTurn: 5,
    });
    const state = {
      turn: 3,
      dice: { [dieId]: { id: dieId, slots: [silencedSlot] } },
    } as unknown as GameState;
    expect(slotStatusLine(silencedSlot, { state, dieId })).toContain("Silenced");
  });

  it("omits Silenced after expiry", () => {
    const dieId = "die-1" as DieId;
    const expiredSlot = slot({
      faceCardId: "face-natural-darkness" as FaceCardId,
      silenceExpiresOnTurn: 5,
    });
    const state = {
      turn: 5,
      dice: { [dieId]: { id: dieId, slots: [expiredSlot] } },
    } as unknown as GameState;
    expect(slotStatusLine(expiredSlot, { state, dieId })).toBeNull();
  });
});

describe("faceMarkerSummary", () => {
  it("appends Silenced when any copy of the face is silenced", () => {
    const playerId = "p1" as PlayerId;
    const dieId = "die-1" as DieId;
    const faceCardId = "face-natural-darkness" as FaceCardId;
    const silencedSlot = slot({
      faceCardId,
      silenceExpiresOnTurn: 4,
    });
    const state = {
      turn: 2,
      players: { p1: { dieIds: [dieId] } },
      dice: { [dieId]: { id: dieId, slots: [silencedSlot] } },
    } as unknown as GameState;
    expect(faceMarkerSummary(state, playerId, faceCardId)).toContain("Silenced");
  });
});

describe("overchargeStatusForFace", () => {
  it("reads pips from overchargeByFace on the unique face card", () => {
    const playerId = "p1" as PlayerId;
    const faceCardId = "face-natural-darkness" as FaceCardId;
    const state = {
      players: {
        p1: {
          overchargeByFace: {
            [faceCardId]: ["arcane", "arcane"],
          },
        },
      },
    } as unknown as GameState;
    expect(overchargeStatusForFace(state, playerId, faceCardId)).toBe("Overcharge Arcane ×2");
    expect(overchargeStatusForFace(state, playerId, "face-other" as FaceCardId)).toBeNull();
  });
});

function playerWithShowingFaces(
  faces: readonly { readonly dieId: DieId; readonly faceCardId: FaceCardId; readonly silenced?: boolean }[],
): { state: GameState; playerId: PlayerId } {
  const playerId = "p1" as PlayerId;
  const dice: Record<string, { id: DieId; rolledSlotIndex: number; slots: DieSlot[] }> = {};
  const dieIds: DieId[] = [];
  for (const face of faces) {
    dieIds.push(face.dieId);
    dice[face.dieId] = {
      id: face.dieId,
      rolledSlotIndex: 0,
      slots: [
        slot({
          index: 0,
          faceCardId: face.faceCardId,
          ...(face.silenced === true ? { silenceExpiresOnTurn: 9 } : {}),
        }),
      ],
    };
  }
  const state = {
    turn: 1,
    players: { p1: { dieIds } },
    dice,
  } as unknown as GameState;
  return { state, playerId };
}

describe("whileShowingCues", () => {
  it("omits zero axes", () => {
    expect(
      whileShowingCues({
        pierce: 0,
        empower: 0,
        playDiscount: 0,
        forgeDiscount: 0,
        reduce: 0,
      }),
    ).toEqual([]);
    expect(
      whileShowingStatusLine({
        pierce: 0,
        empower: 0,
        playDiscount: 0,
        forgeDiscount: 0,
        reduce: 0,
      }),
    ).toBeNull();
  });

  it("labels pierce, empower, both discounts, and reduce", () => {
    expect(
      whileShowingStatusLine({
        pierce: 1,
        empower: 2,
        playDiscount: 1,
        forgeDiscount: 1,
        reduce: 3,
      }),
    ).toBe("While showing · Pierce 1 · Empower 2 · Discount 1 · Discount 1 forge · Reduce 3");
  });
});

describe("whileShowingStatusForPlayer", () => {
  it("reads pierce from whileShowingTotals", () => {
    const { state, playerId } = playerWithShowingFaces([
      { dieId: "die-1" as DieId, faceCardId: PIERCE_FACE.id },
    ]);
    expect(whileShowingStatusForPlayer(state, playerId)).toBe("While showing · Pierce 1");
  });

  it("stacks empower with pierce", () => {
    const { state, playerId } = playerWithShowingFaces([
      { dieId: "die-1" as DieId, faceCardId: PIERCE_FACE.id },
      { dieId: "die-2" as DieId, faceCardId: EMPOWER_FACE.id },
    ]);
    expect(whileShowingStatusForPlayer(state, playerId)).toBe(
      "While showing · Pierce 1 · Empower 1",
    );
  });

  it("labels play discount and forge discount", () => {
    const play = playerWithShowingFaces([
      { dieId: "die-1" as DieId, faceCardId: PLAY_DISCOUNT_FACE.id },
    ]);
    expect(whileShowingStatusForPlayer(play.state, play.playerId)).toBe(
      "While showing · Discount 1",
    );
    const forge = playerWithShowingFaces([
      { dieId: "die-1" as DieId, faceCardId: FORGE_DISCOUNT_FACE.id },
    ]);
    expect(whileShowingStatusForPlayer(forge.state, forge.playerId)).toBe(
      "While showing · Discount 1 forge",
    );
  });

  it("skips a silenced showing stance", () => {
    const { state, playerId } = playerWithShowingFaces([
      {
        dieId: "die-1" as DieId,
        faceCardId: PIERCE_FACE.id,
        silenced: true,
      },
    ]);
    expect(whileShowingStatusForPlayer(state, playerId)).toBeNull();
  });
});

describe("convertRollCueForFace", () => {
  it("cues when a convert face is showing", () => {
    const { state, playerId } = playerWithShowingFaces([
      { dieId: "die-1" as DieId, faceCardId: CONVERT_FACE.id },
    ]);
    expect(convertRollCueForFace(state, playerId, CONVERT_FACE.id)).toBe(
      "On roll: Choose one — bank this die's pips or the printed payoff",
    );
  });

  it("returns null when the convert face is not showing", () => {
    const playerId = "p1" as PlayerId;
    const dieId = "die-1" as DieId;
    const convertId = CONVERT_FACE.id;
    const otherId = "face-natural-arcane" as FaceCardId;
    const state = {
      turn: 1,
      players: { p1: { dieIds: [dieId] } },
      dice: {
        [dieId]: {
          id: dieId,
          rolledSlotIndex: 1,
          slots: [slot({ index: 0, faceCardId: convertId }), slot({ index: 1, faceCardId: otherId })],
        },
      },
    } as unknown as GameState;
    expect(convertRollCueForFace(state, playerId, convertId)).toBeNull();
  });

  it("returns null for a stance face (while showing, not convert)", () => {
    const { state, playerId } = playerWithShowingFaces([
      { dieId: "die-1" as DieId, faceCardId: PIERCE_FACE.id },
    ]);
    expect(convertRollCueForFace(state, playerId, PIERCE_FACE.id)).toBeNull();
  });

  it("hides the cue when the showing convert slot is silenced", () => {
    const { state, playerId } = playerWithShowingFaces([
      { dieId: "die-1" as DieId, faceCardId: CONVERT_FACE.id, silenced: true },
    ]);
    expect(convertRollCueForFace(state, playerId, CONVERT_FACE.id)).toBeNull();
  });
});
