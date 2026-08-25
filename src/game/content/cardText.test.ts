import { describe, expect, it } from "vitest";
import type { CardDefinition, ForgeRegion } from "../model/cards.js";
import { asCardId } from "../model/ids.js";
import {
  formatEffectRegion,
  formatEnergyCost,
  formatForgeLine,
  formatRequirementLine,
  formatTypeLine,
} from "./cardText.js";

function exampleCard(overrides: Partial<CardDefinition> = {}): CardDefinition {
  const attribute = overrides.attribute ?? "arcane";
  const { forge, ...rest } = overrides;
  return {
    id: asCardId("card-example"),
    name: "Example",
    energyCost: 1,
    type: "instant",
    subtypes: [],
    attribute,
    forge: forge ?? {
      faces: 1,
      kind: "synthetic",
      attribute,
      target: "own-die",
    },
    rulesText: "Do something.",
    ...rest,
  };
}

describe("English card printing", () => {
  it("prints the type line with subtypes and attribute", () => {
    const card = exampleCard({
      type: "ritual",
      subtypes: ["instant"],
      attribute: "arcane",
    });
    expect(formatTypeLine(card)).toBe("[Ritual / Instant / Arcane]");
  });

  it("prints the forge region with kind, attribute and target", () => {
    const forge: ForgeRegion = {
      faces: 1,
      kind: "synthetic",
      attribute: "darkness",
      target: "own-die",
    };
    expect(formatForgeLine(forge)).toBe("[Forge] 1 face [Synthetic] [Darkness] on your die");
  });

  it("prints multi-face natural forges on the opponent's die", () => {
    expect(
      formatForgeLine({
        faces: 2,
        kind: "natural",
        attribute: "martial",
        target: "opponent-die",
      }),
    ).toBe("[Forge] 2 faces [Natural] [Martial] on the opponent's die");
  });

  it("prints Active when for ritual requirements", () => {
    const card = exampleCard({
      type: "ritual",
      subtypes: ["instant"],
      ritual: { activeWhen: { arcane: 2 }, effects: [] },
    });
    expect(formatRequirementLine(card)).toBe("[Active when: Arcane + Arcane]");
  });

  it("prints a single-token Active when without repeating the attribute", () => {
    const card = exampleCard({
      type: "ritual",
      subtypes: ["continuous"],
      attribute: "mechanical",
      ritual: { activeWhen: { mechanical: 1 }, effects: [] },
    });
    expect(formatTypeLine(card)).toBe("[Ritual / Continuous / Mechanical]");
    expect(formatRequirementLine(card)).toBe("[Active when: Mechanical]");
  });

  it("prints mixed-attribute Active when as Attr + Attr", () => {
    const card = exampleCard({
      type: "ritual",
      subtypes: ["instant"],
      ritual: { activeWhen: { arcane: 1, corruption: 1 }, effects: [] },
    });
    expect(formatRequirementLine(card)).toBe("[Active when: Arcane + Corruption]");
  });

  it("prints Requires for non-ritual gates", () => {
    const card = exampleCard({
      type: "instant",
      attribute: "mechanical",
      effect: { requires: { mechanical: 2 }, effects: [] },
    });
    expect(formatTypeLine(card)).toBe("[Instant / Mechanical]");
    expect(formatRequirementLine(card)).toBe("[Requires: Mechanical + Mechanical]");
  });

  it("prints None when the card forges only", () => {
    expect(formatEffectRegion(exampleCard({ rulesText: "" }))).toEqual(["None"]);
  });

  it("prints Active when above the effect body for rituals", () => {
    const card = exampleCard({
      type: "ritual",
      subtypes: ["instant"],
      rulesText: "Return cards from your graveyard to your hand.",
      ritual: { activeWhen: { darkness: 2 }, effects: [] },
    });
    expect(formatEffectRegion(card)).toEqual([
      "[Active when: Darkness + Darkness]",
      "Return cards from your graveyard to your hand.",
    ]);
  });

  it("prints Spend below Active when when the ritual burns the pile", () => {
    const card = exampleCard({
      type: "ritual",
      subtypes: ["instant"],
      rulesText: "[Search 2] Instant or Ritual cards.",
      ritual: {
        activeWhen: { arcane: 2 },
        spend: { arcane: 2 },
        effects: [],
      },
    });
    expect(formatEffectRegion(card)).toEqual([
      "[Active when: Arcane + Arcane]",
      "[Spend: Arcane + Arcane]",
      "[Search 2] Instant or Ritual cards.",
    ]);
  });

  it("prints a fixed Energy cost", () => {
    expect(formatEnergyCost(exampleCard({ energyCost: 1 }))).toBe("1");
    expect(formatEnergyCost(exampleCard({ energyCost: 3 }))).toBe("3");
  });

  it("prints ? for variable Energy", () => {
    expect(formatEnergyCost(exampleCard({ energyCost: 1, variableEnergy: true }))).toBe("?");
  });
});
