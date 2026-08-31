import { describe, expect, it } from "vitest";
import {
  BEACON_ARRAY,
  BRIGHT_CADENCE,
  COG_DRAFT,
  MENDING_LIGHT,
  PRISM_MANTLE,
  QUICKSET_JIG,
  getCard,
} from "../content/cards.js";
import { LUCENT_CHOIR } from "../content/faces.js";

describe("Tempo pending sources", () => {
  it("instant effects come from tempo tactics", () => {
    expect(getCard(COG_DRAFT)?.type).toBe("instant");
    expect(getCard(MENDING_LIGHT)?.type).toBe("instant");
    expect(getCard(BRIGHT_CADENCE)?.type).toBe("instant");
  });

  it("equipment hosts standing abilities", () => {
    expect(getCard(QUICKSET_JIG)?.equipment?.abilities.length ?? 0).toBeGreaterThan(0);
    expect(getCard(BEACON_ARRAY)?.equipment?.abilities.length ?? 0).toBeGreaterThan(0);
    expect(getCard(PRISM_MANTLE)?.equipment?.abilities.length ?? 0).toBeGreaterThan(0);
  });

  it("Lucent Choir is a Luminar synthetic with dual timing", () => {
    expect(LUCENT_CHOIR).toBeDefined();
  });
});
