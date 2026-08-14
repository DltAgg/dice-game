# 004 — Face cards and the face deck

Status: **IMPLEMENTED DEPTH** — catalogue + face-deck ledger; On roll / On absorb
wired where modellable (`011`). Remaining: push (Impact roll), empty print
(Great Spark / Rekindle), face-marker systems — [`DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md).

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
| Arcane Echo | 0 | On roll: re-fire other die onRoll (+ overloads) | Not a full face overlay |
| Blade Rain | 3 | On roll: arm next-attack split | `split-damage` pending |
| Rending Claw | 3 | On roll: remove 3 Shields from most-shielded enemy | |
| Crush | 3 | On roll: next attack +1 damage | |
| Forbidden Heritage | 1 | On roll: opp draw + retain; `ACTIVATE_FACE` strip Corruption | |
| Pestilent Plague | 2 | On roll: counters → adjacent forge at 5; `ACTIVATE_FACE` | |
| Insight Rune | 2 | On roll: draw; On absorb: look top 2 | |
| Conversion Rune | 2 | On roll: convert; On absorb: +Energy | |
| Resonance Rune | 2 | On roll: conditional Energy; On absorb: requirement wildcard | |
| Vital Spark | 2 | On roll: heal; On absorb: prevent 1 | |
| Aegis | 2 | On roll: generate Shield; On absorb: redirect | |
| Revelation | 2 | On roll: peek/bottom; On absorb: heal if damage >½ life | |
| Instinct | 2 | On roll: optional ally reposition | Absorb extra basic ASSUMED no-op |
| Primordial Fury | 2 | On roll: Energy if ally attacked; On absorb: next attack +1 | |
| Pack | 2 | On roll: adjacent → Wild; On absorb: optional reposition | |
| Command | 2 | On roll: ally move; On absorb: enemy move | |
| Impact | 2 | On absorb: next attack +2 | On roll **push** deferred |
| Formation | 2 | On roll: Energy if controller has FL; On absorb: prevent on other FL | |
| Venom | 2 | On roll: apply toxin; On absorb: next incoming +1 | |
| Spores | 2 | On roll: extra toxin if already toxined; On absorb: heal toxined ally | |
| Adaptive Toxin | 2 | Print only | Cap / strip→damage — face-marker deferred |
| Stain | 2 | Print only | Face-marker deferred |
| Infection | 2 | On absorb: opp loses Energy | On roll spread — deferred |
| Decay | 2 | Print only | Face-marker deferred |
| Gear | 2 | On roll: Energy if other Synthetic; On absorb: forge −1 | |
| Catalyst | 2 | Print only | Treat-as / copy face — deferred |
| Overcharge | 2 | Print only | Optional Energy + skip / double — deferred |
| Flywheel | 2 | On roll: +Energy; On absorb: generate Shield | |
| Piston | 2 | On roll: generate Mechanical; On absorb: +Energy | |
| Shadow Echo | 2 | On roll: optional discard→draw; On absorb: GY ≤2 | |
| Drain | 2 | On roll: opp loses Energy; On absorb: transfer | |
| Sacrifice | 2 | On roll: discard→2 Energy; On absorb: discard→2 damage | |
| Warhorn | 2 | On roll: generate Martial; On absorb: next attack +1 | |
| Cleaving Strike | 2 | On roll: remove 2 Shield; On absorb: next attack +1 | |
| Bloodscent | 2 | On roll: next attack +1; On absorb: generate Wild | |
| Gore | 2 | On roll: 1 damage; On absorb: next attack +1 | |
| Needle | 2 | On roll: next attack +1; On absorb: apply toxin | |
| Seep | 2 | On roll: generate Toxin; On absorb: arm attack-toxin 1 | |

Great Spark and Rekindle appear as art on the page but have no printed rules text yet.
Empty hook arrays stay where clauses are deferred (`DEFERRED_CATALOGUE.md`).
Portuguese *Sobrecarga* is catalogued as **Overcharge**.

## State Changes

`players[*].facePool`, `attackBonusThisTurn` (Crush), `DieSlot.pestilenceCounters`,
`FaceCardDefinition.activated`, turn maps in `011`.

## Actions

`FORGE_CARD` respects face forge restrictions. `ACTIVATE_FACE` for Heritage /
Plague (spec `012`).

## Acceptance Criteria

- [x] Face definitions match Figma names and printed English rules
- [x] Correct overload capacities
- [x] Echo forge restriction
- [x] Crush and Rending Claw on-roll effects
- [x] Modellable CSV / named special On roll / On absorb wired (`011`)
- [ ] Face-marker systems (Adaptive Toxin, Stain, Decay, Catalyst, Overcharge, Infection roll)

## Tests

- [x] `src/game/reducer/faceDeck.test.ts`
- [x] Existing forge / invariant / triggers suites
- [x] Spec `011` focused suites
