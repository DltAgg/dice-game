# 004 — Face cards and the face deck

Status: **IMPLEMENTED DEPTH** — catalogue + face-deck ledger; On roll / On absorb
wired where modellable (`011`–`013`). Remaining: empty print (Great Spark /
Rekindle) — [`DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md).

Derived from the `Face card` page of the `Card layouts` Figma file
(`0t97sC2tBFYx2Nhe6zeRw7`, node `2:13`).

## Intent

Players bring a **face deck** separate from their tactics deck, plus
**constructed opening dice** (`startingDice` on the loadout). Face cards are
the definitions that back die faces. Forging installs a face from the owner's
**leftover** face pool (or copies one already installed). When the last copy
leaves the dice, the card returns to its owner.

The 12-card face deck is the mid-game option pool (and the ledger for opening
specials). Opening slots may use **basics** (all-attribute naturals + Shield)
without listing them in the 12. Named specials on opening slots must be ids in
`faceDeck` and start installed (XOR). Naturals **may** be packed in the 12 for
density swaps; they then count toward the 12 and the 3-per-attribute cap.
There are no blank/generic attribute synthetics (`face-synthetic-<attr>`). A
forge of “synthetic Corruption” names a Corruption special from the leftover
pool.

## Rules

| Rule | Source |
|---|---|
| Face deck holds up to 12 cards | bible §12 |
| At most 3 face cards of the same attribute | bible §12 |
| Opening basics (naturals + Shield) that are not listed in `faceDeck` do not count toward the 12 | bible §12 + constructed start |
| Named specials on `startingDice` consume `faceDeck` rows and start installed, not pooled | constructed start / XOR ledger |
| Leftover `faceDeck` ids form `facePool` at `createMatch` | constructed start |
| Arcane Echo, Forbidden Heritage, Pestilent Plague refused on `startingDice` (legal in pool; print: “Cannot be included on opening dice.”) | OPEN_DESIGN default refuse |
| A face card is in the pool XOR installed — never both | bible §12 |
| Ownership is independent of which die the face sits on | bible §12 |
| Forging may copy an already-installed face, or take one from the pool | bible §13 |
| Every forged face originates from the owner's face deck / pool | bible §12 |
| Arcane Echo may only be forged by Echo-tagged tactics | Face card printing |

## Catalogue (English)

### Basics (Natural)

Identity faces available as **opening basics** (and optionally pooled for
density swaps). Footer `+1 Attribute`. Overload capacity 1. No inherent effect.

**Dual-kind attributes** (natural + synthetic allowed): all eight — Martial,
Wild, Toxin, Arcane, Luminar, Mechanical, Corruption, Darkness. Natural
identity faces exist for each (`face-natural-<attr>`, overload capacity 1, no
inherent effect). Synthetic installs are still **named specials**, not blank
`face-synthetic-<attr>` generics.

### Basics (Untyped)

**Shield** (`+1 Shield`, `kind: "untyped"`, id `face-untyped-shield`). Opening
basic (setup only — still not forgeable mid-game). No inherent effect, overload
capacity 1. Shield is not an attribute and is not Natural — `On absorb Natural`
(Void Summoner) does not fire when a Shield is absorbed. `startingMinShieldsPerDie`
(ASSUMED, default 1) applies to constructed layouts.

### Specials (Synthetic) — current catalogue

> **Catalogue reset (2026-08-29).** `src/server/content/faces/` holds eight
> identity `face-natural-*`, `face-untyped-shield`, the twelve named synthetics
> below, and the named naturals listed after them. Any special named later in
> this spec is **retired print with no catalogue entry** — design reference only.

Twelve synthetics — three per archetype attribute (Mechanical, Luminar, Arcane,
Darkness) so a 12-card face deck can run either pair inside the 3-per-attribute
cap. All `maxOverloads: 2`, no forge restriction. Every `On absorb` line prints
`once per turn` (`onAbsorbPrintPolicy.test.ts`).

**Tempo (Mechanical + Luminar)**

| Id | Name | Symbol | On roll | On absorb |
|---|---|---|---|---|
| `face-synthetic-cogtooth` | Cogtooth | Mechanical | `[Generate 1 Mechanical]` | `[Discount 1]` forge |
| `face-synthetic-gear-train` | Gear Train | Mechanical | If you have another Synthetic symbol in the Pool, `[Generate 1 Mechanical]` | `[Double]` |
| `face-synthetic-mainspring` | Mainspring | Mechanical | `[Empower 1]` | `[Reforge]` a Synthetic Mechanical face on your die |
| `face-synthetic-halo-lamp` | Halo Lamp | Luminar | `[Generate 1 Shield]` | `[Mark 2 Shield]` on an allied creature |
| `face-synthetic-lucent-choir` | Lucent Choir | Luminar | `[Generate 1 Luminar]` | `[Empower 1]` on an allied creature |
| `face-synthetic-sunward-lens` | Sunward Lens | Luminar | `[Heal 1]` on your most damaged creature | `[Generate 1 Mechanical]` |

**Control (Arcane + Darkness)**

| Id | Name | Symbol | On roll | On absorb |
|---|---|---|---|---|
| `face-synthetic-augur-glass` | Augur Glass | Arcane | `[Generate 1 Arcane]` | `[Insight 2]` |
| `face-synthetic-sigil-flare` | Sigil Flare | Arcane | `[Strike 1]` | `[Draw 1]` |
| `face-synthetic-ward-lattice` | Ward Lattice | Arcane | `[Insight 1]` | `[Mark 1 Shield]` on an allied creature you choose |
| `face-synthetic-gloomwell` | Gloomwell | Darkness | `[Generate 1 Arcane]` | your opponent `[Mill 2]` |
| `face-synthetic-ossuary` | Ossuary | Darkness | your opponent `[Mill 1]` | `[Recall 1]` that costs 2 or less |
| `face-synthetic-pyre-of-names` | Pyre of Names | Darkness | you may `[Discard 1]`; if you do, `[Strike 2]` | `[Generate 1 Darkness]` |

**Dual-pip faces.** A face carries one inherent `symbol`, so a face that pays
in two colours shows its own pip and **generates the partner** on roll.
Gloomwell is the Synthetic version of that slot: it shows Darkness and pays
`[Generate 1 Arcane]`, which is exactly what Control's two-colour gates
(Graven Summons, Nightmarrow Pact, Lightless Verdict) are short of. It is
deliberately **not** another Generate-same face — Cogtooth, Lucent Choir, and
Augur Glass already hold that cycle.

### Named naturals — current catalogue

A Natural face may also be a **named special** with printed rules text. It is
packed from the face deck like any synthetic; it is not one of the eight
opening identity basics, so it must never appear in `BASIC_FACE_CARDS`
(`faceKindPolicy.test.ts`).

| Id | Name | Symbol | On roll | On absorb |
|---|---|---|---|---|
| `face-natural-dawnwright` | Dawnwright | Mechanical | `[Generate 1 Luminar]` | — |

Dawnwright is the Natural half of the dual-pip slot and Tempo's mirror of
Gloomwell: a Mechanical face that funds the Luminar half of Mending Light,
Beacon Array, and the Radiant Accord gate. Being Natural also matters
mechanically — Pawl Spring's natural forge installs it, and Pawl Spring and
Idler Gear can then overload it, so one face is both the payout and the mount.
Overload capacity stays at the Natural 1.

Both halves of every face are live, which is the absorb-vs-pool decision Tempo
is built on: roll for pool pressure, or absorb to bank and rebuild. Control
faces make the same trade on a slower axis — Sigil Flare and Pyre of Names are
the face-sourced damage Control needs to threaten the enemy legendary, and
Ossuary turns the mill plan back into cards. No `[Prevent]` appears on any
face — that stays reaction-exclusive.

**Authoring:** only **named specials**. Never add blank/generic identity
synthetics (`face-synthetic-martial`, `face-synthetic-corruption`, Forged
Martial, Synthetic Corruption, …).

Every attribute may also be forged as a synthetic; those installs are always
named specials from the owner's pool (Venom, Gear, Canker, Drain, Warhorn,
Pack, Insight Rune, …). Enforced by `DUAL_KIND_ATTRIBUTES` (= all attributes)
and an empty `SYNTHETIC_ONLY_ATTRIBUTES` in `src/server/model/attributes.ts`,
plus face-deck validation, forge eligibility, and catalogue consistency tests.
There is no identity-only `face-synthetic-<attr>` card.

Named specials:

| Name | Overloads | Playable today | Notes |
|---|---|---|---|
| Arcane Echo | 0 | Echo-card forge only; cannot open; Mechanical; On roll: re-fire other die onRoll (+ overloads) | Not a full face overlay |
| Blade Rain | 3 | On roll: arm next-attack split | `split-damage` pending |
| Rending Claw | 3 | On roll: remove 3 Shields from most-shielded enemy | |
| Crush | 3 | On roll: next attack +1 damage | |
| Forbidden Heritage | 1 | Cannot open; On roll: opp draw + retain; cannot-replace-by-forge; `ACTIVATE_FACE` peel ([Spend] Corruption scaling) | |
| Pestilent Plague | 2 | Cannot open; On roll: counters → adjacent forge at 2; 4-turn forge-lock (die owner); `ACTIVATE_FACE` ([Spend] Corruption scaling) | |
| Insight Rune | 2 | On roll: draw; On absorb: look top 2 | |
| Conversion Rune | 2 | On roll: convert; On absorb: generate Corruption | |
| Resonance Rune | 2 | On roll: conditional generate Arcane; On absorb: requirement wildcard | |
| Vital Spark | 2 | On roll: heal; On absorb: [Mark 1 Shield] on choose-ally | Spec `016` pile bank |
| Aegis | 2 | On roll: generate Shield; On absorb: redirect on choose-ally | Spec `016` |
| Revelation | 2 | On roll: generate Luminar; On absorb: heal if damage >½ life | |
| Instinct | 2 | On roll: ally Empower 1; On absorb: ally Empower 2 | Catalogue |
| Primordial Fury | 2 | On roll: generate Luminar if ally attacked; On absorb: next attack +1 | Spec `016` |
| Pack | 2 | On roll: adjacent → Wild; On absorb: other ally next-attack +1 | |
| Pack Share | 2 | On absorb: Generate 1 Wild | Spec `016` |
| Command | 2 | On roll: ally reposition; On absorb: remove 1 Shield (most-shielded enemy) | |
| Impact | 2 | On roll: next attack +1; On absorb: next attack +2 | Spec `016` |
| Formation | 2 | On roll: generate Wild if controller has FL; On absorb: 1 Shield on another allied FL | Spec `016` |
| Venom | 2 | On roll: apply toxin; On absorb: next incoming +1 on choose-enemy | Spec `016` |
| Spores | 2 | On roll: extra toxin if already toxined; On absorb: heal toxined ally | |
| Adaptive Toxin | 2 | Cap toxin receive; [Strip 3 Toxin]. [Strike equal] | Spec `013` |
| Stain | 2 | Corruption marker; lock Corrupted as resource | Spec `013` |
| Infection | 2 | On roll: spread marker; On absorb: tax opp attribute pile (deferred) | Spec `013` |
| Decay | 2 | Suppress Natural inherent; strip → unusable Corruption | Spec `013` |
| Blight | 2 | On roll: generate Corruption; On absorb: you destroy 1 Ritual your opponent controls | Catalogue (not builtin Control) |
| Hexbrand | 2 | On roll: [Drain 1]; On absorb: destroy Equipment | Catalogue (not builtin Control); Spec `016` |
| Canker | 2 | On roll: Corruption marker; On absorb: forge 1 named synthetic Corruption special on opponent die | Catalogue (not builtin Control) |
| Gear | 2 | On roll: generate Corruption if other Synthetic; On absorb: forge −1 | |
| Catalyst | 2 | Synthetic pool wildcard; copy appeared synthetic onRoll | Spec `013` |
| Overcharge | 2 | Optional generate Mechanical + Overcharge suppress; next face effect twice | Spec `013` |
| Flywheel | 2 | On roll: generate Mechanical; On absorb: generate Shield | |
| Piston | 2 | On roll: generate Mechanical; On absorb: generate Mechanical | |
| Shadow Echo | 2 | On roll: optional discard→draw; On absorb: GY ≤2 | |
| Drain | 2 | On roll / absorb: attribute-pile tax / transfer (deferred) | |
| Sacrifice | 2 | On roll: discard→generate 2 Darkness; On absorb: discard→2 damage | |
| Nightwell | 2 | On roll: generate Darkness; On absorb: [Drain 1] | Control Darkness fuel; Spec `016` |
| Runeflare | 2 | On roll: 1 damage; On absorb: draw 1 | Control Arcane chip + filter |
| Warhorn | 2 | On roll: generate Martial; On absorb: next attack +1 | |
| Cleaving Strike | 2 | On roll: remove 2 Shield; On absorb: next attack +1 | |
| Bloodscent | 2 | On roll: next attack +1; On absorb: generate Wild | |
| Gore | 2 | On roll: 1 damage; On absorb: next attack +1 | |
| Needle | 2 | On roll: next attack +1; On absorb: apply toxin | |
| Seep | 2 | On roll: generate Toxin; On absorb: arm attack-toxin 1 | |
| Marrow Rot | 2 | On roll: apply toxin; On absorb: extra toxin on an enemy that already has Toxin | Burn own-die |
| Cinder | 2 | On roll: 1 damage to chosen enemy; On absorb: apply toxin | Burn own-die ticks |
| Wasting Brand | 2 | On roll / absorb: damage or toxin your most-damaged creature | Opponent-die burn spice (holder voice) |

Great Spark and Rekindle appear as art on the page but have no printed rules text yet.
Portuguese *Sobrecarga* is catalogued as **Overcharge**.

## Loadout

`startingDice`: two tuples of six `FaceCardId`s. Saved decks / PeerJS
`WireLoadout` carry the same field (`006`, `007`). Schema version 2; old saves
without layouts are refused.

### Builtin paint philosophy

Opening layouts should densify each list’s **engine colors**, not a shared
Martial/Wild/Arcane/Luminar paint:

| Builtin | Opening / face-deck engine colors |
|---|---|
| Aggro (`PROTOTYPE_*`) | **Martial + Wild only** — pressure specials (Crush, Warhorn, Cleaving Strike, Bloodscent, Gore, Pack Share). Max 6 faces under ≤3/attr. No Toxin. |
| Control | Arcane + Darkness (+ utility splash) |
| Tempo / Combo Mechanical | Mechanical + Luminar (+ Wild/Toxin splash) |
| Burn | Toxin + Corruption |

Aggro openings use `openingDieMartialWild` (special + Martial/Wild naturals +
Shield). Other builtins may still use the older four-color `openingDieWithSpecial`
helper until densified separately.

## State Changes

`players[*].facePool` is the uninstalled remainder of `faceDeck`. Also
`attackBonusThisTurn` (Crush), `DieSlot.pestilenceCounters`,
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
Engine query: `slotCannotBeReplacedByForge` from `src/server/rules/faces.ts`.

- [x] Remaining forge-lock on Pestilent Plague slots (`DieSlot.forgeLockRemaining`)
- [x] Cannot-replace cue (Heritage always; Plague while lock > 0)
- [x] Forge / forge-faces / Reforge omit locked slots; `ACTIVATE_FACE` peel stays

## Acceptance Criteria

- [x] Face definitions match Figma names and printed English rules
- [x] Correct overload capacities
- [x] Echo forge restriction
- [x] Crush and Rending Claw on-roll effects
- [x] Modellable CSV / named special On roll / On absorb wired (`011`–`013`)
- [x] Face-marker systems (Adaptive Toxin, Stain, Decay, Catalyst, Overcharge, Infection roll; Instinct absorb = Empower 2 choose-ally per `016`)
- [x] Spec `016`: On absorb = pile bank
- [x] Stay-on-slot (Heritage never-replace; Plague forge-lock + spread at 2)

## Tests

- [x] `src/server/reducer/faceDeck.test.ts`
- [x] `src/server/reducer/faceMarkers.test.ts`
- [x] Existing forge / invariant / triggers suites
- [x] Spec `011` / `012` / `013` focused suites
- [x] `src/server/reducer/stayOnSlot.test.ts`
