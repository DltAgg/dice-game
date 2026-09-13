import { describe, expect, it } from "vitest";
import { testFace } from "../testing/fixtures/index.js";
import { convertPayoffLabel } from "./commands/convertRollChoice.js";

describe("convertPayoffLabel", () => {
  it("labels Discount N forge from arm-forge-discount", () => {
    expect(
      convertPayoffLabel(
        testFace({
          id: "face-test-convert-discount",
          convertRoll: true,
          onRoll: [{ type: "arm-forge-discount", amount: 1 }],
        }),
      ),
    ).toBe("Discount 1 forge");
  });

  it("keeps Strike and Drain labels", () => {
    expect(
      convertPayoffLabel(
        testFace({
          id: "face-test-convert-strike",
          convertRoll: true,
          onRoll: [{ type: "damage", amount: 2, target: { kind: "choose-enemy" } }],
        }),
      ),
    ).toBe("Strike 2");
    expect(
      convertPayoffLabel(
        testFace({
          id: "face-test-convert-drain",
          convertRoll: true,
          onRoll: [
            {
              type: "drain-life",
              amount: 1,
              target: { kind: "choose-enemy" },
              with: { kind: "most-damaged-ally" },
            },
          ],
        }),
      ),
    ).toBe("Drain 1");
  });
});
