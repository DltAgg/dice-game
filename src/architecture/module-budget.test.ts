import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Stops megamodules from coming back. Spec `020` guideline is ~400 lines for
 * new production files. Frozen leftovers may not grow; split them instead of
 * adding more to the same file. Runs under `npm test` (DoD).
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SRC_ROOT = join(REPO_ROOT, "src");

/** New or unlisted production files must stay at or under this. */
const NEW_FILE_MAX_LINES = 500;

/**
 * Known leftovers from the architecture split. Values are a freeze ceiling
 * (current size + a little slack). Shrink by extracting; do not raise these
 * without splitting the file in the same change.
 */
const FROZEN_MAX_LINES: Readonly<Record<string, number>> = {
  "src/server/reducer/resolution.ts": 2030,
  "src/client/ui/match/MatchBoard.tsx": 1510,
  "src/server/reducer/pending/resolvers.ts": 940,
  "src/server/reducer/triggers.ts": 700,
  "src/client/ui/decks/DeckBuilder.tsx": 640,
  "src/client/metrics/insights.ts": 640,
  "src/client/ui/metrics/MetricsDashboard.tsx": 630,
  "src/client/networking/hostSession.ts": 570,
  "src/client/ui/match/Lobby.tsx": 530,
  "src/server/model/effects.ts": 500,
  "src/client/store/onlineSessionController.ts": 480,
  "src/server/model/state.ts": 460,
  "src/server/rules/faces.ts": 460,
  "src/server/reducer/zones.ts": 460,
};

/** Id-constant loaders — catalogue bodies live in JSON. */
const CATALOGUE_LOADER_MAX_LINES: Readonly<Record<string, number>> = {
  "src/server/content/cards.ts": 180,
  "src/server/content/creatures.ts": 100,
  "src/server/content/faces.ts": 220,
};

const PRODUCTION_EXTENSIONS = new Set([".ts", ".tsx"]);

function isTestFile(rel: string): boolean {
  return (
    rel.endsWith(".test.ts") ||
    rel.endsWith(".test.tsx") ||
    rel.includes("/testing/") ||
    rel.includes("\\testing\\")
  );
}

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return walk(path);
    return [path];
  });
}

function posixRel(abs: string): string {
  return relative(REPO_ROOT, abs).split("\\").join("/");
}

function lineCount(abs: string): number {
  const text = readFileSync(abs, "utf8");
  if (text.length === 0) return 0;
  return text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
}

describe("module budget", () => {
  it("does not recreate src/game", () => {
    expect(existsSync(join(SRC_ROOT, "game"))).toBe(false);
  });

  it("keeps catalogue loaders thin (data is JSON)", () => {
    const violations: string[] = [];
    for (const [rel, max] of Object.entries(CATALOGUE_LOADER_MAX_LINES)) {
      const abs = join(REPO_ROOT, rel);
      expect(existsSync(abs), rel).toBe(true);
      const lines = lineCount(abs);
      if (lines > max) {
        violations.push(`${rel}: ${String(lines)} lines (max ${String(max)})`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("does not grow frozen files or add new megamodules", () => {
    const files = walk(SRC_ROOT)
      .map(posixRel)
      .filter((rel) => {
        const ext = rel.slice(rel.lastIndexOf("."));
        return PRODUCTION_EXTENSIONS.has(ext) && !isTestFile(rel);
      });

    const violations: string[] = [];
    for (const rel of files) {
      const lines = lineCount(join(REPO_ROOT, rel));
      const frozen = FROZEN_MAX_LINES[rel];
      const loader = CATALOGUE_LOADER_MAX_LINES[rel];
      if (frozen !== undefined) {
        if (lines > frozen) {
          violations.push(
            `${rel}: ${String(lines)} lines exceeds freeze ${String(frozen)} — split before adding more`,
          );
        }
        continue;
      }
      if (loader !== undefined) continue;
      if (lines > NEW_FILE_MAX_LINES) {
        violations.push(
          `${rel}: ${String(lines)} lines (new production files max ${String(NEW_FILE_MAX_LINES)}; extract a module)`,
        );
      }
    }
    expect(violations).toEqual([]);
  });
});
