# Deferred catalogue effects (revisit at end)

Parked at the close of Milestone 2 so M3 (local match UI) can proceed without
finishing every printed clause. Nothing here is abandoned — revisit when the
match loop is playable and the engine vocabulary needs to catch the catalogue.

**Sources:** `docs/specs/002-card-layer.md`, `003-creature-cards.md`,
`004-face-cards.md`, `docs/OPEN_DESIGN.md`.

---

## 1. Unfinished effect vocabulary

Effects / systems the engine does not yet express (or only partially). Add as
discriminated `EffectDefinition` members (or dedicated actions) when a card
needs them — never as unreachable stubs.

| Vocabulary | Needed for | Notes |
|---|---|---|
| **Reaction chain** (YGO-style LILO) | Prevent reactions (Barrier …) | **IMPLEMENTED** (`008`) — windows on play/place/activate/equip/overload/attack; forge silent |
| **Negate tactic effect** | — | **IMPLEMENTED** — top tactic-card link only (`negate-tactic`) |
| **Prevent N damage** (one-shot) | — | **IMPLEMENTED** (`009`) — `grant-damage-prevent` buffer; Barrier wired |
| **Prevent + reflect** | — | **IMPLEMENTED** — `prevent-attack-reflect` (Luminar Judgement) |
| **Draw on prevent** | — | **IMPLEMENTED** — `arm-prevent-draw` (Glimmer) |
| **Graveyard recursion** | Paradox | Eternal Darkness wired (`search-graveyard`) |
| **Replay GY card effect** | Paradox | Ignore requirements |
| **Symbol conversion** | Collapse of Reality, Void Summoner Rupture | Change rolled/available symbols |
| **Reposition / push / swap** | Varcolac, Garuda, Twin Blades, Predator's Claws, … | Board positions exist; movers do not |
| **On-damage triggers** | Venomous Fangs → apply toxin; Blade of Serene Light → heal | **IMPLEMENTED** (`010`) — `on-deal-damage` / `on-toxin-damage` |
| **Roll-triggered equipment** | Black Plague (Corruption → 1 dmg) | **IMPLEMENTED** (`010`) — `on-roll-symbol` |
| **On-absorb triggers** | Mutant Spores, Wild Echo, Rust, Mirrored Rune, Wild Carapace, Archmage's Grimoire, CSV face On absorb lines, … | **PARTIAL** (`010`) — hook live; Rust / Mirrored Rune / remaining CSV absorb clauses still deferred |
| **On-absorb face effects** | Insight Rune, Conversion Rune, … (full CSV set) | Hook ready; **partially wired**: Insight roll, Conversion absorb, Vital Spark both, Aegis roll, Primordial Fury absorb, Impact absorb, Venom roll — remaining clauses still deferred |
| **Ignore Shield / pierce** | War Minotaur passive, Rust | |
| **Attack-damage conditional buffs** | War Banner (left ally aura) | Varcolac passive **wired** (`on-attack` + `ally-other` + `grant-next-attack-bonus`) |
| **Shared trigger events** | Twin Blades, Insignia, Alpha's Hide, … | **IMPLEMENTED** infrastructure; movers / push / “another card” still block some wires |
| **Energy cost reduction** | Archmage passive, Tome of Interdiction | |
| **Multi-target damage split** | Blade Rain, Extermination | Player chooses distribution |
| **Copy / re-apply die modifiers** | Arcane Echo tactic + face | |
| **Forge-from-effect** (not PLAY forge region) | Corrupting Elder Contamination | **PARTIAL** — `forge-faces` wired (Great Contamination, Ritual of Contamination); attack-driven forge still deferred |
| **Consume faces → damage** | Extermination | |
| **Retain-from-effect** | Void Summoner Dimensional Rift, Forbidden Heritage | `RETAIN_DIE` exists; effect path does not |
| **Destroy / strip overloads** | Mind Control | |
| **Send cards deck → GY** | Dark Pact | |
| **Continuous ritual standing triggers** | — | Abyssal Sacrifice, Serrated Stinger, Foundry, **Battle Hymn**, **Pack Law** wired; others as needed |
| **Toxin on all attacks this turn** | — | **IMPLEMENTED** — `arm-attack-toxin` (Toxic Blessing) |
| **Reroll face once / self-damage** | Adrenaline | |
| **Energy-spent scaling amounts** | Future `?` cards (e.g. spent N → draw) | Payment path exists; no effect reads `energyPaid` yet |
| **Pestilence counters + adjacent forge** | Pestilent Plague face | |
| **Face copy (echo)** | Arcane Echo face | Forge restriction exists; copy does not |
| **Activated pay-Energy remove Corruption** | Forbidden Heritage, Pestilent Plague | |
| **Opponent draws** | Forbidden Heritage | |
| **Toxin removal** | — | Counters persist; nothing clears them yet |

