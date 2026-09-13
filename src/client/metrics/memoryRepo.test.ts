import { describe, expect, it } from "vitest";
import { fakeRecording } from "./fixtures.js";
import { createMemoryMetricsRepository, pruneRecordings } from "./memoryRepo.js";
import { MAX_STORED_RECORDINGS } from "./thresholds.js";
import { createMetricsCollector } from "./collector.js";
import { newMatch } from "@server/testing/scenario.js";

describe("memory metrics repository", () => {
  it("round-trips a recording", async () => {
    const repo = createMemoryMetricsRepository();
    const row = fakeRecording();
    await repo.save(row);
    expect(await repo.get(row.recordingId)).toEqual(row);
    expect(await repo.findByMatchId(row.matchId)).toEqual(row);
    expect(await repo.list()).toHaveLength(1);
    expect(await repo.remove(row.recordingId)).toBe(true);
    expect(await repo.list()).toHaveLength(0);
  });

  it("prunes down to the cap keeping newest updatedAt", () => {
    const rows = Array.from({ length: MAX_STORED_RECORDINGS + 5 }, (_, index) =>
      fakeRecording({
        recordingId: `r-${String(index)}`,
        matchId: `m-${String(index)}`,
        updatedAt: new Date(Date.UTC(2026, 7, 18, 0, 0, index)).toISOString(),
      }),
    );
    const pruned = pruneRecordings(rows);
    expect(pruned).toHaveLength(MAX_STORED_RECORDINGS);
  });
});

describe("metrics collector", () => {
  it("persists after each observe so a hydrate can resume the same match", async () => {
    const repo = createMemoryMetricsRepository();
    let now = 1_000;
    const collector = createMetricsCollector({
      repo,
      clock: { now: () => now },
      newId: () => "id-1",
    });
    const state = newMatch({ seed: 3, matchId: "persist-me" });
    await collector.observe({
      prevState: null,
      state,
      action: null,
      accepted: true,
      error: null,
      recordedAs: "local",
      roomCode: null,
      localPlayerId: null,
      p1DeckId: "a",
      p2DeckId: "b",
      p1DeckName: "A",
      p2DeckName: "B",
    });

    const resumed = createMetricsCollector({
      repo,
      clock: { now: () => now },
      newId: () => "id-2",
    });
    now = 5_000;
    await resumed.hydrate("persist-me");
    expect(resumed.current()?.recordingId).toBe("id-1");
    expect(resumed.current()?.matchId).toBe("persist-me");
  });

  it("drops an unplayed recording instead of leaving a 1-turn abandoned row", async () => {
    const repo = createMemoryMetricsRepository();
    let ids = 0;
    const collector = createMetricsCollector({
      repo,
      clock: { now: () => 1_000 },
      newId: () => `id-${String((ids += 1))}`,
    });
    const first = newMatch({ seed: 1, matchId: "ghost" });
    await collector.observe({
      prevState: null,
      state: first,
      action: null,
      accepted: true,
      error: null,
      recordedAs: "local",
      roomCode: null,
      localPlayerId: null,
      p1DeckId: "a",
      p2DeckId: "b",
      p1DeckName: "A",
      p2DeckName: "B",
    });
    expect(await repo.list()).toHaveLength(1);

    const second = newMatch({ seed: 2, matchId: "real" });
    await collector.observe({
      prevState: first,
      state: second,
      action: null,
      accepted: true,
      error: null,
      recordedAs: "local-ai",
      roomCode: null,
      localPlayerId: "p1",
      p1DeckId: "a",
      p2DeckId: "b",
      p1DeckName: "A",
      p2DeckName: "B",
    });

    const listed = await repo.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.matchId).toBe("real");
    expect(listed[0]?.recordedAs).toBe("local-ai");
    expect(listed.some((row) => row.status === "abandoned")).toBe(false);
  });
});
