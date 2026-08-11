# 004 — Face cards and the face deck

Status: **DEFERRED DEPTH** — catalogue + face-deck ledger; Crush / Rending Claw
playable. Remaining specials in [`docs/DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md).

Derived from the `Face card` page of the `Card layouts` Figma file
(`0t97sC2tBFYx2Nhe6zeRw7`, node `2:13`).

## Intent

Players bring a **face deck** separate from their tactics deck. Face cards are
the definitions that back die faces. Forging installs a face from the owner's
face pool (or copies one already installed). When the last copy leaves the
dice, the card returns to its owner.

## Rules

| Rule | Source |
|---|---|
| Face deck holds up to 12 cards | bible §12 |
| At most 3 face cards of the same attribute | bible §12 |
| Starting natural faces are separate from the 12-card limit | bible §12 |
| A face card is in the pool XOR installed — never both | bible §12 |
| Ownership is independent of which die the face sits on | bible §12 |
| Forging may copy an already-installed face, or take one from the pool | bible §13 |
| Every forged face originates from the owner's face deck / pool | bible §12 |
| Arcane Echo may only be forged by Echo-tagged tactics | Face card printing |

## Catalogue (English)

### Basics (Natural)

Identity faces. Footer `+1 Attribute`. Overload capacity 1. No inherent effect.

Arcane, Luminar, Wild, Martial, Toxin, Corruption, Mechanical, Darkness, plus
Shield (`+1 Shield`).

### Specials (Synthetic)

| Name | Overloads | Playable today | Notes |
|---|---|---|---|
| Arcane Echo | 0 | Forge restriction only | Copy other die — OPEN |
| Blade Rain | 3 | Print only | Split next attack — OPEN |
| Rending Claw | 3 | On roll: remove 3 Shields from most-shielded enemy | |
| Crush | 3 | On roll: next attack +1 damage | |
| Forbidden Heritage | 1 | Print only | Opponent draw, Retain, activated remove — OPEN |
| Pestilent Plague | 2 | Print only | Pestilence counters + adjacent forge — OPEN |

Great Spark and Rekindle appear as art on the page but have no printed rules text yet.

## State Changes

`players[*].facePool`, `attackBonusThisTurn` (Crush).

## Actions

No new actions. `FORGE_CARD` respects face forge restrictions.

## Acceptance Criteria

- [x] Face definitions match Figma names and printed English rules
- [x] Correct overload capacities
- [x] Echo forge restriction
- [x] Crush and Rending Claw on-roll effects
- [ ] Remaining special clauses (Echo copy, Blade Rain split, Heritage, Plague)

## Tests

- [x] `src/game/reducer/faceDeck.test.ts`
- [x] Existing forge / invariant suites
