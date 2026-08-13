# 004 — Face cards and the face deck

Status: **DEFERRED DEPTH** — catalogue + face-deck ledger; Crush / Rending Claw
playable on roll; several CSV faces partially wired (see table). Remaining
specials in [`docs/DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md).

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

Identity faces on the starting die. Footer `+1 Attribute`. Overload capacity 1.
No inherent effect.

**Dual-kind attributes** (natural + synthetic allowed): Martial, Wild, Arcane,
Luminar, plus Shield (`+1 Shield`).

**Synthetic-only attributes** (no natural faces / natural forges): Toxin,
Mechanical, Corruption, Darkness. Enforced by `DUAL_KIND_ATTRIBUTES` /
`SYNTHETIC_ONLY_ATTRIBUTES` in `src/game/model/attributes.ts`, face-deck
validation, forge eligibility, and catalogue consistency tests.

### Specials (Synthetic)

Effectful forge-target generics (same `face-synthetic-<attr>` ids as the old
blank “Forged …” cards for Arcane / Toxin / Mechanical / Corruption / Darkness):

| Name | On roll (wired) |
|---|---|
| Synthetic Arcane | Draw 1 |
| Synthetic Toxin | Arm attack-toxin 1 |
| Synthetic Mechanical | Generate 1 Shield |
| Synthetic Corruption | Next attack +1 damage |
| Synthetic Darkness | Gain 1 Energy |

Named specials:

| Name | Overloads | Playable today | Notes |
|---|---|---|---|
| Arcane Echo | 0 | Forge restriction only | Copy other die — OPEN |
| Blade Rain | 3 | Print only | Split next attack — OPEN |
| Rending Claw | 3 | On roll: remove 3 Shields from most-shielded enemy | |
| Crush | 3 | On roll: next attack +1 damage | |
| Forbidden Heritage | 1 | Print only | Opponent draw, Retain, activated remove — OPEN |
| Pestilent Plague | 2 | Print only | Pestilence counters + adjacent forge — OPEN |
| Insight Rune | 2 | On roll: draw | Absorb dig — OPEN |
| Conversion Rune | 2 | On absorb: +Energy | Roll convert — OPEN |
| Resonance Rune | 2 | Print only | Conditional Energy + treat-as — OPEN |
| Vital Spark | 2 | On roll: heal; On absorb: prevent 1 | |
| Aegis | 2 | On roll: generate Shield | Absorb redirect — OPEN |
| Revelation | 2 | Print only | Deck peek + conditional heal — OPEN |
| Instinct | 2 | Print only | Reposition + bonus basic — OPEN |
| Primordial Fury | 2 | On absorb: next attack +1 | Roll conditional Energy — OPEN |
| Pack | 2 | Print only | Adjacent Wild + reposition — OPEN |
| Command | 2 | Print only | Ally / enemy move — OPEN |
| Impact | 2 | On absorb: next attack +2 | Roll push — OPEN |
| Formation | 2 | Print only | Frontline Energy / Defense — OPEN |
| Venom | 2 | On roll: apply toxin (choose enemy) | Absorb next-hit — OPEN |
| Spores | 2 | Print only | Conditional toxin + heal toxined ally — OPEN |
| Adaptive Toxin | 2 | Print only | Cap toxin / remove→damage — OPEN |
| Stain | 2 | Print only | Corruption markers on faces — OPEN |
| Infection | 2 | Print only | Spread Corruption / steal Energy — OPEN |
| Decay | 2 | Print only | Suppress inherent / strip Corrupted — OPEN |
| Gear | 2 | Print only | Synthetic Energy / forge discount — OPEN |
| Catalyst | 2 | Print only | Treat-as / copy face effect — OPEN |
| Overcharge | 2 | Print only | Optional Energy + skip next / double resolve — OPEN |
| Shadow Echo | 2 | Print only | Discard-draw / GY recursion — OPEN |
| Drain | 2 | Print only | Opp loses Energy / transfer — OPEN |
| Sacrifice | 2 | Print only | Discard for Energy / discard for damage — OPEN |

Great Spark and Rekindle appear as art on the page but have no printed rules text yet.
The CSV batch (`synthetic_faces.csv`) uses **On roll** / **On absorb** clauses;
`FaceCardDefinition.onAbsorb` is wired for modellable clauses only — remaining
print stays accurate with empty hook arrays (see `DEFERRED_CATALOGUE.md`). Portuguese *Sobrecarga* is
catalogued as **Overcharge** to avoid colliding with the Overload tactic subtype.

## State Changes

`players[*].facePool`, `attackBonusThisTurn` (Crush).

## Actions

No new actions. `FORGE_CARD` respects face forge restrictions.

## Acceptance Criteria

- [x] Face definitions match Figma names and printed English rules
- [x] Correct overload capacities
- [x] Echo forge restriction
- [x] Crush and Rending Claw on-roll effects
- [ ] Remaining special clauses (Echo copy, Blade Rain split, Heritage, Plague, CSV Roll/Absorb faces)

## Tests

- [x] `src/game/reducer/faceDeck.test.ts`
- [x] Existing forge / invariant suites