---

## 2. Tactic catalogue — print-only or partial

Full English grammar is in `002`. Cards below either lack an `effect` /
`equipment` / `overload` / `ritual` body, or only implement a subset.

### In `src/game/content/cards.ts` — incomplete regions

| Card | Gap |
|---|---|
| Arcane Echo (tactic) | Re-apply die modifiers (forge-only play) |
| Extermination | Ritual place; consume + split damage deferred |
| Paradox | Ritual place (no Active when); GY replay deferred |
| Collapse of Reality | Forge-only; symbol convert deferred |
| Dark Pact | Forge-only; deck→GY deferred |
| Mind Control | Forge-only; strip overloads deferred |
| Tome of Interdiction | Equip; cost reduction deferred |
| Abyssal Sacrifice | **Wired** discard → Darkness |
| Mirrored Rune | Equip; absorb→copy deferred |
| Toxic Blessing | — | **Wired** `arm-attack-toxin` on roll |
| Adrenaline | Overload attach + Natural Wild gate; reroll clause deferred |
| Rust | Overload attach + Natural Martial gate; ignore shield deferred |
| Predator's Claws | Equip; absorb→move deferred |
| Serrated Stinger | **Wired** ally special attack → toxin on target |
| War Banner | Equip; left-ally +1 basic deferred |
| Alpha's Hide | Equip; special→generate Wild on another card deferred |
| Hunter's Collar | — | **Wired** position change → Martial (`setCreaturePosition`) |
| Insignia of Command | Equip + Martial gate; attack→reposition deferred |
| Hunting Armour | **Wired** first damage −1 / turn |
| Twin Blades | Equip; basic→push deferred (`on-attack` ready) |

Fully wired in `010` (removed from gaps): Venomous Fangs, Black Plague, Blade of
Serene Light, Archmage's Grimoire, Mutant Spores, Wild Echo, Toxic Heart, Wild
Carapace, Hunting Armour, Abyssal Sacrifice, Serrated Stinger, Toxic Blessing,
Hunter's Collar.

### Fully wired (for reference)

Eclipse, Living Library, Luminar Prism, Arcane Resonance, Persistent Infection,
Calculated Sacrifice, War Axe, Eternal Darkness, Latent Corruption, Arcane
Amplifier, Blessing of the Hunt, Martial Blessing, Runic Nullification, Arcane
Silence, Prismatic Barrier, Luminar Judgement, Glimmer, Great Contamination,
Ritual of Contamination, Ratchet, Assembly Line, Governor, Spare Cog, Die Press,
Foundry, Temper, Opening Cut, Press the Attack, Riposte, Whetstone, Untamed,
Pounce, Pack Surge, Rending Mark, Snarl, Dose, Blight Strike, Call to Arms,
Battle Hymn, Pack Law, Virulent Rite.

Named faces **Flywheel** and **Piston** are fully wired (Flywheel: roll Energy /
absorb Shield; Piston: roll Mechanical / absorb Energy). Authored aggro faces
**Warhorn**, **Cleaving Strike**, **Bloodscent**, **Gore**, **Needle**, and
**Seep** are fully wired (On roll / On absorb).

---

## 3. Creature catalogue — print-only riders

Damage lines resolve; passives and most special riders do not.

