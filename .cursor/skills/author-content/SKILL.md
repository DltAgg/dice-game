---
name: author-content
description: >-
  Author tactic, creature, and face-card catalogue entries as typed data in
  src/game/content. Use when adding or updating cards from print text, Figma,
  bible tables, CSV (Card text, Energy cost, Card name), or when the user
  mentions catalogue, forge regions, overloads, rituals, equipment, or deferred
  effects.
---

# Author game content

Hand-author TypeScript definitions. There is **no** CSV/OCR ingest pipeline —
treat spreadsheets as worksheets, then write catalogue entries.

## Choose the catalogue

| Content | File | Spec |
|---|---|---|
| Tactic (hand) cards | `src/game/content/cards.ts` | `docs/specs/002-card-layer.md` |
| Creatures | `src/game/content/creatures.ts` | `docs/specs/003-creature-cards.md` |
| Face cards (dice) | `src/game/content/faces.ts` | `docs/specs/004-face-cards.md` |

Types: `src/game/model/cards.ts`, `creatures.ts`, `dice.ts`, `effects.ts`.

## Hard rule

Set structured engine regions **only** when every printed clause is modelled.
Otherwise keep accurate English `rulesText` / `passiveRulesText` and park gaps in
`docs/DEFERRED_CATALOGUE.md`. Do not approximate silently.

## Workflow

1. Identify content kind (tactic / creature / face).
2. Align names and attributes with English specs (`002`/`003`/`004`).
3. Check existing `EffectDefinition` / attack / `onRoll` coverage.
4. Add id + definition to the right catalogue file.
5. If new vocabulary is required → use [develop-engine](../develop-engine/SKILL.md) in the same change.
6. Update deferred catalogue / spec tables as needed.
7. Run DoD from [`TOOLS.md`](../../../TOOLS.md).

## Progressive references

- Tactics (incl. CSV): [tactics.md](tactics.md)
- Creatures: [creatures.md](creatures.md)
- Faces / dice: [faces.md](faces.md)
- CSV column order for tactics: [csv-tactics.md](csv-tactics.md)

## Id conventions

| Kind | Pattern | Example |
|---|---|---|
| Tactic | `card-<kebab>` | `card-eternal-darkness` |
| Creature | `creature-<kebab>` | `creature-minotaur` |
| Natural face | `face-natural-<attr\|shield>` | `face-natural-arcane` |
| Synthetic / named | `face-synthetic-<kebab>` | `face-synthetic-crush` |
| Attack | `attack-<creature>-<kebab>` | `attack-minotaur-heavy-axe` |
| Ability | `ability-<creature>-<kebab>` | `ability-warden-ward` |

Const exports: `SCREAMING_SNAKE`. Attributes: `martial`, `wild`, `toxin`, `arcane`, `luminar`, `mechanical`, `corruption`, `darkness`.
