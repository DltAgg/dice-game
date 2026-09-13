import { describe, expect, it } from "vitest";
import { inherentPipsOf } from "../model/dice.js";
import { symbolTokenTotal } from "../model/symbols.js";
import { SPECIAL_FACE_CARDS } from "./faces.js";

function effectTypes(value: unknown, acc: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) effectTypes(item, acc);
    return acc;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.type === "string") acc.push(record.type);
    for (const nested of Object.values(record)) effectTypes(nested, acc);
  }
  return acc;
}

describe("named face catalogue (spec 025)", () => {
  it("omitted pips is one pip of face.symbol", () => {
    expect(inherentPipsOf({ symbol: "shield" })).toEqual({ shield: 1 });
    expect(inherentPipsOf({ symbol: "arcane", pips: { arcane: 2 } })).toEqual({
      arcane: 2,
    });
  });

  it("leaves On absorb empty on every named special", () => {
    for (const face of SPECIAL_FACE_CARDS) {
      expect(face.onAbsorb, face.name).toEqual([]);
    }
  });

  it("produces more than 1 inherent pip", () => {
    for (const face of SPECIAL_FACE_CARDS) {
      const yieldMap = inherentPipsOf(face);
      expect(yieldMap[face.symbol], face.name).toBeGreaterThanOrEqual(1);
      expect(symbolTokenTotal(yieldMap), face.name).toBeGreaterThan(1);
    }
  });

  it("does not mill from Arcane or Darkness faces", () => {
    for (const face of SPECIAL_FACE_CARDS) {
      if (face.symbol !== "arcane" && face.symbol !== "darkness") continue;
      expect(effectTypes(face.onRoll), face.name).not.toContain("mill-cards");
    }
  });

  it("does not draw from Luminar or Mechanical faces", () => {
    for (const face of SPECIAL_FACE_CARDS) {
      if (face.symbol !== "luminar" && face.symbol !== "mechanical") continue;
      expect(effectTypes(face.onRoll), face.name).not.toContain("draw-cards");
    }
  });
});
