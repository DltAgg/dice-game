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
| Legendary | Optional `legendary: true`. Exactly one per legal squad; defeating
  it wins the match. Opens in the back row. Type-line / badge — not an
  effect verb. |
| Passive | Standing text + `standingAbilities` (`010` / `011`). Attribute absorb
  triggers use `absorberRelation: "ally"` so they fire when the **owner banks**
  into their attribute pile (spec `016`; `self` never matches a player bank). |
| Basic Attack | Cost icons + name + `effect` + optional `followUpEffects`. `requires`
  is the `[Requires: …]` **gate** (pile must hold it, not spent). `discards` is
  `[Spend: …]` (burned from the owner’s **attribute pile**). An attack may
  print either or both. |
| Special Attack | Same |

## Legendaries

Tough signature commanders (`legendary: true`). Exactly **one** per legal
squad; defeating the opposing legendary wins. Opens in the **back** row.
Type-line / badge — not an effect verb. Life sits above normal beaters
(~20–24). Attribute exclusives apply: Martial `[Swap]` / position payoffs,
Wild `[Frenzy]`, Arcane `[Insight]`, Darkness `[Mill]`, Luminar `[Prevent]`,
Mechanical `[Stamp]` / `[Reforge]`, Toxin `[Mark N Toxin]`, Corruption
opponent-die `[Forge]`.

### Builtin win targets

| Creature | Id | Attr | HP | Builtin | Identity |
|---|---|---|---|---|---|
| Ironhoof Warlord | `creature-warlord-ironhoof` | Martial | 23 | Aggro | Pierce + position → Empower; Swap special |
| Nightvault Sovereign | `creature-sovereign-nightvault` | Arcane | 22 | Control | Take damage → Draw; special Insight dig |
| Prismarch Regent | `creature-prismarch-regent` | Luminar | 22 | Tempo | Absorb → Prevent self; special Prevent ally |
| Forgeheart Colossus | `creature-forgeheart-colossus` | Mechanical | 22 | Combo Mechanical | Basic → Generate Mech; special Stamp + forge Discount |
| Blightcrown Hydra | `creature-blightcrown-hydra` | Toxin | 22 | Burn | Absorb → Mark Toxin on attacks; Strip→Strike closer |

### Constructed alternatives (catalogue only — not on builtins)

| Creature | Id | Attr | HP | Home | Identity |
|---|---|---|---|---|---|
| Thornmane Packlord | `creature-thornmane-packlord` | Wild | 21 | Aggro alt | Absorb → Frenzy self; special Frenzy ally |
| Umbra Gravewarden | `creature-umbra-gravewarden` | Darkness | 21 | Control alt | Absorb → opponent Mill; special Mill 3 |
| Ashen Plagueking | `creature-ashen-plagueking` | Corruption | 21 | Burn alt | Opponent turn-start ping; special opponent-die Forge |
| Aethercore Sovereign | `creature-aethercore-sovereign` | Mechanical | 21 | Combo alt | Absorb → Generate Mech; special Reforge |

Deck-designer owns which (if any) constructed alternatives replace builtin
legendaries in loadout lists.

## Catalogue (Slow game test)

HP is a **uniform +4** over the original Figma Slow print (playtest 2026-08-14:
skirmishes ended before control could interact). Relative identity is unchanged
(Garuda still glassiest, Minotaur still tankiest). Control attacks **Spend** on basics and **Require + Spend** on specials; playtests found 1 damage too soft, so the
squad’s attacks are **2 damage** (still below Aggro beatstick numbers). Finishing
damage still belongs mainly on the Control card / ritual / face / status layer
(bible §27; OPEN_DESIGN 2026-08-20). Do not push these attacks to Aggro ceilings.

