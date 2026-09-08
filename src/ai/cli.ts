import { ALL_BUILTIN_LOADOUTS } from "@server";
import { runPlaytestMatch } from "./driver.js";
import { parseStrength, type AiStrength } from "./search/config.js";
import type { PlaytestReport } from "./types.js";

export function formatPlaytestReport(report: PlaytestReport): string {
  const winner =
    report.winner === null ? "none" : report.winner === "p1" ? report.p1LoadoutId : report.p2LoadoutId;
  const stall = report.stallDetail === null ? "" : ` stall=${report.stallDetail}`;
  return [
    `seed=${String(report.seed)}`,
    `p1=${report.p1LoadoutId}`,
    `p2=${report.p2LoadoutId}`,
    `stop=${report.stopReason}`,
    `status=${report.status}`,
    `winner=${winner}`,
    `turns=${String(report.turnsPlayed)}`,
    `actions=${String(report.actionsPlayed)}`,
  ].join(" ") + stall;
}

export function parsePlaytestArgs(argv: readonly string[]): {
  readonly seed: number;
  readonly p1LoadoutId: string;
  readonly p2LoadoutId: string;
  readonly maxTurns: number;
  readonly matches: number;
  readonly strength: AiStrength;
} {
  const known = ALL_BUILTIN_LOADOUTS;
  const defaults = {
    seed: 1,
    p1LoadoutId: known[0]?.id ?? "deck-tempo",
    p2LoadoutId: known[1]?.id ?? known[0]?.id ?? "deck-tempo",
    maxTurns: 400,
    matches: 1,
    strength: "standard" as const,
  };

  const read = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    if (index < 0) return undefined;
    return argv[index + 1];
  };

  const seedRaw = read("--seed");
  const turnsRaw = read("--max-turns");
  const matchesRaw = read("--matches");
  const p1 = read("--p1") ?? defaults.p1LoadoutId;
  const p2 = read("--p2") ?? defaults.p2LoadoutId;

  return {
    seed: seedRaw === undefined ? defaults.seed : Number(seedRaw),
    p1LoadoutId: p1,
    p2LoadoutId: p2,
    maxTurns: turnsRaw === undefined ? defaults.maxTurns : Number(turnsRaw),
    matches: matchesRaw === undefined ? defaults.matches : Number(matchesRaw),
    strength: parseStrength(read("--strength") ?? defaults.strength),
  };
}

export function runPlaytestCli(argv: readonly string[]): string {
  const parsed = parsePlaytestArgs(argv);
  const lines: string[] = [];
  for (let index = 0; index < parsed.matches; index += 1) {
    const report = runPlaytestMatch({
      seed: parsed.seed + index,
      p1LoadoutId: parsed.p1LoadoutId,
      p2LoadoutId: parsed.p2LoadoutId,
      maxTurns: parsed.maxTurns,
      strength: parsed.strength,
    });
    lines.push(formatPlaytestReport(report));
  }
  return lines.join("\n");
}
