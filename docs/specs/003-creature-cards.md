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

| Creature | Attr | HP | Basic | Special |
|---|---|---|---|---|
| War Minotaur | Martial | 13 | Heavy Axe (Martial) 3 dmg | Poisoned Charge (Martial+Toxin) 4 dmg + toxin / swap |
| Varcolac | Wild | 9 | Charge (Wild) 2 dmg | Coordinated Hunt (Wild+Martial) 4 dmg / push |
| Garuda | Wild | 7 | Dive (Wild, Range) 2 dmg / swap | Bombardment (Wild+Toxin) 3 dmg + frontline toxin |
| Archmage of the Runes | Arcane | 8 | Arcane Burst (Arcane) 2 dmg + draw | Mystic Overload (Arcane+Luminar) 3 dmg + shields |
| Corrupting Elder | Arcane | 10 | Touch of Decay (Arcane) 2 dmg / strip shield | Contamination (Arcane+Corruption) 4 dmg / forge |
| Void Summoner | Arcane | 9 | Rupture (Arcane) 2 dmg / convert | Dimensional Rift (Arcane+Darkness) 3 dmg / retain |

A separate Fast game test section in Figma adjusts some HP and costs; it is not
encoded yet.

## What this slice implements

| In | Out (deferred) |
|---|---|
| Six Figma creatures as content + English `CreatureCard` UI | Passives, riders, Fast-game variants — see DEFERRED_CATALOGUE |
| Basic/Special costs and primary damage effects | |

The vertical-slice engine-demo squad (Warden / Lumin Adept / Rune Binder) has
been removed; hotseat and scenario matches use the Figma Aggro or Control
trios. Absorb ↔ resolve coverage lives on thin engine abilities on the Aggro
squad until print defines them.

Run `npm run dev` to see the catalogue.
