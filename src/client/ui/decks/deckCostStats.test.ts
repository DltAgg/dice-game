import { describe, expect, it } from "vitest";
import {
  COG_DRAFT,
  GLINT_VEIL,
  LANTERN_OATH,
  MENDING_LIGHT,
  PRISM_MANTLE,
} from "@server/content/cards.js";
import {
  formatBucketWeight,
  formatTypeMix,
  summarizeDeckCosts,
} from "./deckCostStats.js";

describe("summarizeDeckCosts", () => {
  it("groups copies into cost buckets with type, forge, and weight", () => {
    const summary = summarizeDeckCosts([
      MENDING_LIGHT,
      MENDING_LIGHT,
      GLINT_VEIL,
      GLINT_VEIL,
      COG_DRAFT,
      COG_DRAFT,
      LANTERN_OATH,
      PRISM_MANTLE,
    ]);
    expect(summary.cardCount).toBe(8);
    expect(summary.uniqueCards).toBe(5);
    expect(summary.byForge.natural).toBe(6);
    expect(summary.byForge.synthetic).toBe(2);
    expect(summary.costWeight).toBe(4 * 1 + 4 * 2);

    const oneCost = summary.buckets.find((row) => row.bucket === 1);
    expect(oneCost?.total).toBe(4);
    expect(oneCost?.costWeight).toBe(4);
    expect(oneCost?.byForge.natural).toBe(4);
    expect(oneCost?.byForge.synthetic).toBe(0);
    expect(oneCost?.byForgeType.natural.instant).toBe(2);
    expect(oneCost?.byForgeType.natural.reaction).toBe(2);
    expect(oneCost && formatTypeMix(oneCost.byForgeType.natural)).toBe(
      "2 Instant / 2 Reaction",
    );
    expect(oneCost && formatBucketWeight(oneCost)).toBe("4×1=4");

    const twoCost = summary.buckets.find((row) => row.bucket === 2);
    expect(twoCost?.total).toBe(4);
    expect(twoCost?.costWeight).toBe(8);
    expect(twoCost?.byType.instant).toBe(2);
    expect(twoCost?.byType.reaction).toBe(1);
    expect(twoCost?.byType.equipment).toBe(1);
    expect(twoCost?.byForge.synthetic).toBe(2);
    expect(twoCost?.byForge.natural).toBe(2);
    expect(twoCost && formatBucketWeight(twoCost)).toBe("4×2=8");
  });

  it("returns empty-friendly summary for an empty deck", () => {
    const summary = summarizeDeckCosts([]);
    expect(summary.cardCount).toBe(0);
    expect(summary.averageCost).toBe(0);
    expect(summary.costWeight).toBe(0);
    expect(summary.buckets.every((row) => row.total === 0)).toBe(true);
  });
});
