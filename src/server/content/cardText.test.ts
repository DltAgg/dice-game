import { describe, expect, it } from "vitest";
import type { CardDefinition, ForgeRegion } from "../model/cards.js";
import { asCardId } from "../model/ids.js";
import {
  formatEffectRegion,
  formatInspectEffectLines,
  formatPlayCostLine,
  formatForgeLine,
  formatRequirementLine,
  formatTypeLine,
} from "./cardText.js";
import {
  ARCHIVISTS_SUMMONS,
  DAYBREAK_RITE,
  ECHO_OF_THE_BURIED,
  GRAVEN_SUMMONS,
  LIGHTLESS_VERDICT,
  TEMPERING_LINE,
  TWIN_CAM,
  getCard,
} from "./cards.js";

function exampleCard(overrides: Partial<CardDefinition> = {}): CardDefinition {
  const attribute = overrides.attribute ?? "arcane";
  const { forge, ...rest } = overrides;
  return {
    id: asCardId("card-example"),
    name: "Example",
    playCost: { arcane: 1 },
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
    expect(formatRequirementLine(card)).toBe("[Active when: 2 x Arcane]");
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

  it("prints Requires for non-ritual pile gates", () => {
    const card = exampleCard({
      type: "instant",
      attribute: "mechanical",
      effect: { requires: { mechanical: 2 }, effects: [] },
    });
    expect(formatTypeLine(card)).toBe("[Instant / Mechanical]");
    expect(formatRequirementLine(card)).toBe("[Requires: 2 x Mechanical]");
  });

  it("prints Twin Cam effect.requires as a Requires gate", () => {
    const twinCam = getCard(TWIN_CAM);
    if (twinCam === undefined) throw new Error("Twin Cam");
    expect(formatRequirementLine(twinCam)).toBe("[Requires: 2 x Mechanical]");
  });

  it("prints converted engine rituals as Continuous and closers as Instant", () => {
    const archivists = getCard(ARCHIVISTS_SUMMONS);
    const tempering = getCard(TEMPERING_LINE);
    const graven = getCard(GRAVEN_SUMMONS);
    const daybreak = getCard(DAYBREAK_RITE);
    const verdict = getCard(LIGHTLESS_VERDICT);
    const echo = getCard(ECHO_OF_THE_BURIED);
    if (
      archivists === undefined ||
      tempering === undefined ||
      graven === undefined ||
      daybreak === undefined ||
      verdict === undefined ||
      echo === undefined
    ) {
      throw new Error("converted ritual set");
    }
    expect(formatTypeLine(archivists)).toBe("[Ritual / Continuous / Arcane]");
    expect(formatTypeLine(tempering)).toBe("[Ritual / Continuous / Mechanical]");
    expect(formatTypeLine(graven)).toBe("[Ritual / Continuous / Darkness]");
    expect(formatTypeLine(daybreak)).toBe("[Ritual / Continuous / Luminar]");
    expect(formatTypeLine(verdict)).toBe("[Instant / Darkness]");
    expect(formatRequirementLine(verdict)).toBe("[Requires: Arcane]");
    expect(formatTypeLine(echo)).toBe("[Instant / Darkness]");
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
      "[Spend: Arcane]",
      "[Active when: 2 x Darkness]",
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
      "[Spend: Arcane]",
      "[Active when: 2 x Arcane]",
      "[Spend: 2 x Arcane]",
      "[Search 2] Instant or Ritual cards.",
    ]);
  });

  it("inspect effect lines omit header play cost and gate already shown elsewhere", () => {
    const card = exampleCard({
      type: "instant",
      attribute: "mechanical",
      rulesText: "[Strike 2].",
      effect: { requires: { mechanical: 2 }, effects: [] },
    });
    expect(formatInspectEffectLines(card)).toEqual(["[Strike 2]."]);
    expect(formatEffectRegion(card)).toEqual([
      "[Spend: Arcane]",
      "[Requires: 2 x Mechanical]",
      "[Strike 2].",
    ]);
  });

  it("prints a fixed play cost line", () => {
    expect(formatPlayCostLine(exampleCard({ playCost: { arcane: 1 } }))).toBe(
      "[Spend: Arcane]",
    );
    expect(formatPlayCostLine(exampleCard({ playCost: { arcane: 3 } }))).toBe(
      "[Spend: 3 x Arcane]",
    );
  });

  it("omits the play cost line when playCost is absent", () => {
    const card = exampleCard();
    const { playCost, ...withoutCost } = card;
    void playCost;
    expect(formatPlayCostLine(withoutCost)).toBeNull();
  });

  it("prints Any as generic pile pips", () => {
    expect(formatPlayCostLine(exampleCard({ playCost: { any: 2 } }))).toBe("[Spend: 2 x Any]");
    expect(formatPlayCostLine(exampleCard({ playCost: { arcane: 1, any: 2 } }))).toBe(
      "[Spend: Arcane + 2 x Any]",
    );
    expect(
      formatRequirementLine(
        exampleCard({
          type: "ritual",
          subtypes: ["continuous"],
          ritual: { activeWhen: { arcane: 1, any: 2 }, effects: [] },
        }),
      ),
    ).toBe("[Active when: Arcane + 2 x Any]");
    expect(
      formatRequirementLine(
        exampleCard({
          type: "instant",
          effect: { requires: { any: 1 }, effects: [] },
        }),
      ),
    ).toBe("[Requires: Any]");
  });
});
