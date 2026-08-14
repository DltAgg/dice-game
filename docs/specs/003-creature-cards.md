# 003 — Creature cards

Status: **DEFERRED DEPTH** — Figma catalogue + English UI; unfinished passives /
attack riders parked in [`docs/DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md).

Derived from the `Creature card` page of the `Card layouts` Figma file
(`0t97sC2tBFYx2Nhe6zeRw7`, page `0:1`). The Slow game test section is the
authority for the six playable creature designs.

## Card grammar

```text
┌──────────────────────────────────────────┐
│  Creature Name              ⟨HP⟩  ⟨attr⟩ │   header
│                                          │
│                (art)                     │
│                                          │
│  ⟨passive⟩                               │   text box
│  ⟨attr icons⟩ Basic: …                   │
│  ⟨attr icons⟩ Special: …                 │
└──────────────────────────────────────────┘
```

| Field | Notes |
|---|---|
| Name | English translation of the Portuguese layout title |
| HP | Max life |
| Attribute | Primary attribute icon (header) |
| Passive | Standing text; most are not yet engine triggers |
| Basic Attack | Cost icons + name + effect |
| Special Attack | Cost icons + name + effect |

## Catalogue (Slow game test)

HP is a **uniform +4** over the original Figma Slow print (playtest 2026-08-14:
skirmishes ended before control could interact). Relative identity is unchanged
(Garuda still glassiest, Minotaur still tankiest). Control attacks were retuned
to 1 damage plus wired resource riders; those attacks now discard fuel on use.

| Creature | Attr | HP | Basic | Special |
|---|---|---|---|---|
| War Minotaur | Martial | 17 | Heavy Axe (req Martial 2; no discard) 3 dmg | Poisoned Charge (req Martial+Toxin; discard Martial 1) 4 dmg + toxin; if back row, swap with frontline ally |
| Varcolac | Wild | 13 | Charge (req Wild 1; discard Wild 1) 2 dmg | Coordinated Hunt (req Wild+Martial; discard Wild 1) 4 dmg + next attack +1 |
| Garuda | Wild | 11 | Dive (req Wild 1, Range; discard Wild 1) 2 dmg + may swap with frontline ally | Bombardment (req Wild+Toxin; discard Wild 1) 3 dmg + frontline toxin |
| Archmage of the Runes | Arcane | 12 | Arcane Burst (Arcane; discard Arcane 1) 1 dmg + draw | Mystic Overload (Arcane+Luminar; discard Arcane 1) 1 dmg + Energy + generate Arcane |
| Corrupting Elder | Arcane | 14 | Touch of Decay (Arcane; discard Arcane 1) 1 dmg + strip shield | Contamination (Arcane+Corruption; discard Corruption 1) 1 dmg + generate Corruption |
| Void Summoner | Arcane | 13 | Rupture (Arcane; discard Arcane 1) 1 dmg + generate Arcane | Dimensional Rift (Arcane+Darkness; discard Darkness 1) 1 dmg + Energy + draw |

A separate Fast game test section in Figma adjusts some HP and costs; it is not
encoded yet.

## What this slice implements

| In | Out (deferred) |
|---|---|
| Six Figma creatures as content + English `CreatureCard` UI | Aggro passives / Bombardment frontline toxin — see DEFERRED_CATALOGUE |
| Basic/Special costs, damage, and control resource riders (`on-attack`) | Archmage tactic-discount passive |

The vertical-slice engine-demo squad (Warden / Lumin Adept / Rune Binder) has
been removed; hotseat and scenario matches use the Figma Aggro or Control
trios.

Run `npm run dev` to see the catalogue.
