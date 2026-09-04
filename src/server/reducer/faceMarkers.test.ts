import { describe, expect, it } from "vitest";
import { COGTOOTH, GEAR_TRAIN, MAINSPRING, getFaceCard } from "../content/faces.js";

describe("Tempo face markers", () => {
  it("Cogtooth is a While showing forge-discount stance with no On roll", () => {
    const face = getFaceCard(COGTOOTH);
    expect(face?.pips).toBe(2);
    expect(face?.onRoll).toEqual([]);
    expect(face?.onAbsorb).toEqual([]);
    expect(face?.whileShowing).toEqual([{ type: "forge-discount", amount: 1 }]);
  });

  it("Gear Train is geometry Double; Mainspring is Convert roll Reforge", () => {
    expect(getFaceCard(GEAR_TRAIN)?.onRoll.length).toBeGreaterThan(0);
    expect(getFaceCard(MAINSPRING)?.convertRoll).toBe(true);
    expect(getFaceCard(GEAR_TRAIN)?.onAbsorb).toEqual([]);
    expect(getFaceCard(MAINSPRING)?.onAbsorb).toEqual([]);
  });
});
