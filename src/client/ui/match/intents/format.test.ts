import { describe, expect, it } from "vitest";
import { testCard } from "@server/testing/fixtures/index.js";
import { ritualStayLabel } from "./format.js";

const continuousActivate = testCard({
  type: "ritual",
  subtypes: ["continuous"],
  ritual: { effects: [{ type: "draw-cards", amount: 1 }] },
});
const continuousStanding = testCard({
  type: "ritual",
  subtypes: ["continuous"],
  ritual: { effects: [] },
});
const reactionRitual = testCard({
  type: "ritual",
  subtypes: ["reaction"],
  ritual: { effects: [{ type: "draw-cards", amount: 1 }] },
});
const leftoverRitual = testCard({
  type: "ritual",
  subtypes: ["instant"],
  ritual: { effects: [{ type: "draw-cards", amount: 1 }] },
});
const nonRitual = testCard({ type: "instant" });

describe("ritualStayLabel", () => {
  it("labels activate-body continuous as once-per-turn stay", () => {
    expect(ritualStayLabel(continuousActivate)).toBe("Once per turn (stays)");
  });

  it("keeps standing-only continuous copy", () => {
    expect(ritualStayLabel(continuousStanding)).toBe("Continuous (stays)");
  });

  it("does not call reaction field rituals Continuous", () => {
    expect(ritualStayLabel(reactionRitual)).toBe("Once per turn (stays)");
  });

  it("keeps leftover instant GY copy", () => {
    expect(ritualStayLabel(leftoverRitual)).toBe("Leaves after activate");
  });

  it("returns null for non-rituals", () => {
    expect(ritualStayLabel(nonRitual)).toBeNull();
  });
});
