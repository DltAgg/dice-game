import { describe, expect, it } from "vitest";
import { PLAYTEST_P1, createPlaytestMatch } from "./setup.js";
import { legalActions } from "./candidates/index.js";
import { parsePlaytestArgs, formatPlaytestReport } from "./cli.js";
import { runPlaytestMatch } from "./driver.js";

describe("headless AI playtest", () => {
  it("opens a match with ROLL_DICE as the only legal intent", () => {
    const state = createPlaytestMatch(1, "tempo", "control");
    const legal = legalActions(state, PLAYTEST_P1);
    expect(legal).toEqual([{ type: "ROLL_DICE", playerId: PLAYTEST_P1 }]);
  });

  it("plays a seeded match without throwing", { timeout: 120_000 }, () => {
    const report = runPlaytestMatch({
      seed: 7,
      p1LoadoutId: "tempo",
      p2LoadoutId: "control",
      maxTurns: 60,
    });
    expect(["finished", "max-turns", "stall"]).toContain(report.stopReason);
    expect(report.actionsPlayed).toBeGreaterThan(0);
    if (report.stopReason === "finished") {
      expect(report.status).toBe("finished");
      expect(report.winner).not.toBeNull();
    } else {
      expect(report.status).toBe("in-progress");
      expect(report.winner).toBeNull();
    }
  });

  it("reproduces the same match from the same seed", { timeout: 120_000 }, () => {
    const options = {
      seed: 11,
      p1LoadoutId: "control",
      p2LoadoutId: "tempo",
      maxTurns: 40,
    } as const;
    const first = runPlaytestMatch(options);
    const second = runPlaytestMatch(options);
    expect(second.stopReason).toBe(first.stopReason);
    expect(second.turnsPlayed).toBe(first.turnsPlayed);
    expect(second.actionsPlayed).toBe(first.actionsPlayed);
    expect(second.actions).toEqual(first.actions);
  });

  it("parses CLI flags and formats a report line", { timeout: 30_000 }, () => {
    const parsed = parsePlaytestArgs([
      "--seed",
      "3",
      "--p1",
      "control",
      "--p2",
      "tempo",
      "--matches",
      "2",
      "--strength",
      "fast",
    ]);
    expect(parsed.seed).toBe(3);
    expect(parsed.p1LoadoutId).toBe("control");
    expect(parsed.p2LoadoutId).toBe("tempo");
    expect(parsed.matches).toBe(2);
    expect(parsed.strength).toBe("fast");
    const report = runPlaytestMatch({
      seed: parsed.seed,
      p1LoadoutId: parsed.p1LoadoutId,
      p2LoadoutId: parsed.p2LoadoutId,
    });
    const line = formatPlaytestReport(report);
    expect(line).toContain("seed=3");
    expect(line).toContain("stop=");
  });
});
