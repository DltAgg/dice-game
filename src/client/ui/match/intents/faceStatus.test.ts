import { describe, expect, it } from "vitest";
import type { Attribute, DieId, DieSlot, FaceCardId, GameState, PlayerId } from "@server";
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
  it("reads Halo Lamp pierce from whileShowingTotals", () => {
    const { state, playerId } = playerWithShowingFaces([
      { dieId: "die-1" as DieId, faceCardId: "face-synthetic-halo-lamp" as FaceCardId },
    ]);
    expect(whileShowingStatusForPlayer(state, playerId)).toBe("While showing · Pierce 1");
  });

  it("stacks Lucent Choir empower with Halo Lamp pierce", () => {
    const { state, playerId } = playerWithShowingFaces([
      { dieId: "die-1" as DieId, faceCardId: "face-synthetic-halo-lamp" as FaceCardId },
      { dieId: "die-2" as DieId, faceCardId: "face-synthetic-lucent-choir" as FaceCardId },
    ]);
    expect(whileShowingStatusForPlayer(state, playerId)).toBe(
      "While showing · Pierce 1 · Empower 1",
    );
  });

  it("labels Augur Glass play discount and Cogtooth forge discount", () => {
    const glass = playerWithShowingFaces([
      { dieId: "die-1" as DieId, faceCardId: "face-synthetic-augur-glass" as FaceCardId },
    ]);
    expect(whileShowingStatusForPlayer(glass.state, glass.playerId)).toBe(
      "While showing · Discount 1",
    );
    const cog = playerWithShowingFaces([
      { dieId: "die-1" as DieId, faceCardId: "face-synthetic-cogtooth" as FaceCardId },
    ]);
    expect(whileShowingStatusForPlayer(cog.state, cog.playerId)).toBe(
      "While showing · Discount 1 forge",
    );
  });

  it("skips a silenced showing stance", () => {
    const { state, playerId } = playerWithShowingFaces([
      {
        dieId: "die-1" as DieId,
        faceCardId: "face-synthetic-halo-lamp" as FaceCardId,
        silenced: true,
      },
    ]);
    expect(whileShowingStatusForPlayer(state, playerId)).toBeNull();
  });
});

describe("convertRollCueForFace", () => {
  it("cues when Sigil Flare is showing", () => {
    const faceCardId = "face-synthetic-sigil-flare" as FaceCardId;
    const { state, playerId } = playerWithShowingFaces([
      { dieId: "die-1" as DieId, faceCardId },
    ]);
    expect(convertRollCueForFace(state, playerId, faceCardId)).toBe(
      "Convert roll · pips not banked",
    );
  });

  it("cues Mainspring and Pyre of Names when showing", () => {
    for (const faceCardId of [
      "face-synthetic-mainspring",
      "face-synthetic-pyre-of-names",
    ] as const) {
      const { state, playerId } = playerWithShowingFaces([
        { dieId: "die-1" as DieId, faceCardId: faceCardId as FaceCardId },
      ]);
      expect(convertRollCueForFace(state, playerId, faceCardId as FaceCardId)).toContain(
        "Convert roll",
      );
    }
  });

  it("returns null when the convert face is not showing", () => {
    const playerId = "p1" as PlayerId;
    const dieId = "die-1" as DieId;
    const convertId = "face-synthetic-sigil-flare" as FaceCardId;
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

  it("returns null for Halo Lamp (while showing, not convert)", () => {
    const faceCardId = "face-synthetic-halo-lamp" as FaceCardId;
    const { state, playerId } = playerWithShowingFaces([
      { dieId: "die-1" as DieId, faceCardId },
    ]);
    expect(convertRollCueForFace(state, playerId, faceCardId)).toBeNull();
  });

  it("hides the cue when the showing convert slot is silenced", () => {
    const faceCardId = "face-synthetic-sigil-flare" as FaceCardId;
    const { state, playerId } = playerWithShowingFaces([
      { dieId: "die-1" as DieId, faceCardId, silenced: true },
    ]);
    expect(convertRollCueForFace(state, playerId, faceCardId)).toBeNull();
  });
});
