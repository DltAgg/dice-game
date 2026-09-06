import { describe, expect, it } from "vitest";
import { getFaceCard } from "../content/faces.js";
import { testFace } from "../testing/fixtures/index.js";

const FORGE_DISCOUNT_STANCE = testFace({
  id: "face-test-markers-forge-discount",
  kind: "synthetic",
  symbol: "mechanical",
  pips: { mechanical: 2 },
  onRoll: [],
  onAbsorb: [],
  whileShowing: [{ type: "forge-discount", amount: 1 }],
});

const DOUBLE_ON_ROLL = testFace({
  id: "face-test-markers-double",
  kind: "synthetic",
  symbol: "mechanical",
  onRoll: [
    {
      type: "conditional",
      when: { type: "other-die-same-attribute" },
      then: [{ type: "arm-resolve-next-face-effect-twice" }],
    },
  ],
  onAbsorb: [],
});

const CONVERT_REFORGE = testFace({
  id: "face-test-markers-convert-reforge",
  kind: "synthetic",
  symbol: "mechanical",
  convertRoll: true,
  onRoll: [{ type: "replace-synthetic-face", faces: 1, attribute: "mechanical" }],
  onAbsorb: [],
});

describe("face markers", () => {
  it("While showing forge-discount is a stance with no On roll", () => {
    const face = getFaceCard(FORGE_DISCOUNT_STANCE.id);
    expect(face?.pips).toEqual({ mechanical: 2 });
    expect(face?.onRoll).toEqual([]);
    expect(face?.onAbsorb).toEqual([]);
    expect(face?.whileShowing).toEqual([{ type: "forge-discount", amount: 1 }]);
  });

  it("geometry Double is On roll; Convert roll Reforge is convertRoll", () => {
    expect(getFaceCard(DOUBLE_ON_ROLL.id)?.onRoll.length).toBeGreaterThan(0);
    expect(getFaceCard(CONVERT_REFORGE.id)?.convertRoll).toBe(true);
    expect(getFaceCard(DOUBLE_ON_ROLL.id)?.onAbsorb).toEqual([]);
    expect(getFaceCard(CONVERT_REFORGE.id)?.onAbsorb).toEqual([]);
  });
});
