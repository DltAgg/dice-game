import { describe, expect, it } from "vitest";
import { COG_DRAFT, GLINT_VEIL, LANTERN_OATH } from "@server/content/cards.js";
import { summarizeDeckCosts } from "./deckCostStats.js";

describe("summarizeDeckCosts", () => {
  it("groups copies into cost buckets with type breakdown", () => {
    const summary = summarizeDeckCosts([COG_DRAFT, COG_DRAFT, GLINT_VEIL, LANTERN_OATH]);
    expect(summary.cardCount).toBe(4);
    expect(summary.uniqueCards).toBe(3);

    const twoCost = summary.buckets.find((row) => row.bucket === 2);
    expect(twoCost?.total).toBe(3);
    expect(twoCost?.byType.instant).toBe(2);
    expect(twoCost?.byType.reaction).toBe(1);

    const threeCost = summary.buckets.find((row) => row.bucket === 3);
    expect(threeCost?.total).toBe(1);
    expect(threeCost?.byType.reaction).toBe(1);
  });

  it("returns empty-friendly summary for an empty deck", () => {
    const summary = summarizeDeckCosts([]);
    expect(summary.cardCount).toBe(0);
    expect(summary.averageCost).toBe(0);
    expect(summary.buckets.every((row) => row.total === 0)).toBe(true);
  });
});
