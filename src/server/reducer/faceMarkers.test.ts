import { describe, expect, it } from "vitest";
import { COGTOOTH, GEAR_TRAIN, MAINSPRING, getFaceCard } from "../content/faces.js";

describe("Tempo face markers", () => {
  it("mechanical specials expose on-roll hooks", () => {
    for (const id of [COGTOOTH, GEAR_TRAIN, MAINSPRING]) {
      const face = getFaceCard(id);
      expect(face?.onRoll?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("mechanical specials expose on-absorb hooks", () => {
    for (const id of [COGTOOTH, GEAR_TRAIN, MAINSPRING]) {
      const face = getFaceCard(id);
      expect(face?.onAbsorb?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
