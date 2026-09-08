import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Spec `026` / `027`: the AI is a sibling slice. It consumes the public
 * engine barrel. Rules must not import it. The client may import it as a
 * player adapter (`chooseAction` for local vs-AI).
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SRC_ROOT = join(REPO_ROOT, "src");

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

const importSpecifiers = (source: string): string[] =>
  [...source.matchAll(/(?:^|\s)(?:import|export)[\s\S]*?from\s*["']([^"']+)["']/g)].flatMap(
    (match) => (match[1] === undefined ? [] : [match[1]]),
  );

function productionTs(relPrefix: string): string[] {
  return walk(join(SRC_ROOT, relPrefix.replace(/^src\//, "")))
    .map(posixRel)
    .filter(
      (rel) =>
        (rel.endsWith(".ts") || rel.endsWith(".tsx")) &&
        !rel.endsWith(".test.ts") &&
        !rel.endsWith(".test.tsx"),
    );
}

describe("AI playtest slice isolation", () => {
  it("src/ai production files import only @server, relatives, or node:process", () => {
    const files = productionTs("src/ai");
    expect(files.length).toBeGreaterThan(5);
    const violations: string[] = [];
    for (const rel of files) {
      const specifiers = importSpecifiers(readFileSync(join(REPO_ROOT, rel), "utf8"));
      for (const specifier of specifiers) {
        const relative = specifier.startsWith("./") || specifier.startsWith("../");
        const relativeOk =
          relative && !specifier.includes("/server/") && !specifier.includes("/client/");
        const ok = specifier === "@server" || relativeOk || specifier === "node:process";
        if (!ok) violations.push(`${rel}: ${specifier}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("src/server does not import src/ai", () => {
    const files = productionTs("src/server");
    const violations: string[] = [];
    for (const rel of files) {
      const specifiers = importSpecifiers(readFileSync(join(REPO_ROOT, rel), "utf8"));
      for (const specifier of specifiers) {
        const mentionsSlice =
          specifier === "@ai" ||
          specifier.startsWith("@ai/") ||
          specifier === "@/ai" ||
          specifier.startsWith("@/ai/") ||
          specifier === "src/ai" ||
          specifier.startsWith("src/ai/") ||
          /(^|[./])ai(\/|$)/.test(specifier);
        if (mentionsSlice) violations.push(`${rel}: ${specifier}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("client may import @ai / @/ai as a player adapter", () => {
    const files = productionTs("src/client");
    const clientImportsAi = files.some((rel) => {
      const specifiers = importSpecifiers(readFileSync(join(REPO_ROOT, rel), "utf8"));
      return specifiers.some(
        (specifier) =>
          specifier === "@ai" ||
          specifier.startsWith("@ai/") ||
          specifier === "@/ai" ||
          specifier.startsWith("@/ai/"),
      );
    });
    expect(clientImportsAi).toBe(true);
  });
});
