import { describe, expect, it } from "vitest";
import { getFaceCard } from "@server";
import { asFaceCardId } from "@server/model/ids.js";
import { showingFaceTooltip } from "./showingFaceTooltip";

describe("showing face tooltip", () => {
  it("lists type, strength, role, action, and printed abilities", () => {
    const dash = getFaceCard(asFaceCardId("face-natural-dash"));
    if (dash === undefined) throw new Error("dash");
    expect(showingFaceTooltip(dash)).toEqual({
      facts: [
        { label: "Type", value: "Kick" },
        { label: "Strength", value: "Medium" },
        { label: "Role", value: "Extender" },
        { label: "Action", value: "Attack" },
      ],
      abilities: [
        { label: "Primary", text: "[Strike 2]." },
        { label: "Secondary", text: "+1 damage." },
      ],
      notes: [],
      line: "Kick / Medium / Extender / Attack",
    });
  });

  it("keeps a meter sentence that is not the type or strength", () => {
    const charge = getFaceCard(asFaceCardId("face-natural-charge"));
    if (charge === undefined) throw new Error("charge");
    const detail = showingFaceTooltip(charge);
    expect(detail.facts).toEqual([
      { label: "Type", value: "Punch" },
      { label: "Strength", value: "Heavy" },
      { label: "Role", value: "Finisher" },
      { label: "Action", value: "Attack" },
    ]);
    expect(detail.line).toBe("Punch / Heavy / Finisher / Attack");
    expect(detail.notes).toEqual(["Spend 1 Meter."]);
    expect(detail.abilities[0]).toEqual({ label: "Primary", text: "[Strike 4]." });
  });
});