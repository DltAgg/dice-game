import { describe, expect, it } from "vitest";
import {
  getFaceCard,
  GRAPPLER_COMMAND_GRAB,
  GRAPPLER_GUARD,
  JAB,
  GRAPPLER_LARIAT,
  GRAPPLER_MOVEMENT,
  GRAPPLER_TAG,
} from "./faces.js";

describe("Grappler proving faces (spec 029)", () => {
  it("ships named typed faces with primary and secondary effects", () => {
    const lariat = getFaceCard(GRAPPLER_LARIAT);
    expect(lariat?.faceType).toBe("attack");
    expect(lariat?.primaryEffects?.[0]).toMatchObject({ type: "damage", amount: 2 });
    const jab = getFaceCard(JAB);
    expect(jab?.faceType).toBe("attack");
    expect(jab?.sequenceRole).toBe("starter");
    expect(jab?.primaryEffects?.[0]).toMatchObject({ type: "damage", amount: 1 });
    expect(jab?.secondaryEffects?.[0]).toMatchObject({ type: "next-attack-bonus", amount: 1 });
    expect(getFaceCard(GRAPPLER_COMMAND_GRAB)?.faceType).toBe("grab");
    expect(getFaceCard(GRAPPLER_GUARD)?.faceType).toBe("guard");
    expect(getFaceCard(GRAPPLER_MOVEMENT)?.faceType).toBe("attack");
    expect(getFaceCard(GRAPPLER_TAG)?.faceType).toBe("tag");
  });
});
