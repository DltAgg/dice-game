# 003 — Creature cards

Status: **IMPLEMENTED DEPTH** — Figma catalogue + English UI; passives and
attack riders wired in `011`–`012` (Hunt push rewritten to next-attack bonus).
Mechanical / Luminar Tempo–Combo creatures authored (fully wired). Fast-game
HP/cost variants are not encoded.

Derived from the `Creature card` page of the `Card layouts` Figma file
(`0t97sC2tBFYx2Nhe6zeRw7`, page `0:1`). The Slow game test section is the
authority for the six playable Figma creature designs. Additional Mechanical /
Luminar entries support constructed Tempo and Combo Mechanical loadouts.

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
| Passive | Standing text + `standingAbilities` (`010` / `011`) |
| Basic Attack | Cost icons + name + `effect` + optional `followUpEffects` |
| Special Attack | Same |

## Catalogue (Slow game test)

HP is a **uniform +4** over the original Figma Slow print (playtest 2026-08-14:
skirmishes ended before control could interact). Relative identity is unchanged
(Garuda still glassiest, Minotaur still tankiest). Control attacks discard fuel
on use and keep resource riders; playtests found 1 damage too soft, so the
squad’s attacks are **2 damage** (still below Aggro beatstick numbers). Finishing
damage still belongs mainly on the Control card / ritual / face / status layer
(bible §27; OPEN_DESIGN 2026-08-20). Do not push these attacks to Aggro ceilings.

| Creature | Attr | HP | Basic | Special |
|---|---|---|---|---|
| War Minotaur | Martial | 17 | Heavy Axe (req Martial 2; no discard) 3 dmg | Poisoned Charge (req Martial+Toxin; discard Martial 1) 4 dmg + toxin / swap |
| Varcolac | Wild | 13 | Charge (req Wild 1; discard Wild 1) 2 dmg | Coordinated Hunt (req Wild+Martial; discard Wild 1) 4 dmg + next attack +1 |
| Garuda | Wild | 11 | Dive (req Wild 1, Range; discard Wild 1) 2 dmg / swap | Bombardment (req Wild+Toxin; discard Wild 1) 3 dmg + frontline toxin |
| Archmage of the Runes | Arcane | 12 | Arcane Burst (Arcane; discard Arcane 1) 2 dmg + draw | Mystic Overload (Arcane+Luminar; discard Arcane 1) 2 dmg + Energy + generate Arcane |
| Corrupting Elder | Arcane | 14 | Touch of Decay (Arcane; discard Arcane 1) 2 dmg + strip shield | Contamination (Arcane+Corruption; discard Corruption 1) 2 dmg + generate Corruption |
| Void Summoner | Arcane | 13 | Rupture (Arcane; discard Arcane 1) 2 dmg + generate Arcane | Dimensional Rift (Arcane+Darkness; discard Darkness 1) 2 dmg + Energy + draw |

## Catalogue (Mechanical / Luminar — Tempo & Combo)

Authored for builtin Tempo (`TEMPO_SQUAD`: Cogwork Driver / Prism Herald /
Aegis Link) and Combo Mechanical (`COMBO_MECHANICAL_SQUAD`: Servo Assembly /
Clockwork Dynamo / Lens Choir). Not on Aggro / Control squads. HP stays in the
playtest band (~11–17). All printed clauses wired with existing `010` / `012`
vocabulary.

| Creature | Attr | HP | Passive | Basic | Special |
|---|---|---|---|---|---|
| Prism Herald | Luminar | 13 | On absorb Luminar: next attack +1 | Gleam (L; disc L) 2 dmg + heal 1 most-damaged ally | Concord (L+Mech; disc L) 2 dmg + ally next attack +1 |
| Lens Choir | Luminar | 12 | On absorb Luminar, once per turn: generate Luminar | Focus Beam (L; disc L) 1 dmg + generate Luminar | Cascade (L+Wild; disc L) 2 dmg + Energy + generate Luminar |
| Aegis Link | Luminar | 14 | First Luminar card −1 Energy / On attack, another ally: heal 1 most-damaged | Ward Strike (L; disc L) 2 dmg + Shield 1 self | Beacon (L+Mech; disc L) 2 dmg + prevent 1 on ally |
| Cogwork Driver | Mechanical | 14 | On absorb Mechanical: next attack +1 | Drive (Mech; disc Mech) 2 dmg | Overclock (Mech+L; disc Mech) 3 dmg + generate Mechanical |
| Servo Assembly | Mechanical | 13 | On absorb Mechanical: generate Mechanical | Ratchet (Mech; disc Mech) 1 dmg + generate Mechanical | Stamp Pulse (Mech 2; disc Mech 1) 2 dmg + reapply die modifiers |
| Clockwork Dynamo | Mechanical | 12 | On roll Mechanical: next attack +1 | Spark (Mech; disc Mech) 2 dmg | Recalibrate (Mech+L; disc Mech) 2 dmg + next forge −1 Energy |

A separate Fast game test section in Figma adjusts some HP and costs; it is not
encoded yet.

## What this slice implements

| In | Out (deferred) |
|---|---|
| Six Figma creatures as content + English `CreatureCard` UI | Fast-game HP/cost variants |
| Mechanical / Luminar Tempo–Combo creatures (fully wired) | Stun |
| Basic/Special costs, damage, `followUpEffects` / `on-attack` riders | — |
| Passives: Minotaur pierce, Archmage Arcane discount, Varcolac / Elder / Void / Garuda Range; Luminar absorb/discount/ally heal; Mechanical absorb/roll payoffs | — |

War Minotaur ignore-1-Shield, Poisoned Charge toxin + back-row swap, Garuda Dive
optional swap, Bombardment frontline toxin, Archmage Burst draw / Overload
Energy+Arcane (`on-attack`), Elder Touch strip / Contamination generate Corruption,
Void Rupture generate Arcane / Rift Energy+draw — all wired (`010` / `012`).
Control print is the 2-damage + resource-rider band (was 1; playtest bump).

Prism Herald / Lens Choir / Aegis Link and Cogwork Driver / Servo Assembly /
Clockwork Dynamo convert Luminar and Mechanical engine value into Tempo pressure
or Combo loops without Martial beatstick ceilings.

The vertical-slice engine-demo squad (Warden / Lumin Adept / Rune Binder) has
been removed; hotseat defaults remain Aggro, with Control / Tempo / Combo
Mechanical available as builtin loadouts.

Run `npm run dev` to see the catalogue.
