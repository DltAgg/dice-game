/**
 * One-shot dump of in-memory catalogues to per-entity JSON.
 * Run: npx vite-node scripts/dump-catalogues.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_CARDS } from "../src/server/content/cards.js";
import { ALL_CREATURES } from "../src/server/content/creatures.js";
import { ALL_FACE_CARDS } from "../src/server/content/faces.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const writeAll = (
  dir: string,
  items: readonly { readonly id: string }[],
  schema: string,
): void => {
  mkdirSync(dir, { recursive: true });
  for (const item of items) {
    const path = join(dir, `${item.id}.json`);
    writeFileSync(path, `${JSON.stringify({ $schema: schema, ...item }, null, 2)}\n`);
  }
  writeFileSync(join(dir, "_order.json"), `${JSON.stringify(items.map((item) => item.id), null, 2)}\n`);
  console.log(`wrote ${items.length} files to ${dir}`);
};

writeAll(join(root, "src/server/content/cards"), ALL_CARDS, "../schema/card.schema.json");
writeAll(join(root, "src/server/content/creatures"), ALL_CREATURES, "../schema/creature.schema.json");
writeAll(join(root, "src/server/content/faces"), ALL_FACE_CARDS, "../schema/face.schema.json");
