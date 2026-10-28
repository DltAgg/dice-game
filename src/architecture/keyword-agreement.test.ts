import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Fails the build when Tag Skirmish print and docs/KEYWORDS.md disagree.
 * The current list is the squad and deck in deck-tag-skirmish. Brackets
 * named only on a "do not print" line are refusals. Brackets under
 * "### New tokens" are kept without a current card. Other glossary
 * brackets must appear on that list, and that list must not invent one.
 */

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CONTENT = join(REPO_ROOT, "src/server/content");
const BRACKET = /\[([^\]]+)\]/g;

type Loadout = {
  squad: string[];
  deckCounts: { cardId: string }[];
  faceDeck: string[];
  startingDice: string[][];
};

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function operatorsIn(text: string): Set<string> {
  const found = new Set<string>();
  for (const match of text.matchAll(BRACKET)) {
    const parts = match[1]!.replace(/\s+/g, " ").trim().toLowerCase().split(" ");
    const head: string[] = [];
    for (const part of parts) {
      if (/^(n|x|\d+)$/.test(part)) break;
      head.push(part);
    }
    if (head.length > 0) found.add(head.join(" "));
  }
  return found;
}

function phrasesIn(text: string): string[] {
  return [...text.matchAll(BRACKET)].map((match) =>
    match[1]!.replace(/\s+/g, " ").trim().toLowerCase(),
  );
}

function sectionBody(glossary: string, heading: string): string {
  const lines = glossary.split("\n");
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) throw new Error(`docs/KEYWORDS.md is missing ${heading}`);
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("#")) break;
    body.push(line);
  }
  return body.join("\n");
}

function collectPrint(value: unknown, print: string[], faceIds: Set<string>): void {
  if (typeof value === "string") {
    if (value.startsWith("face-")) faceIds.add(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPrint(item, print, faceIds);
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if ((key === "rulesText" || key === "assistRulesText") && typeof child === "string") {
      print.push(child);
    }
    collectPrint(child, print, faceIds);
  }
}

function loadEntity(kind: "cards" | "creatures" | "faces", id: string, seen: Set<string>, print: string[], faceIds: Set<string>): void {
  const key = `${kind}/${id}`;
  if (seen.has(key)) return;
  seen.add(key);
  collectPrint(readJson(join(CONTENT, kind, `${id}.json`)), print, faceIds);
}

describe("keyword agreement", () => {
  it("fails when Tag Skirmish print and the glossary disagree", () => {
    const glossary = readFileSync(join(REPO_ROOT, "docs/KEYWORDS.md"), "utf8").replace(
      /<!--[\s\S]*?-->/g,
      "",
    );
    const kept = operatorsIn(sectionBody(glossary, "### New tokens"));
    const refused = new Set<string>();
    for (const line of glossary.split("\n")) {
      if (/do not print|not current print/i.test(line)) {
        for (const operator of operatorsIn(line)) refused.add(operator);
      }
    }
    const live = operatorsIn(glossary);
    for (const operator of refused) live.delete(operator);
    for (const operator of kept) live.delete(operator);

    const loadout = readJson(join(CONTENT, "loadouts/tag-skirmish.json")) as Loadout;
    const print: string[] = [];
    const faceIds = new Set<string>([...loadout.faceDeck, ...loadout.startingDice.flat()]);
    const seen = new Set<string>();
    for (const id of loadout.squad) loadEntity("creatures", id, seen, print, faceIds);
    for (const entry of loadout.deckCounts) loadEntity("cards", entry.cardId, seen, print, faceIds);
    for (const id of faceIds) loadEntity("faces", id, seen, print, faceIds);

    const phrases = print.flatMap(phrasesIn);
    const used = new Set<string>();
    const unknown: string[] = [];
    const refusedOnCards: string[] = [];
    for (const phrase of phrases) {
      const matches = [...live, ...kept]
        .filter((operator) => phrase === operator || phrase.startsWith(`${operator} `))
        .sort((a, b) => b.length - a.length);
      const operator = matches[0];
      if (operator === undefined) {
        if ([...refused].some((name) => phrase === name || phrase.startsWith(`${name} `))) {
          refusedOnCards.push(phrase);
        } else {
          unknown.push(phrase);
        }
        continue;
      }
      if (live.has(operator)) used.add(operator);
    }

    const unused = [...live].filter((operator) => !used.has(operator)).sort();
    expect(unknown, "print bracket missing from the glossary").toEqual([]);
    expect(refusedOnCards, "print uses a refused bracket").toEqual([]);
    expect(unused, "glossary bracket unused by Tag Skirmish").toEqual([]);
  });
});
