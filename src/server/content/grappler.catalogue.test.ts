import { describe, expect, it } from "vitest";
import { getCreatureDefinition, GRAPPLER } from "./creatures.js";
import {
  getFaceCard,
  GRAPPLER_COMMAND_GRAB,
  GRAPPLER_GUARD,
  GRAPPLER_JAB,
  GRAPPLER_LARIAT,
  GRAPPLER_MOVEMENT,
  GRAPPLER_TAG,
} from "./faces.js";

describe("Grappler proving catalogue (spec 029)", () => {
  it("ships named typed faces with primary/secondary and two-face techniques", () => {
    const lariat = getFaceCard(GRAPPLER_LARIAT);
    expect(lariat?.faceType).toBe("attack");
    expect(lariat?.primaryEffects?.[0]).toMatchObject({ type: "damage", amount: 2 });
    expect(getFaceCard(GRAPPLER_JAB)?.faceType).toBe("attack");
    expect(getFaceCard(GRAPPLER_COMMAND_GRAB)?.faceType).toBe("grab");
    expect(getFaceCard(GRAPPLER_GUARD)?.faceType).toBe("guard");
    expect(getFaceCard(GRAPPLER_MOVEMENT)?.faceType).toBe("movement");
    expect(getFaceCard(GRAPPLER_TAG)?.faceType).toBe("tag");

    const grappler = getCreatureDefinition(GRAPPLER);
    expect(grappler?.name).toBe("Grappler");
    const ids = grappler?.techniques?.map((technique) => technique.id) ?? [];
    expect(ids).toContain("technique-grappler-power-lariat");
    expect(ids).toContain("technique-grappler-lariat-guard");
    expect(ids).toContain("technique-grappler-jab-command");
  });
});
