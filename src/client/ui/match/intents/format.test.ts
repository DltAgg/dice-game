import { describe, expect, it } from "vitest";
import { asCardId, getCard, type CardDefinition } from "@server";
import { ritualStayLabel } from "./format.js";

function mustCard(id: string): CardDefinition {
  const def = getCard(asCardId(id));
  if (def === undefined) throw new Error(`missing ${id}`);
  return def;
}

describe("ritualStayLabel", () => {
  it("labels activate-body continuous as once-per-turn stay", () => {
    expect(ritualStayLabel(mustCard("card-daybreak-rite"))).toBe(
      "Once per turn (stays)",
    );
    expect(ritualStayLabel(mustCard("card-archivists-summons"))).toBe(
      "Once per turn (stays)",
    );
  });

  it("keeps standing-only continuous copy", () => {
    expect(ritualStayLabel(mustCard("card-radiant-accord"))).toBe(
      "Continuous (stays)",
    );
    expect(ritualStayLabel(mustCard("card-machine-shop"))).toBe(
      "Continuous (stays)",
    );
  });

  it("does not call reaction field rituals Continuous", () => {
    const daybreak = mustCard("card-daybreak-rite");
    const reaction = { ...daybreak, subtypes: ["reaction"] as const };
    expect(ritualStayLabel(reaction)).toBe("Once per turn (stays)");
  });

  it("keeps leftover instant GY copy", () => {
    const daybreak = mustCard("card-daybreak-rite");
    const leftover = { ...daybreak, subtypes: ["instant"] as const };
    expect(ritualStayLabel(leftover)).toBe("Leaves after activate");
  });

  it("returns null for non-rituals", () => {
    expect(ritualStayLabel(mustCard("card-lightless-verdict"))).toBeNull();
  });
});
