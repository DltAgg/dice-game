import { describe, expect, it } from "vitest";
import type { Attribute, DieSlot, FaceCardId, PlayerId } from "@server";
import { overchargePipLabel, slotStatusLine } from "./faceStatus.js";

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
  it("lists Overcharge pips separately from forge yield and Corruption", () => {
    const line = slotStatusLine(
      slot({
        faceCardId: "face-natural-darkness" as FaceCardId,
        forgeYield: true,
        overcharge: ["arcane"],
        corruptionMarkers: 2,
      }),
    );
    expect(line).toContain("Forge yield");
    expect(line).toContain("Overcharge Arcane");
    expect(line).toContain("Corruption ×2");
  });
});
