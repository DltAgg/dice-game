# 003 — Creature cards

Status: **IMPLEMENTED DEPTH** — Figma catalogue + English UI; passives and
attack riders wired in `011`–`012` (Hunt push rewritten to next-attack bonus).
Mechanical / Luminar Tempo–Combo creatures authored (fully wired). Toxin /
Corruption Burn squad authored (fully wired). Fast-game HP/cost variants are
not encoded.

Derived from the `Creature card` page of the `Card layouts` Figma file
(`0t97sC2tBFYx2Nhe6zeRw7`, page `0:1`). The Slow game test section is the
authority for the six playable Figma creature designs. Additional Mechanical /
Luminar entries support constructed Tempo and Combo Mechanical loadouts.
Toxin / Corruption bodies support builtin Burn (`BURN_SQUAD`).

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
| War Minotaur | Martial | 17 | Heavy Axe (req Martial 2; no discard) 3 dmg | War Charge (req Martial+Wild; discard Martial 1) 4 dmg + back-row swap |
| Varcolac | Wild | 13 | Charge (req Wild 1; discard Wild 1) 2 dmg | Coordinated Hunt (req Wild+Martial; discard Wild 1) 4 dmg + next attack +1 |
| Garuda | Wild | 11 | Dive (req Wild 1, Range; discard Wild 1) 2 dmg / swap | Bombardment (req Wild+Martial; discard Wild 1) 3 dmg + frontline strip Shield |
| Archmage of the Runes | Arcane | 12 | Arcane Burst (Arcane; discard Arcane 1) 2 dmg + draw | Mystic Overload (Arcane+Darkness; discard Arcane 1) 2 dmg + Energy + generate Arcane |
| Corrupting Elder | Arcane | 14 | Touch of Decay (Arcane; discard Arcane 1) 2 dmg + strip shield | Contamination (Arcane+Corruption; discard Corruption 1) 2 dmg + generate Corruption |
| Void Summoner | Arcane | 13 | Rupture (Arcane; discard Arcane 1) 2 dmg + generate Arcane | Dimensional Rift (Arcane+Darkness; discard Darkness 1) 2 dmg + Energy + draw |

Archmage’s special is **Arcane + Darkness** (was Luminar) so builtin Control
does not need a third attack color. Corrupting Elder remains in the catalogue
but is **not** on `CONTROL_SQUAD`.

## Catalogue (Control two-color — authored)

| Creature | Attr | HP | Passive | Basic | Special |
|---|---|---|---|---|---|
| Nightbound Adept | Darkness | 14 | On absorb Darkness, once per turn: chosen enemy discards 1 token | Umbral Touch (D; disc D) 2 dmg + generate Darkness | Eclipse Pulse (A+D; disc D) 2 dmg + opponent loses 1 Energy |

On builtin Control (`CONTROL_SQUAD`: Archmage / Nightbound Adept / Void
Summoner). Attacks stay in the 2-damage + resource-rider band.

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

## Catalogue (Toxin / Corruption — Burn)

Authored for builtin Burn (`BURN_SQUAD`: Marrow Fiend / Cinder Wight /
Ichor Hydra). Not on Aggro / Control / Tempo / Combo squads. HP stays in the
playtest band (~11–17). Attacks are modest (1–2 damage); lethality is the DoT
engine. All printed clauses wired with existing `010` / `012` vocabulary.

| Creature | Attr | HP | Passive | Basic | Special |
|---|---|---|---|---|---|
| Marrow Fiend | Toxin | 15 | On toxin damage (enemy ticks): +1 Toxin on that creature | Gnaw (T; disc T) 2 dmg | Spread Rot (T 2; disc T) 1 dmg + frontline toxin |
| Cinder Wight | Corruption | 14 | On start of opponent's turn: 1 dmg to most-damaged enemy | Cinder Touch (C; disc C) 2 dmg | Brand (C+T; disc C) 1 dmg + toxin |
| Ichor Hydra | Toxin | 12 | First Toxin card −1 Energy / On absorb Toxin: apply 1 Toxin to a chosen enemy | Fang (T; disc T) 1 dmg + toxin | Molt Venom (T+C; disc T) 2 dmg + toxin |

A separate Fast game test section in Figma adjusts some HP and costs; it is not
encoded yet.

## What this slice implements

| In | Out (deferred) |
|---|---|
| Six Figma creatures as content + English `CreatureCard` UI | Fast-game HP/cost variants |
| Mechanical / Luminar Tempo–Combo creatures (fully wired) | Stun |
| Nightbound Adept (Darkness Control, fully wired) | — |
| Toxin / Corruption Burn creatures (fully wired) | — |
| Basic/Special costs, damage, `followUpEffects` / `on-attack` riders | — |
| Passives: Minotaur pierce, Archmage Arcane discount, Varcolac / Elder / Void / Garuda Range; Luminar absorb/discount/ally heal; Mechanical absorb/roll payoffs; Burn toxin-spread / turn-start ping / absorb-toxin | — |

War Minotaur ignore-1-Shield, War Charge back-row swap, Garuda Dive
optional swap, Bombardment frontline strip Shield, Archmage Burst draw / Overload
Energy+Arcane (`on-attack`), Elder Touch strip / Contamination generate Corruption,
Void Rupture generate Arcane / Rift Energy+draw, Nightbound Umbral Touch generate
Darkness / Eclipse Pulse opponent Energy loss — all wired (`010` / `012`).
Control print is the 2-damage + resource-rider band (was 1; playtest bump).
Builtin Control squad is Archmage + Nightbound Adept + Void Summoner.

Prism Herald / Lens Choir / Aegis Link and Cogwork Driver / Servo Assembly /
Clockwork Dynamo convert Luminar and Mechanical engine value into Tempo pressure
or Combo loops without Martial beatstick ceilings.

Marrow Fiend / Cinder Wight / Ichor Hydra convert Toxin and Corruption engine
value into continuous burn without Martial beatstick ceilings.

The vertical-slice engine-demo squad (Warden / Lumin Adept / Rune Binder) has
been removed; hotseat defaults remain Aggro, with Control / Tempo / Combo
Mechanical / Burn available as builtin loadouts.

Run `npm run dev` to see the catalogue.
