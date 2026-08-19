import { describe, expect, it } from "vitest";
import { buildMetricsExport, formatAgentPrompt, formatMetricsMarkdown } from "./export.js";
import { fakeRecording } from "./fixtures.js";
import { METRICS_SCHEMA_VERSION } from "./thresholds.js";

describe("metrics export", () => {
  it("embeds schema, preamble, insights, and compact matches", () => {
    const exported = buildMetricsExport([fakeRecording()], Date.parse("2026-08-18T15:00:00.000Z"));
    expect(exported.schemaVersion).toBe(METRICS_SCHEMA_VERSION);
    expect(exported.exportedAt).toBe("2026-08-18T15:00:00.000Z");
    expect(exported.promptPreamble).toContain("10");
    expect(exported.promptPreamble).toContain("drag score");
    expect(exported.matches).toHaveLength(1);
    expect(exported.matches[0]?.totalTurns).toBe(22);
    expect(exported.insights.length).toBeGreaterThan(0);
  });

  it("markdown briefing includes histogram and a prompt an agent can read", () => {
    const exported = buildMetricsExport([fakeRecording()], Date.parse("2026-08-18T15:00:00.000Z"));
    const md = formatMetricsMarkdown(exported);
    expect(md).toContain("Dice Skirmish metrics briefing");
    expect(md).toContain("Turn-length histogram");
    expect(md).toContain("Cards played (effect)");
    expect(md).toContain("Cards played to forge");
    expect(md).toContain("Play vs forge (hand cards spent)");
    expect(md).toContain("Effect vs forge by turn");
    expect(md).toContain("22");

    const prompt = formatAgentPrompt(exported);
    expect(prompt).toContain("```json");
    expect(prompt).toContain('"schemaVersion": 1');
  });
});