| Creature | Attr | HP | Basic | Special |
|---|---|---|---|---|
| War Minotaur | Martial | 17 | Heavy Axe (Spend Martial 1) 3 dmg | War Charge (Requires Martial+Wild; Spend Martial 1) 4 dmg + back-row swap |
| Varcolac | Wild | 13 | Charge (Spend Wild 1) 2 dmg | Coordinated Hunt (Requires Wild+Martial; Spend Wild 1) 4 dmg + [Frenzy] |
| Garuda | Wild | 11 | Dive (Spend Wild 1, Range) 2 dmg | Bombardment (Requires Wild+Martial; Spend Wild 1) 3 dmg + frontline strip Shield |
| Archmage of the Runes | Arcane | 12 | Arcane Burst (Spend Arcane 1) 2 dmg + draw | Mystic Overload (Requires Arcane+Darkness; Spend Arcane 1) 2 dmg + generate Arcane |
| Corrupting Elder | Arcane | 14 | Touch of Decay (Spend Arcane 1) 2 dmg + strip shield | Contamination (Requires Arcane+Corruption; Spend Corruption 1) 2 dmg + generate Corruption |
| Void Summoner | Arcane | 13 | Rupture (Spend Arcane 1) 2 dmg + generate Arcane | Dimensional Rift (Requires Arcane+Darkness; Spend Darkness 1) 2 dmg + generate Darkness + draw |

Archmage’s special is **Arcane + Darkness** (was Luminar) so builtin Control
does not need a third attack color. Corrupting Elder remains in the catalogue
but is **not** on `CONTROL_SQUAD`.

## Catalogue (Control two-color — authored)

| Creature | Attr | HP | Passive | Basic | Special |
|---|---|---|---|---|---|
| Nightbound Adept | Darkness | 14 | On absorb Darkness, once per turn: [Drain 1] | Umbral Touch (Spend D) 2 dmg + generate Darkness | Eclipse Pulse (Requires A+D; Spend D) 2 dmg + opponent [Mill 1] |

On builtin Control (`CONTROL_SQUAD`: Archmage / Nightbound Adept /
Nightvault Sovereign). Attacks stay in the 2-damage + resource-rider band.

## Catalogue (Mechanical / Luminar — Tempo & Combo)

Authored for builtin Tempo (`TEMPO_SQUAD`: Cogwork Driver / Prism Herald /
Prismarch Regent) and Combo Mechanical (`COMBO_MECHANICAL_SQUAD`: Servo
Assembly / Clockwork Dynamo / Forgeheart Colossus). Not on Aggro / Control
squads. Non-legendary HP stays in the playtest band (~11–17); legendaries are
tougher win targets. All printed clauses wired with existing `010` / `012`
vocabulary.

| Creature | Attr | HP | Passive | Basic | Special |
|---|---|---|---|---|---|
| Prism Herald | Luminar | 13 | On absorb Luminar: next attack +1 | Gleam (Spend L) 2 dmg + heal 1 most-damaged ally | Concord (Requires L+Mech; Spend L) 2 dmg + ally next attack +1 |
| Lens Choir | Luminar | 12 | On absorb Luminar, once per turn: generate Luminar | Focus Beam (Spend L) 1 dmg + generate Luminar | Cascade (Requires L+Wild; Spend L) 2 dmg + generate Luminar |
| Aegis Link | Luminar | 14 | First Luminar card −1 / On attack, another ally: heal 1 most-damaged | Ward Strike (Spend L) 2 dmg + Shield 1 self | Beacon (Requires L+Mech; Spend L) 2 dmg + [Prevent] on ally |
| Cogwork Driver | Mechanical | 14 | On absorb Mechanical: next attack +1 | Drive (Spend Mech) 2 dmg | Overclock (Requires Mech+L; Spend Mech) 3 dmg + generate Mechanical |
| Servo Assembly | Mechanical | 13 | On absorb Mechanical: generate Mechanical | Ratchet (Spend Mech) 1 dmg + generate Mechanical | Stamp Pulse (Requires Mech 2; Spend Mech 1) 2 dmg + reapply die modifiers |
| Clockwork Dynamo | Mechanical | 12 | On roll Mechanical: next attack +1 | Spark (Spend Mech) 2 dmg | Recalibrate (Requires Mech+L; Spend Mech) 2 dmg + next forge −1 Energy |

