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
| **Reaction chain** (YGO-style LILO) | Runic Nullification, Prismatic Barrier as true prevent, Arcane Silence | Decided in OPEN_DESIGN; `resolutionStack` is the seed |
| **Negate tactic effect** | Runic Nullification, Arcane Silence | Requires reaction window |
| **Prevent N damage** (one-shot) | Prismatic Barrier (currently approximated as +2 Shield) | |
| **Prevent + reflect** | Luminar Judgement | |
| **Draw on prevent** | Glimmer | |
| **Graveyard recursion** | Paradox | Eternal Darkness wired (`search-graveyard`) |
| **Replay GY card effect** | Paradox | Ignore requirements |
| **Symbol conversion** | Collapse of Reality, Void Summoner Rupture | Change rolled/available symbols |
| **Reposition / push / swap** | Varcolac, Garuda, Twin Blades, Predator's Claws, … | Board positions exist; movers do not |
| **On-damage triggers** | Venomous Fangs → apply toxin; Blade of Serene Light → heal | Hook after damage resolves |
| **Roll-triggered equipment** | Black Plague (Corruption → 1 dmg) | Hook after roll / retain keep |
| **On-absorb triggers** | Mutant Spores, Wild Echo, Rust, Mirrored Rune, Wild Carapace, Archmage's Grimoire, CSV face On absorb lines, … | |
| **On-absorb face effects** | Insight Rune, Conversion Rune, … (full CSV set) | Needs shared absorb hook before wiring `onRoll`-only halves |
| **Ignore Shield / pierce** | War Minotaur passive, Rust | |
| **Attack-damage conditional buffs** | Varcolac passive (+1 after ally attack); War Banner (left ally) | |
| **Energy cost reduction** | Archmage passive, Tome of Interdiction | |
| **Multi-target damage split** | Blade Rain, Extermination | Player chooses distribution |
| **Copy / re-apply die modifiers** | Arcane Echo tactic + face | |
| **Forge-from-effect** (not PLAY forge region) | Ritual of Contamination, Great Contamination, Corrupting Elder Contamination | Attack/effect-driven forge |
| **Consume faces → damage** | Extermination | |
| **Retain-from-effect** | Void Summoner Dimensional Rift, Forbidden Heritage | `RETAIN_DIE` exists; effect path does not |
| **Destroy / strip overloads** | Mind Control | |
| **Send cards deck → GY** | Dark Pact | |
| **Continuous ritual standing triggers** | Serrated Stinger, Abyssal Sacrifice, … | Place/activate wired; trigger bodies missing |
| **Toxin on all attacks this turn** | Toxic Blessing | |
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
| Runic Nullification | Place/ready works; negate on activate missing |
| Arcane Echo (tactic) | Re-apply die modifiers (forge-only play) |
| Venomous Fangs | On-damage → toxin |
| Black Plague | Equip works; Corruption roll → damage missing |
| Prismatic Barrier | Approximated as shields, not true prevent |
| Great Contamination | Ritual place; mass forge-on-opp deferred |
| Extermination | Ritual place; consume + split damage deferred |
| Paradox | Ritual place (no Active when); GY replay deferred |
| Luminar Judgement | Forge-only; prevent+reflect deferred |
| Glimmer | Forge-only; draw-on-prevent deferred |
| Collapse of Reality | Forge-only; symbol convert deferred |
| Dark Pact | Forge-only; deck→GY deferred |
| Mind Control | Forge-only; strip overloads deferred |
| Arcane Silence | Forge-only; negate deferred |
| Ritual of Contamination | Forge-only; forge-from-effect deferred |
| Blade of Serene Light | Equip; heal-on-damage deferred |
| Archmage's Grimoire | Equip + attr gate; absorb→draw/discard deferred |
| Tome of Interdiction | Equip; cost reduction deferred |
| Abyssal Sacrifice | Ritual place; discard→generate Darkness deferred |
| Mirrored Rune | Equip; absorb→copy deferred |
| Toxic Blessing | Overload attach + Toxin gate; all-attacks toxin deferred |
| Mutant Spores | Overload attach + Toxin gate; on-absorb heal deferred |
| Wild Echo | Overload attach + Natural Wild gate; on-absorb generate deferred |
| Adrenaline | Overload attach + Natural Wild gate; reroll clause deferred |
| Rust | Overload attach + Natural Martial gate; ignore shield deferred |
| Predator's Claws | Equip; absorb→move deferred |
| Serrated Stinger | Ritual place; special→toxin deferred |
| War Banner | Equip; left-ally +1 basic deferred |
| Alpha's Hide | Equip; special→generate Wild deferred |
| Toxic Heart | Equip; toxin-dmg→heal deferred |
| Hunter's Collar | Equip; position→Martial deferred |
| Insignia of Command | Equip + Martial gate; attack→reposition deferred |
| Hunting Armour | Equip; first damage −1 deferred |
| Twin Blades | Equip; basic→push deferred |
| Wild Carapace | Equip; absorb Wild→heal deferred |

