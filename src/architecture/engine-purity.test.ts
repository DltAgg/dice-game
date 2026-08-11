import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The reducer's purity is the whole architecture (SPDD §7), so it is checked
 * mechanically rather than left to reviewer discipline. This runs under
 * `npm run test`, which means a violation fails the same command the
 * Definition of Done already requires.
 *
 * ESLint carries the same rules for editor feedback; this test is the one that
 * gates the build.
 */

const ENGINE_ROOT = fileURLToPath(new URL("../game", import.meta.url));

function engineSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return engineSourceFiles(path);
    if (!entry.endsWith(".ts")) return [];
    if (entry.endsWith(".test.ts")) return [];
    return [path];
  });
}

/** Comments are stripped so prose about `Math.random` does not trip the scan. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const FORBIDDEN_TOKENS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bMath\s*\.\s*random\b/, reason: "randomness must arrive through the injected RNG" },
  { pattern: /\bDate\s*\.\s*now\b/, reason: "the engine has no clock" },
  { pattern: /\bnew\s+Date\b/, reason: "the engine has no clock" },
  { pattern: /\bperformance\s*\.\s*now\b/, reason: "the engine has no clock" },
  { pattern: /\blocalStorage\b/, reason: "persistence is an adapter, not a rules source" },
  { pattern: /\bsessionStorage\b/, reason: "persistence is an adapter, not a rules source" },
  { pattern: /\bwindow\b/, reason: "the engine must not touch the DOM" },
  { pattern: /\bdocument\b/, reason: "the engine must not touch the DOM" },
  { pattern: /\bfetch\s*\(/, reason: "the engine must not perform I/O" },
  { pattern: /\bWebSocket\b/, reason: "networking is an adapter, not a rules source" },
  { pattern: /\bprocess\s*\.\s*env\b/, reason: "the engine must not read the environment" },
  { pattern: /\bcrypto\s*\.\s*randomUUID\b/, reason: "ids are supplied by the caller" },
];

const FORBIDDEN_IMPORTS: ReadonlyArray<{ specifier: string; reason: string }> = [
  { specifier: "react", reason: "the engine must not depend on React" },
  { specifier: "react-dom", reason: "the engine must not depend on React" },
  { specifier: "zustand", reason: "the engine must not depend on Zustand" },
  { specifier: "peerjs", reason: "the engine must not depend on PeerJS" },
  { specifier: "nanoid", reason: "ids are supplied by the caller, not generated in the engine" },
  { specifier: "node:fs", reason: "the engine must not perform I/O" },
  { specifier: "node:crypto", reason: "randomness must arrive through the injected RNG" },
];

const importSpecifiers = (source: string): string[] =>
  [...source.matchAll(/(?:^|\s)(?:import|export)[\s\S]*?from\s*["']([^"']+)["']/g)].flatMap(
    (match) => (match[1] === undefined ? [] : [match[1]]),
  );

describe("game engine purity", () => {
  const files = engineSourceFiles(ENGINE_ROOT);

  it("finds engine sources to check", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files)("%s uses no browser, clock or randomness globals", (file) => {
    const source = withoutComments(readFileSync(file, "utf8"));
    const violations = FORBIDDEN_TOKENS.filter(({ pattern }) => pattern.test(source)).map(
      ({ pattern, reason }) => `${String(pattern)} — ${reason}`,
    );
    expect(violations).toEqual([]);
  });

  it.each(files)("%s imports nothing from an outer layer", (file) => {
    const source = withoutComments(readFileSync(file, "utf8"));
    const specifiers = importSpecifiers(source);

    const banned = specifiers.filter((specifier) =>
      FORBIDDEN_IMPORTS.some((entry) => entry.specifier === specifier),
    );
    expect(banned).toEqual([]);

    const outward = specifiers.filter((specifier) =>
      /^@\/(ui|store|networking|app|decks)\b/.test(specifier),
    );
    expect(outward).toEqual([]);
  });
});
