import { describe, expect, it } from "vitest";
import {
  ECLIPSE,
  ETERNAL_DARKNESS,
  LIVING_LIBRARY,
  MARTIAL_BLESSING,
  getCard,
} from "./cards.js";
import {
  formatEffectRegion,
  formatEnergyCost,
  formatForgeLine,
  formatRequirementLine,
  formatTypeLine,
} from "./cardText.js";

describe("English card printing", () => {
  it("prints the type line with subtypes and attribute", () => {
    const card = getCard(LIVING_LIBRARY);
    if (card === undefined) throw new Error("missing card");
    expect(formatTypeLine(card)).toBe("[Ritual / Instant / Arcane]");
  });

  it("prints the forge region with kind, attribute and target", () => {
    const card = getCard(ECLIPSE);
    if (card === undefined) throw new Error("missing card");
    expect(formatForgeLine(card.forge)).toBe(
      "[Forge] 1 face [Synthetic] [Darkness] on your die",
    );
  });

  it("prints Active when for ritual requirements", () => {
    const card = getCard(LIVING_LIBRARY);
    if (card === undefined) throw new Error("missing card");
    expect(formatRequirementLine(card)).toBe("[Active when: 2× Arcane]");
  });

  it("prints None when the card forges only", () => {
    // Forge-only is the empty-string rulesText case.
    const eclipse = getCard(ECLIPSE);
    if (eclipse === undefined) throw new Error("missing card");
    const forgeOnly: typeof eclipse = {
      id: eclipse.id,
      name: eclipse.name,
      energyCost: eclipse.energyCost,
      type: eclipse.type,
      subtypes: eclipse.subtypes,
      attribute: eclipse.attribute,
      forge: eclipse.forge,
      rulesText: "",
    };
    expect(formatEffectRegion(forgeOnly)).toEqual(["None"]);
  });

  it("prints Active when from the ritual region for Eternal Darkness", () => {
    const card = getCard(ETERNAL_DARKNESS);
    if (card === undefined) throw new Error("missing card");
    expect(formatEffectRegion(card)).toEqual([
      "[Active when: 2× Darkness]",
      "Choose up to 3 cards in your graveyard and return them to your hand.",
    ]);
  });

  it("prints fixed Energy for former ? costs (temporary catalogue decision)", () => {
    const card = getCard(MARTIAL_BLESSING);
    if (card === undefined) throw new Error("missing card");
    expect(formatEnergyCost(card)).toBe("2");
  });
});