| Creature | Unfinished |
|---|---|
| War Minotaur | Passive ignore 1 Shield; Poisoned Charge toxin + back-row swap |
| Varcolac | Coordinated Hunt conditional push (passive **wired**) |
| Garuda | Dive optional swap; Bombardment frontline toxin (Range flag exists) |
| Archmage of the Runes | Passive Arcane tactic discount; Arcane Burst draw; Mystic Overload frontline shields |
| Corrupting Elder | Touch strip shield; Contamination forge opp (passive **wired**) |
| Void Summoner | Rupture convert; Dimensional Rift retain | Passive **wired** (Natural absorb → Arcane) |

Fast-game HP/cost variants from Figma are not encoded.

---

## 4. Face catalogue — print-only or partial specials

| Face | Gap |
|---|---|
| Arcane Echo | Copy other die's face (restriction wired) |
| Blade Rain | Split next attack among enemies in range |
| Forbidden Heritage | Opp draw, Retain, pay Energy to strip Corruption |
| Pestilent Plague | Pestilence counters + adjacent forge + strip Corruption |
| Great Spark / Rekindle | No printed rules yet |
| Insight Rune | **Wired** roll: draw; absorb dig still open |
| Conversion Rune | Roll: convert Arcane→Natural open; **wired** absorb: +Energy |
| Resonance Rune | Roll: conditional Energy; absorb: treat Arcane as any |
| Vital Spark | **Wired** roll heal + absorb prevent |
| Aegis | **Wired** roll: generate Shield; absorb: redirect damage open |
| Revelation | Roll: peek/bottom; absorb: heal if <½ Life |
| Instinct | Roll: reposition; absorb: extra basic attack |
| Primordial Fury | Roll: Energy if attacked open; **wired** absorb: next attack +1 |
| Pack | Roll: adjacent → Wild; absorb: reposition |
| Command | Roll: ally move; absorb: enemy move |
| Impact | Roll: basic pushes open; **wired** absorb: next attack +2 |
| Formation | Roll: frontline Energy; absorb: +Defense |
| Venom | **Wired** roll: apply toxin (choose enemy); absorb: next hit +1 open |
| Spores | Roll: extra toxin if already toxined; absorb: heal toxined ally |
| Adaptive Toxin | Roll: cap toxin receive; absorb: remove markers → damage |
| Stain | Roll: Corruption marker on synthetic; absorb: lock Corrupted face |
| Infection | Roll: spread Corruption; absorb: opp loses Energy |
| Decay | Roll: suppress Natural inherent; absorb: strip Corrupted → unusable symbol |
| Gear | Roll: Energy if other Synthetic; absorb: forge costs −1 Energy |
| Catalyst | Roll: Synthetic as any attr; absorb: copy Synthetic face effect |
| Overcharge | Roll: optional Energy + skip next; absorb: resolve face effect twice |
| Shadow Echo | Roll: discard→draw; absorb: GY card ≤2 cost |
| Drain | Roll: opp loses Energy; absorb: transfer Energy |
| Sacrifice | Roll: discard→2 Energy; absorb: discard→2 damage |

Crush and Rending Claw are playable on roll (print uses `On roll:`).

---

## 5. Revisit checklist

When returning here at the end of the product loop:

1. Implement **reaction chain** first — unlocks negation / prevent honestly. (**done** `008`/`009`)
2. Add **trigger hooks** (on-damage, on-roll equipment, on-absorb) as shared
   infrastructure, then wire Venomous Fangs / Black Plague / absorb gear.
   (**done** `010` for the listed cards; several CSV face clauses now wired —
   see §4; remaining face On-absorb + gear still open)
3. Grow `EffectDefinition` only when a concrete card needs the member.
4. Finish deferred tactic shells against the same vocabulary.
5. Finish face specials and creature riders against the same vocabulary.
6. Re-measure first-player win rate (OPEN_DESIGN) after catalogue depth lands.

Do not treat approximate effects (e.g. Barrier → shields) as final without an
explicit design decision recorded in `OPEN_DESIGN.md`.
