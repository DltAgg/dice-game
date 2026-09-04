import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

const SCHEMA_DIR = dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = dirname(SCHEMA_DIR);

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function jsonFiles(directory: string): readonly string[] {
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json") && !name.startsWith("_"))
    .map((name) => join(directory, name));
}

function formatErrors(
  errors: readonly { instancePath?: string; message?: string }[] | null | undefined,
): string {
  return (errors ?? [])
    .map((error) => `${error.instancePath || "/"} ${error.message ?? "invalid"}`)
    .join("\n");
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(readJson(join(SCHEMA_DIR, "defs.schema.json")));
ajv.addSchema(readJson(join(SCHEMA_DIR, "effect.schema.json")));

const validateCard = ajv.compile(readJson(join(SCHEMA_DIR, "card.schema.json")));
const validateCreature = ajv.compile(readJson(join(SCHEMA_DIR, "creature.schema.json")));
const validateFace = ajv.compile(readJson(join(SCHEMA_DIR, "face.schema.json")));
const validateLoadout = ajv.compile(readJson(join(SCHEMA_DIR, "loadout.schema.json")));

describe("catalogue JSON schemas", () => {
  it.each(jsonFiles(join(CONTENT_DIR, "cards")))("%s matches card.schema.json", (path) => {
    expect(validateCard(readJson(path)), formatErrors(validateCard.errors)).toBe(true);
  });

  it.each(jsonFiles(join(CONTENT_DIR, "creatures")))("%s matches creature.schema.json", (path) => {
    expect(validateCreature(readJson(path)), formatErrors(validateCreature.errors)).toBe(true);
  });

  it.each(jsonFiles(join(CONTENT_DIR, "faces")))("%s matches face.schema.json", (path) => {
    expect(validateFace(readJson(path)), formatErrors(validateFace.errors)).toBe(true);
  });

  it.each(jsonFiles(join(CONTENT_DIR, "loadouts")))("%s matches loadout.schema.json", (path) => {
    expect(validateLoadout(readJson(path)), formatErrors(validateLoadout.errors)).toBe(true);
  });

  it("rejects a ritual without a ritual region", () => {
    expect(
      validateCard({
        id: "card-example",
        name: "Example",
        type: "ritual",
        subtypes: ["continuous"],
        attribute: "arcane",
        forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
        rulesText: "[Draw 1].",
      }),
    ).toBe(false);
  });

  it("rejects equipment missing mayTargetOpponent", () => {
    expect(
      validateCard({
        id: "card-example",
        name: "Example",
        type: "equipment",
        subtypes: [],
        attribute: "martial",
        forge: { faces: 1, kind: "natural", attribute: "martial", target: "own-die" },
        rulesText: "[Empower 1].",
        equipment: { abilities: [] },
      }),
    ).toBe(false);
  });

  it("rejects an unknown effect type", () => {
    expect(
      validateCard({
        id: "card-example",
        name: "Example",
        type: "instant",
        subtypes: [],
        attribute: "arcane",
        forge: { faces: 1, kind: "synthetic", attribute: "arcane", target: "own-die" },
        rulesText: "Do a new verb.",
        effect: { effects: [{ type: "envenom", amount: 1 }] },
      }),
    ).toBe(false);
  });

  it("rejects heal without a target", () => {
    expect(
      validateCard({
        id: "card-example",
        name: "Example",
        type: "instant",
        subtypes: [],
        attribute: "luminar",
        forge: { faces: 1, kind: "natural", attribute: "luminar", target: "own-die" },
        rulesText: "[Heal 2].",
        effect: { effects: [{ type: "heal", amount: 2 }] },
      }),
    ).toBe(false);
  });

  it("rejects Shield bonusPips", () => {
    expect(
      validateFace({
        id: "face-untyped-shield",
        name: "Shield",
        kind: "untyped",
        symbol: "shield",
        rulesText: "",
        onRoll: [],
        onAbsorb: [],
        maxOverloads: 1,
        forgeRestriction: null,
        bonusPips: { symbol: "luminar", amount: 1 },
      }),
    ).toBe(false);
  });

  it("rejects an untyped face that is not Shield", () => {
    expect(
      validateFace({
        id: "face-untyped-star",
        name: "Star",
        kind: "untyped",
        symbol: "arcane",
        rulesText: "",
        onRoll: [],
        onAbsorb: [],
        maxOverloads: 1,
        forgeRestriction: null,
      }),
    ).toBe(false);
  });

  it("accepts damage targeting every living enemy", () => {
    expect(
      validateCard({
        id: "card-example",
        name: "Example",
        type: "instant",
        subtypes: [],
        attribute: "darkness",
        forge: { faces: 1, kind: "natural", attribute: "darkness", target: "own-die" },
        rulesText: "[Strike 1] each enemy.",
        effect: {
          effects: [{ type: "damage", amount: 1, target: { kind: "enemy-all" } }],
        },
      }),
    ).toBe(true);
  });

  it("accepts AST mark with a token", () => {
    expect(
      validateCard({
        id: "card-example",
        name: "Example",
        type: "instant",
        subtypes: [],
        attribute: "toxin",
        forge: { faces: 1, kind: "natural", attribute: "toxin", target: "own-die" },
        rulesText: "[Mark 1 Toxin].",
        effect: {
          effects: [
            {
              op: "mark",
              token: "toxin",
              amount: { kind: "literal", value: 1 },
              target: { kind: "choose-enemy" },
            },
          ],
        },
      }),
    ).toBe(true);
  });
});
