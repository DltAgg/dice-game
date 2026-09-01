import { describe, expect, it } from "vitest";
import type { Attribute, DieId, DieSlot, FaceCardId, GameState, PlayerId } from "@server";
import {
  faceMarkerSummary,
  overchargePipLabel,
  overchargeStatusForFace,
  slotStatusLine,
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
