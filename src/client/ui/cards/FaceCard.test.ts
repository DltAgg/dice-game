import { describe, expect, it } from "vitest";
import { faceRulesLines } from "./faceRulesLines.js";

describe("faceRulesLines", () => {
  it("puts Primary and Secondary on their own lines", () => {
    expect(
      faceRulesLines("Starter. Primary: [Strike 2]. Secondary: +1 damage to the Technique."),
    ).toEqual([
      "Starter.",
      "Primary: [Strike 2].",
      "Secondary: +1 damage to the Technique.",
    ]);
  });

  it("keeps a face with no primary clause as one line", () => {
    expect(faceRulesLines("On roll: [Empower 1].")).toEqual(["On roll: [Empower 1]."]);
  });
});
