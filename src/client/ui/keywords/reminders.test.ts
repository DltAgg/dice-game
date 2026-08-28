import { describe, expect, it } from "vitest";
import {
  extractBracketTokens,
  lookupKeywordReminders,
  splitBracketParts,
  tacticPrintText,
} from "./reminders.js";
import type { CardDefinition } from "@server";

describe("extractBracketTokens", () => {
  it("pulls unique [tokens] in print order", () => {
    const print = [
      "[Instant / Toxin]",
      "[Forge] 1 face [Synthetic] [Toxin] on your die",
      "On roll: [Empower 1]. [Mark 1 Toxin]. [Empower 1].",
    ].join("\n");

    expect(extractBracketTokens(print)).toEqual([
      "[Instant / Toxin]",
      "[Forge]",
      "[Synthetic]",
      "[Toxin]",
      "[Empower 1]",
      "[Mark 1 Toxin]",
    ]);
  });

  it("returns empty when print has no brackets", () => {
    expect(extractBracketTokens("Deal 2 damage to an enemy.")).toEqual([]);
  });
});

describe("splitBracketParts", () => {
  it("keeps surrounding English and marks bracket spans", () => {
    expect(splitBracketParts("On roll: [Empower 1].")).toEqual([
      { text: "On roll: ", keyword: false },
      { text: "[Empower 1]", keyword: true },
      { text: ".", keyword: false },
    ]);
  });
});

describe("lookupKeywordReminders", () => {
  it("looks up stems from sample print and skips type-line / face-kind brackets", () => {
    const print = [
      "[Instant / Toxin]",
      "[Forge] 1 face [Synthetic] [Toxin] on your die",
      "[Spend: Toxin]",
      "On roll: [Empower 1]. [Mark 1 Toxin].",
    ].join("\n");

    const rows = lookupKeywordReminders(print);
    expect(rows.map((row) => row.token)).toEqual([
      "[Forge]",
      "[Spend: Toxin]",
      "[Empower 1]",
      "[Mark 1 Toxin]",
      "Toxin",
    ]);
    expect(rows.find((row) => row.token === "[Empower 1]")?.reminder).toBe(
      "Next attack this turn deals +N.",
    );
    expect(rows.find((row) => row.token === "[Mark 1 Toxin]")?.reminder).toBe(
      "Put N of token X on the printed target, now.",
    );
    expect(rows.find((row) => row.token === "Toxin")?.reminder).toMatch(/ticks 1 damage/i);
  });

  it("distinguishes [Mark N X on attacks] from [Mark N X]", () => {
    const rows = lookupKeywordReminders("[Mark 1 Toxin on attacks]");
    expect(rows[0]?.token).toBe("[Mark 1 Toxin on attacks]");
    expect(rows[0]?.reminder).toMatch(/until end of turn/i);
    expect(rows.map((row) => row.token)).toContain("Toxin");
  });

  it("skips unknown tokens instead of inventing a mechanic", () => {
    expect(lookupKeywordReminders("[Exterminate] the wounded. [Synthetic]")).toEqual([]);
    expect(lookupKeywordReminders("[Strike equal]")).toEqual([]);
  });

  it("matches operator families from the glossary", () => {
    const print = [
      "[Strip 3 Shield]",
      "[Generate 1 Arcane]",
      "[Forge 1 Synthetic Mechanical]",
      "[Negate Instant]",
      "[Destroy Ritual]",
      "[Gain 2 Energy]",
      "[Strike 3]",
      "[Heal 1]",
      "[Draw 2]",
      "[Pierce 1]",
      "[Prevent]",
      "[Drain 2]",
      "[Convert 1]",
      "[Discount 2]",
      "[Insight 3]",
      "[Search 1]",
      "[Recall 1]",
      "[Mill 2]",
      "[Reposition]",
      "[Reforge]",
      "[Stamp]",
      "[Double]",
      "[Resonance]",
      "[Reroll]",
      "[Retain]",
      "[Active when: Arcane]",
    ].join(" ");

    const tokens = lookupKeywordReminders(print).map((row) => row.token);
    expect(tokens).toEqual([
      "[Strip 3 Shield]",
      "[Generate 1 Arcane]",
      "[Forge 1 Synthetic Mechanical]",
      "[Negate Instant]",
      "[Destroy Ritual]",
      "[Gain 2 Energy]",
      "[Strike 3]",
      "[Heal 1]",
      "[Draw 2]",
      "[Pierce 1]",
      "[Prevent]",
      "[Drain 2]",
      "[Convert 1]",
      "[Discount 2]",
      "[Insight 3]",
      "[Search 1]",
      "[Recall 1]",
      "[Mill 2]",
      "[Reposition]",
      "[Reforge]",
      "[Stamp]",
      "[Double]",
      "[Resonance]",
      "[Reroll]",
      "[Retain]",
      "[Active when: Arcane]",
      "Shield",
    ]);
  });

  it("does not treat Generate's symbol as a creature token reminder", () => {
    const rows = lookupKeywordReminders("[Generate 1 Toxin]");
    expect(rows.map((row) => row.token)).toEqual(["[Generate 1 Toxin]"]);
  });
});

describe("tacticPrintText", () => {
  it("includes type, forge, and effect so [Forge] is found", () => {
    const card = {
      type: "instant",
      subtypes: [],
      attribute: "martial",
      forge: { faces: 1, kind: "synthetic", attribute: "martial", target: "own-die" },
      rulesText: "[Strike 2]",
    } as unknown as CardDefinition;

    const print = tacticPrintText(card);
    expect(print).toContain("[Forge]");
    expect(print).toContain("[Strike 2]");
    expect(lookupKeywordReminders(print).map((row) => row.token)).toEqual([
      "[Forge]",
      "[Strike 2]",
    ]);
  });
});
