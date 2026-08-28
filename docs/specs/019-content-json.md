# 019 — Catalogue and loadout JSON

Status: **DONE** (2026-08-28)

Move tactic, creature, and face definitions — and each builtin loadout — out
of TypeScript megamodules into JSON documents. Engine loads them as data.

Related: [`002-card-layer.md`](./002-card-layer.md),
[`003-creature-cards.md`](./003-creature-cards.md),
[`004-face-cards.md`](./004-face-cards.md),
[`006-deck-persistence.md`](./006-deck-persistence.md),
[`018-ast-engine.md`](./018-ast-engine.md).

## Intent

One file per card / creature / face so agents pay tokens only for the entity
they edit. One file per builtin deck so a loadout is not split across
`cards.ts` / `creatures.ts` / `faces.ts` / `prototype.ts`.

Play, ids, costs, and print do not change.

## Rules

### Per-entity catalogues

```text
src/server/content/cards/<card-id>.json
src/server/content/creatures/<creature-id>.json
src/server/content/faces/<face-id>.json
src/server/content/schema/card.schema.json
src/server/content/schema/creature.schema.json
src/server/content/schema/face.schema.json
src/server/content/schema/loadout.schema.json
```

Each document may include `"$schema"` pointing at the matching schema file
(relative) for editor validation.

`src/server/content/catalogues.ts` eager-loads JSON (`import.meta.glob`) and
exposes `getCard`, `ALL_CARDS`, `getCreatureDefinition`, `ALL_CREATURES`,
`getFaceCard`, `ALL_FACE_CARDS`, plus stable id constants used by tests
(`WAR_AXE`, `MINOTAUR`, `CRUSH`, …) derived from `id` fields.

Effects in JSON are either:

- **AST** (`op` nodes per `018`), or
- **legacy** (`type` members) compiled at load via `AstCompiler.compileLegacy`.

Both are valid during migration. Prefer AST for newly edited cards.

`rulesText` / `passiveRulesText` / attack `rulesText` remain English print
authority. Structured fields are engine authority. Incomplete clauses stay
out of structured fields and listed in [`DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md).

Print formatters (`cardText.ts`, `creatureText.ts`) stay TypeScript and read
loaded definitions. They are not rules.

Id constants: `card-*`, `creature-*`, `face-*` kebab prefixes unchanged.

### Builtin loadouts (one file each)

```text
src/server/content/loadouts/aggro.json
src/server/content/loadouts/control.json
src/server/content/loadouts/tempo.json
src/server/content/loadouts/combo-mechanical.json
src/server/content/loadouts/burn.json
```

Each file contains:

| Field | Meaning |
|---|---|
| `id` | Saved id (`deck-prototype` for Aggro — stable) |
| `name` | Display name |
| `squad` | Three creature definition ids, deployment order |
| `deckCounts` | `{ cardId, copies }[]` expanded to a 40–50 card list |
| `faceDeck` | Face card ids (specials; naturals/Shield do not consume the 12) |
| `startingDice` | Two arrays of six face ids (already expanded naturals + Shield) |

No tactics/squad/face-deck lists remain in catalogue modules.

Client `src/client/decks/builtins.ts` maps a loadout document → `SavedDeck`
(`builtin: true`, `schemaVersion`, epoch `updatedAt`). Repos still call
`withBuiltinDecks`.

Aggro code names use `AGGRO_*`. Persisted id stays `deck-prototype`.
Deprecated alias `buildPrototypeSavedDeck` may remain one release.

### Loader purity

JSON is bundled (Vite/Vitest), not fetched. No `fs` / `fetch` inside
`src/server` at runtime. `import.meta.glob` is allowed.

## State Changes

None.

## Actions

None.

## Validation

- JSON matches schema; unknown ids in loadouts fail `validateLoadout`.
- Attachment type ↔ region lockstep (existing consistency tests).
- Loadout sizes 40–50, ≤3 copies, known ids.

## Resolution

`createMatch` / tests import lists from `@server` (`AGGRO_DECK`,
`AGGRO_SQUAD`, `AGGRO_FACE_DECK`, `AGGRO_STARTING_DICE`, …) which read
loadout JSON. `PROTOTYPE_*` aliases may point at Aggro for old tests.

## Networking

`WireLoadout` still carries expanded `squad` / `deck` / `faceDeck` /
`startingDice` arrays, not JSON files.

## Persistence

User decks unchanged (`006`). Builtins are not written to localStorage
(existing strip-on-read).

## UI

Deck builder / lobby still list builtins via `buildBuiltinDecks()`.
Catalogues iterate `ALL_*`.

## Acceptance Criteria

- [ ] No deck lists in card/creature/face definition files.
- [ ] Five loadout JSON files; each deck fully specified in that file.
- [ ] Per-entity JSON for every catalogue card, creature, and face.
- [ ] Megamodules `cards.ts` / `creatures.ts` / `faces.ts` definition arrays
      are gone (loaders + id re-exports only).
- [ ] Existing loadout and content tests pass.

## Tests

- [ ] `loadout.test.ts` — all five builtins legal.
- [ ] `cards.consistency.test.ts` — type/region lockstep on loaded JSON.
- [ ] Builtin assembly: Aggro id `deck-prototype`, 43/43/45 counts unchanged.