### Fully wired (for reference)

Eclipse, Living Library, Luminar Prism, Arcane Resonance, Persistent Infection,
Calculated Sacrifice, War Axe, Eternal Darkness, Latent Corruption, Arcane
Amplifier, Blessing of the Hunt, Martial Blessing.

---

## 3. Creature catalogue — print-only riders

Damage lines resolve; passives and most special riders do not.

| Creature | Unfinished |
|---|---|
| War Minotaur | Passive ignore 1 Shield; Poisoned Charge toxin + back-row swap |
| Varcolac | Passive ally-attack buff; Coordinated Hunt conditional push |
| Garuda | Dive optional swap; Bombardment frontline toxin (Range flag exists) |
| Archmage of the Runes | Passive Arcane tactic discount; Arcane Burst draw; Mystic Overload frontline shields |
| Corrupting Elder | Passive opp Corruption roll damage; Touch strip shield; Contamination forge opp |
| Void Summoner | Passive absorb→Arcane; Rupture convert; Dimensional Rift retain |

Fast-game HP/cost variants from Figma are not encoded.

---

## 4. Face catalogue — print-only specials

| Face | Gap |
|---|---|
| Arcane Echo | Copy other die's face (restriction wired) |
| Blade Rain | Split next attack among enemies in range |
| Forbidden Heritage | Opp draw, Retain, pay Energy to strip Corruption |
| Pestilent Plague | Pestilence counters + adjacent forge + strip Corruption |
| Great Spark / Rekindle | No printed rules yet |
| **On-absorb face triggers** (shared) | All CSV synthetics below — absorb path does not exist |
| Insight Rune | Roll: draw; absorb: dig top 2 |
| Conversion Rune | Roll: convert Arcane→Natural; absorb: +Energy |
| Resonance Rune | Roll: conditional Energy; absorb: treat Arcane as any |
| Vital Spark | Roll: heal 1; absorb: prevent 1 |
| Aegis | Roll: generate Shield; absorb: redirect damage |
| Revelation | Roll: peek/bottom; absorb: heal if <½ Life |
| Instinct | Roll: reposition; absorb: extra basic attack |
| Primordial Fury | Roll: Energy if attacked; absorb: basic +1 |
| Pack | Roll: adjacent → Wild; absorb: reposition |
| Command | Roll: ally move; absorb: enemy move |
| Impact | Roll: basic pushes; absorb: next attack +2 |
| Formation | Roll: frontline Energy; absorb: +Defense |
| Venom | Roll: apply toxin; absorb: next hit +1 |
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

Crush and Rending Claw are playable on roll.

---

## 5. Revisit checklist

When returning here at the end of the product loop:

1. Implement **reaction chain** first — unlocks negation / prevent honestly.
2. Add **trigger hooks** (on-damage, on-roll equipment, on-absorb) as shared
   infrastructure, then wire Venomous Fangs / Black Plague / passives.
3. Grow `EffectDefinition` only when a concrete card needs the member.
4. Finish deferred tactic shells against the same vocabulary.
5. Finish face specials and creature riders against the same vocabulary.
6. Re-measure first-player win rate (OPEN_DESIGN) after catalogue depth lands.

Do not treat approximate effects (e.g. Barrier → shields) as final without an
explicit design decision recorded in `OPEN_DESIGN.md`.
