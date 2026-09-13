import { describe, expect, it } from "vitest";
import { testCard } from "@server/testing/fixtures/index.js";
import {
  formatBucketWeight,
  formatTypeMix,
  summarizeDeckCosts,
} from "./deckCostStats.js";

const cost1Instant = testCard({
  playCost: { luminar: 1 },
  attribute: "luminar",
  type: "instant",
});
const cost1Reaction = testCard({
  playCost: { luminar: 1 },
  attribute: "luminar",
  type: "reaction",
});
const cost2Instant = testCard({
  playCost: { mechanical: 2 },
  type: "instant",
});
const cost2Reaction = testCard({
  playCost: { luminar: 2 },
  attribute: "luminar",
  type: "reaction",
});
const cost2Equipment = testCard({
  playCost: { mechanical: 2 },
  type: "equipment",
  equipment: { mayTargetOpponent: false, abilities: [] },
});

describe("summarizeDeckCosts", () => {
  it("groups copies into cost buckets with type and weight", () => {
    const summary = summarizeDeckCosts([
      cost1Instant.id,
      cost1Instant.id,
      cost1Reaction.id,
      cost1Reaction.id,
      cost2Instant.id,
      cost2Instant.id,
      cost2Reaction.id,
      cost2Equipment.id,
    ]);
    expect(summary.cardCount).toBe(8);
    expect(summary.uniqueCards).toBe(5);
    expect(summary.costWeight).toBe(4 * 1 + 4 * 2);

    const oneCost = summary.buckets.find((row) => row.bucket === 1);
    expect(oneCost?.total).toBe(4);
    expect(oneCost?.costWeight).toBe(4);
    expect(oneCost?.byType.instant).toBe(2);
    expect(oneCost?.byType.reaction).toBe(2);
    expect(oneCost && formatTypeMix(oneCost.byType)).toBe("2 Instant / 2 Reaction");
    expect(oneCost && formatBucketWeight(oneCost)).toBe("4×1=4");

    const twoCost = summary.buckets.find((row) => row.bucket === 2);
    expect(twoCost?.total).toBe(4);
    expect(twoCost?.costWeight).toBe(8);
    expect(twoCost?.byType.instant).toBe(2);
    expect(twoCost?.byType.reaction).toBe(1);
    expect(twoCost?.byType.equipment).toBe(1);
    expect(twoCost && formatTypeMix(twoCost.byType)).toBe(
      "2 Instant / 1 Reaction / 1 Equipment",
    );
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