## Catalogue (Toxin / Corruption — Burn)

Authored for builtin Burn (`BURN_SQUAD`: Marrow Fiend / Cinder Wight /
Blightcrown Hydra). Not on Aggro / Control / Tempo / Combo squads. Non-legendary
HP stays in the playtest band (~11–17). Attacks are modest (1–2 damage);
lethality is the DoT engine. All printed clauses wired with existing `010` /
`012` vocabulary.

| Creature | Attr | HP | Passive | Basic | Special |
|---|---|---|---|---|---|
| Marrow Fiend | Toxin | 15 | On toxin damage (enemy ticks): +1 Toxin on that creature | Gnaw (Spend T) 2 dmg | Spread Rot (Requires T 2; Spend T 1) 1 dmg + frontline toxin |
| Cinder Wight | Corruption | 14 | On start of opponent's turn: 1 dmg to most-damaged enemy | Cinder Touch (Spend C) 2 dmg | Brand (Requires C+T; Spend C) 1 dmg + toxin |
| Ichor Hydra | Toxin | 12 | First Toxin card −1 / On absorb Toxin: apply 1 Toxin to a chosen enemy | Fang (Spend T) 1 dmg + toxin | Molt Venom (Requires T+C; Spend T) 2 dmg + toxin |

### Vanilla baseline bodies (rate anchors)

One reference creature per attribute (`creature-baseline-{attr}`): 10 HP, no
passive engine, single basic attack `[Strike 2]` discarding 1 primary token.
Print notes intended cost band 2–3. **Not** on any builtin squad.

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
| Passives: Minotaur pierce, Archmage Arcane discount, Varcolac Frenzy (ally-other / Coordinated Hunt), Elder / Void / Garuda Range; Luminar absorb/discount/ally heal; Mechanical absorb/roll payoffs; Burn toxin-spread / turn-start ping / absorb-toxin | — |

War Minotaur ignore-1-Shield, War Charge back-row swap, Garuda Dive
Range 2-damage, Bombardment frontline strip Shield, Archmage Burst draw / Overload
generate Arcane (`on-attack`), Elder Touch strip / Contamination generate Corruption,
Void Rupture generate Arcane / Rift generate Darkness + draw, Nightbound Umbral Touch generate
Darkness / Eclipse Pulse opponent [Mill 1] — all wired (`010` / `012`).
Control print is the 2-damage + resource-rider band (was 1; playtest bump).
Builtin Control squad is Archmage + Nightbound Adept + Nightvault Sovereign
(legendary). Aggro is Minotaur + Varcolac + Ironhoof Warlord (legendary).

Prism Herald / Lens Choir / Aegis Link and Cogwork Driver / Servo Assembly /
Clockwork Dynamo convert Luminar and Mechanical engine value into Tempo pressure
or Combo loops without Martial beatstick ceilings. Builtin Tempo uses Prismarch
Regent as legendary; Combo Mechanical uses Forgeheart Colossus.

Marrow Fiend / Cinder Wight / Ichor Hydra convert Toxin and Corruption engine
value into continuous burn without Martial beatstick ceilings. Builtin Burn
uses Blightcrown Hydra as legendary. Catalogue also has constructed-only
legendaries (Thornmane Packlord, Umbra Gravewarden, Ashen Plagueking,
Aethercore Sovereign) — not on any builtin squad.

The vertical-slice engine-demo squad (Warden / Lumin Adept / Rune Binder) has
been removed; hotseat defaults remain Aggro, with Control / Tempo / Combo
Mechanical / Burn available as builtin loadouts.

Run `npm run dev` to see the catalogue.
