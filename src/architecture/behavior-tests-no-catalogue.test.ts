import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Behavior tests must not treat live catalogue JSON as subjects. Content
 * tests under `src/server/content` and builtin-loadout legality may still
 * import production ids.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SRC_ROOT = join(REPO_ROOT, "src");

const ALLOWED = new Set([
  "src/server/rules/loadout.test.ts",
  "src/client/decks/memoryRepo.test.ts",
  "src/client/networking/hostLoadout.test.ts",
]);

const LOOKUP_ONLY = /^(?:getCard|getFaceCard|getCreatureDefinition)$/;

function isTestFile(rel: string): boolean {
  return rel.endsWith(".test.ts") || rel.endsWith(".test.tsx");
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

function isContentTest(rel: string): boolean {
  return rel.startsWith("src/server/content/");
}

function catalogueImportBlocks(source: string): readonly { names: readonly string[]; snippet: string }[] {
  const blocks: { names: string[]; snippet: string }[] = [];
  const re =
    /import\s+(?:type\s+)?(?:\{([^}]*)\}|\*\s+as\s+\w+|[\w$]+)\s+from\s+["'](?:@server\/content\/(?:cards|creatures|faces|loadouts)|(?:\.\.\/)+content\/(?:cards|creatures|faces|loadouts)(?:\/index)?)(?:\.js)?["']/gs;
  for (const match of source.matchAll(re)) {
    const named = match[1];
    const snippet = match[0].replace(/\s+/g, " ").trim();
    if (named === undefined) {
      blocks.push({ names: ["*"], snippet });
      continue;
    }
    const names = named
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0 && part !== "type")
      .map((part) => part.replace(/^type\s+/, "").split(/\s+as\s+/)[0]?.trim() ?? "")
      .filter((name) => name.length > 0);
    blocks.push({ names, snippet });
  }
  return blocks;
}

describe("behavior tests do not use live catalogue ids", () => {
  const files = walk(SRC_ROOT)
    .map(posixRel)
    .filter((rel) => isTestFile(rel) && !isContentTest(rel) && !ALLOWED.has(rel));

  it("scans behavior tests", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files)("%s does not import catalogue documents as subjects", (rel) => {
    const source = readFileSync(join(REPO_ROOT, rel), "utf8");
    const violations: string[] = [];
    for (const block of catalogueImportBlocks(source)) {
      const extras = block.names.filter((name) => !LOOKUP_ONLY.test(name));
      if (extras.length > 0) {
        violations.push(`${block.snippet} (${extras.join(", ")})`);
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });
});
