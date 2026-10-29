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
      "[Spend: X]",
      "[Empower N]",
      "[Mark N X]",
      "Toxin",
    ]);
    expect(rows.find((row) => row.token === "[Empower N]")?.reminder).toBe(
      "Next attack this turn deals +N.",
    );
    expect(rows.find((row) => row.token === "[Mark N X]")?.reminder).toBe(
      "Put N of token X on the printed target, now.",
    );
    expect(rows.find((row) => row.token === "Toxin")?.reminder).toMatch(/ticks 1 damage/i);
  });

  it("distinguishes [Mark N X on attacks] from [Mark N X]", () => {
    const rows = lookupKeywordReminders("[Mark 1 Toxin on attacks]");
    expect(rows[0]?.token).toBe("[Mark N X on attacks]");
    expect(rows[0]?.reminder).toMatch(/until end of turn/i);
    expect(rows.map((row) => row.token)).toContain("Toxin");
  });

  it("skips unknown tokens instead of inventing a mechanic", () => {
    expect(lookupKeywordReminders("[Choose face] of selected die.").map((row) => row.token)).toEqual([
      "[Choose face]",
    ]);
    expect(lookupKeywordReminders("[Exterminate] the wounded. [Synthetic]")).toEqual([]);
    expect(lookupKeywordReminders("[Strike equal]")).toEqual([]);
  });

  it("looks up [Silence] from glossary print", () => {
    const rows = lookupKeywordReminders(
      "[Silence] an opposing creature, ritual, or face until the start of your next turn.",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.token).toBe("[Silence]");
    expect(rows[0]?.reminder).toMatch(/cannot fire/i);
  });

  it("matches operator families from the glossary", () => {
    const print = [
      "[Strip 3 Shield]",
      "[Generate 1 Arcane]",
      "[Forge 1 Synthetic Mechanical]",
      "[Overcharge]",
      "[Negate Instant]",
      "[Destroy Ritual]",
      "[Destroy Overload]",
      "[Bounce]",
      "[Strike 3]",
      "[Heal 1]",
      "[Draw 2]",
      "[Pierce 1]",
      "[Reduce 1]",
      "[Prevent]",
      "[Silence]",
      "[Desynthesize]",
      "[Drain 2]",
      "[Convert 1]",
      "[Discount 2]",
      "[Insight 3]",
      "[Search 1]",
      "[Recall 1]",
      "[Mill 2]",
      "[Reposition]",
      "[Reforge 2 Mechanical]",
      "[Cross forge 1 Mechanical / Luminar]",
      "[Stamp]",
      "[Double]",
      "[Resonance]",
      "[Reroll]",
      "[Retain]",
      "[Active when: Arcane]",
    ].join(" ");

    const tokens = lookupKeywordReminders(print).map((row) => row.token);
    expect(tokens).toEqual([
      "[Strip N X]",
      "[Generate N X]",
      "[Forge]",
      "[Overcharge]",
      "[Negate]",
      "[Destroy]",
      "[Bounce]",
      "[Strike N]",
      "[Heal N]",
      "[Draw N]",
      "[Pierce N]",
      "[Reduce N]",
      "[Prevent N]",
      "[Silence]",
      "[Desynthesize]",
      "[Drain N]",
      "[Convert N]",
      "[Discount N]",
      "[Insight N]",
      "[Search N]",
      "[Recall N]",
      "[Mill N]",
      "[Reposition]",
      "[Reforge N X]",
      "[Cross forge N Y / Z]",
      "[Stamp]",
      "[Double]",
      "[Resonance]",
      "[Reroll]",
      "[Retain]",
      "[Active when: X]",
      "Shield",
    ]);
  });

  it("treats Generate as a pool-symbol reminder", () => {
    const rows = lookupKeywordReminders("[Generate 1 Toxin]");
    expect(rows.map((row) => row.token)).toEqual(["[Generate N X]"]);
  });

  it("looks up [Overcharge] as the hand-card spend", () => {
    const rows = lookupKeywordReminders("[Overcharge]");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.token).toBe("[Overcharge]");
    expect(rows[0]?.reminder).toMatch(/attribute face card/i);
  });

  it("recognizes the tag-fighter keywords on current print", () => {
    const print = [
      "[Block 2].",
      "[Counter].",
      "[Parry].",
      "[Replace] to Grab. [Moveset Low Blow].",
      "[Tag in] a Reserve Fighter.",
      "[Tag out] the opponent's Active Fighter and it cannot [Tag in] until the end of its next turn.",
      "[Redirect] that hit onto the Fighter you choose.",
      "[Redirect 4] to this fighter.",
    ].join(" ");

    const rows = lookupKeywordReminders(print);
    expect(rows.map((row) => row.token)).toEqual([
      "[Block N]",
      "[Counter]",
      "[Parry]",
      "[Replace]",
      "[Moveset X]",
      "[Tag in]",
      "[Tag out]",
      "[Redirect N]",
    ]);
    expect(rows.find((row) => row.token === "[Tag out]")?.reminder).not.toMatch(/living/i);
    expect(rows.find((row) => row.token === "[Tag in]")?.reminder).not.toMatch(/living/i);
  });

  it("matches Reforge N Attribute and Cross forge N Y / Z", () => {
    expect(lookupKeywordReminders("[Reforge 2 Mechanical]").map((row) => row.token)).toEqual([
      "[Reforge N X]",
    ]);
    expect(
      lookupKeywordReminders("[Cross forge 1 Mechanical / Luminar]").map((row) => row.token),
    ).toEqual(["[Cross forge N Y / Z]"]);
  });

  it("shows one generic row when the same keyword is printed more than once", () => {
    const rows = lookupKeywordReminders(
      "[Strike 2]. [Strike 4]. [Moveset Low Blow]. [Moveset Beast Form]. [Tag in]. [Tag in].",
    );
    expect(rows.map((row) => row.token)).toEqual(["[Strike N]", "[Moveset X]", "[Tag in]"]);
  });
});

describe("tacticPrintText", () => {
  it("includes type and effect, and omits the unused forge line", () => {
    const card = {
      type: "modify",
      subtypes: [],
      attribute: "martial",
      forge: { faces: 1, kind: "synthetic", attribute: "martial", target: "own-die" },
      rulesText: "[Strike 2]",
    } as unknown as CardDefinition;

    const print = tacticPrintText(card);
    expect(print).not.toContain("[Forge]");
    expect(print).toContain("[Strike 2]");
    expect(lookupKeywordReminders(print).map((row) => row.token)).toEqual(["[Strike N]"]);
  });
});
