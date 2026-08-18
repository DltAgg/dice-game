# 004 — Face cards and the face deck

Status: **IMPLEMENTED DEPTH** — catalogue + face-deck ledger; On roll / On absorb
wired where modellable (`011`–`013`). Remaining: empty print (Great Spark /
Rekindle) — [`DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md).

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
| Starting natural / untyped faces are separate from the 12-card limit | bible §12 |
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
Luminar.

### Basics (Untyped)

**Shield** (`+1 Shield`, `kind: "untyped"`, id `face-untyped-shield`). Starting-die
identity face: no inherent effect, overload capacity 1. Shield is not an attribute
and is not Natural — `On absorb Natural` (Void Summoner) does not fire when a
Shield is absorbed.

### Specials (Synthetic)

**Synthetic-only attributes** (no natural faces / natural forges): Toxin,
Mechanical, Corruption, Darkness. Enforced by `DUAL_KIND_ATTRIBUTES` /
`SYNTHETIC_ONLY_ATTRIBUTES` in `src/game/model/attributes.ts`, face-deck
validation, forge eligibility, and catalogue consistency tests.

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
| Forbidden Heritage | 1 | On roll: opp draw + retain; cannot-replace-by-forge; `ACTIVATE_FACE` peel | |
| Pestilent Plague | 2 | On roll: counters → adjacent forge at 2; 4-turn forge-lock (die owner); `ACTIVATE_FACE` | |
| Insight Rune | 2 | On roll: draw; On absorb: look top 2 | |
| Conversion Rune | 2 | On roll: convert; On absorb: +Energy | |
| Resonance Rune | 2 | On roll: conditional Energy; On absorb: requirement wildcard | |
| Vital Spark | 2 | On roll: heal; On absorb: prevent 1 | |
| Aegis | 2 | On roll: generate Shield; On absorb: redirect | |
| Revelation | 2 | On roll: peek/bottom; On absorb: heal if damage >½ life | |
| Instinct | 2 | On roll: optional ally reposition; On absorb: optional actions-window basic | Spec `013` |
| Primordial Fury | 2 | On roll: Energy if ally attacked; On absorb: next attack +1 | |
| Pack | 2 | On roll: adjacent → Wild; On absorb: optional reposition | |
| Command | 2 | On roll: ally reposition; On absorb: remove 1 Shield (most-shielded enemy) | |
| Impact | 2 | On roll: next attack +1; On absorb: next attack +2 | |
| Formation | 2 | On roll: Energy if controller has FL; On absorb: prevent on other FL | |
| Venom | 2 | On roll: apply toxin; On absorb: next incoming +1 | |
| Spores | 2 | On roll: extra toxin if already toxined; On absorb: heal toxined ally | |
| Adaptive Toxin | 2 | Cap toxin receive; strip markers → damage | Spec `013` |
| Stain | 2 | Corruption marker; lock Corrupted as resource | Spec `013` |
| Infection | 2 | On roll: spread marker; On absorb: opp loses Energy | Spec `013` |
| Decay | 2 | Suppress Natural inherent; strip → unusable Corruption | Spec `013` |
| Gear | 2 | On roll: Energy if other Synthetic; On absorb: forge −1 | |
| Catalyst | 2 | Synthetic pool wildcard; copy appeared synthetic onRoll | Spec `013` |
| Overcharge | 2 | Optional Energy + suppress; next face effect twice | Spec `013` |
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
Portuguese *Sobrecarga* is catalogued as **Overcharge**.

## State Changes

`players[*].facePool`, `attackBonusThisTurn` (Crush), `DieSlot.pestilenceCounters`,
`DieSlot.forgeLockRemaining`, `FaceCardDefinition.stayPolicy` / `pestilenceSpreadAt`,
`DieSlot.corruptionMarkers` / `suppressInherentNextRoll` / `resourceLockedThisTurn`,
`FaceCardDefinition.activated`, turn maps in `011`–`013`.

## Actions

`FORGE_CARD` / `forge-faces` / `replace-synthetic-face` refuse slots that
`slotCannotBeReplacedByForge` (Heritage always; Plague while `forgeLockRemaining > 0`).
`ACTIVATE_FACE` for Heritage / Plague peel (spec `012`) remains legal while locked.

## UI

Match-ui must show **remaining forge-lock** on Pestilent Plague slots and a
**cannot-replace** cue on Forbidden Heritage (and locked Plague) so players do
not target those slots for forge / Reforge. Do not hide `ACTIVATE_FACE` peel.
Engine query: `slotCannotBeReplacedByForge` from `src/game/rules/faces.ts`.

- [x] Remaining forge-lock on Pestilent Plague slots (`DieSlot.forgeLockRemaining`)
- [x] Cannot-replace cue (Heritage always; Plague while lock > 0)
- [x] Forge / forge-faces / Reforge omit locked slots; `ACTIVATE_FACE` peel stays

## Acceptance Criteria

- [x] Face definitions match Figma names and printed English rules
- [x] Correct overload capacities
- [x] Echo forge restriction
- [x] Crush and Rending Claw on-roll effects
- [x] Modellable CSV / named special On roll / On absorb wired (`011`–`013`)
- [x] Face-marker systems (Adaptive Toxin, Stain, Decay, Catalyst, Overcharge, Infection roll, Instinct absorb)
- [x] Stay-on-slot (Heritage never-replace; Plague forge-lock + spread at 2)

## Tests

- [x] `src/game/reducer/faceDeck.test.ts`
- [x] `src/game/reducer/faceMarkers.test.ts`
- [x] Existing forge / invariant / triggers suites
- [x] Spec `011` / `012` / `013` focused suites
- [x] `src/game/reducer/stayOnSlot.test.ts`
