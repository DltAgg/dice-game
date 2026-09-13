import { describe, expect, it } from "vitest";
import { recordedAsFor, recordedAsLabel, recordedAsMix } from "./recordedAs.js";

describe("recordedAsFor", () => {
  it("labels local vs-AI separately from hotseat", () => {
    expect(recordedAsFor("local", null)).toBe("local");
    expect(recordedAsFor("local", "p2")).toBe("local-ai");
    expect(recordedAsFor("host", "p1")).toBe("host");
    expect(recordedAsFor("client", null)).toBe("client");
  });
});

describe("recordedAsLabel", () => {
  it("uses player-facing names on the dashboard", () => {
    expect(recordedAsLabel("local")).toBe("hotseat");
    expect(recordedAsLabel("local-ai")).toBe("vs AI");
    expect(recordedAsLabel("host")).toBe("host");
    expect(recordedAsLabel("client")).toBe("guest");
  });
});

describe("recordedAsMix", () => {
  it("counts hotseat and vs AI as different buckets", () => {
    expect(
      recordedAsMix([{ recordedAs: "local" }, { recordedAs: "local-ai" }, { recordedAs: "local" }]),
    ).toEqual({ hotseat: 2, "vs AI": 1 });
  });
});
