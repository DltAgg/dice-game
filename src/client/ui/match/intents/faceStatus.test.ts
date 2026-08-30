import { describe, expect, it } from "vitest";
import type { Attribute, DieSlot, FaceCardId, GameState, PlayerId } from "@server";
import { overchargePipLabel, overchargeStatusForFace, slotStatusLine } from "./faceStatus.js";

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
