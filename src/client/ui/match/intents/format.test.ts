import { describe, expect, it } from "vitest";
import { testCard } from "@server/testing/fixtures/index.js";
import { ritualStayLabel } from "./format.js";

const continuousActivate = testCard({
  type: "modify",
  subtypes: ["continuous"],
  ritual: { effects: [{ type: "draw-cards", amount: 1 }] },
});
const continuousStanding = testCard({
  type: "modify",
  subtypes: ["continuous"],
  ritual: { effects: [] },
});
const reactionRitual = testCard({
  type: "modify",
  subtypes: ["reaction"],
  ritual: { effects: [{ type: "draw-cards", amount: 1 }] },
});
const leftoverRitual = testCard({
  type: "modify",
  subtypes: ["instant"],
  ritual: { effects: [{ type: "draw-cards", amount: 1 }] },
});
const nonRitual = testCard({ type: "modify" });

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
