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
| **Graveyard recursion** | Paradox | Eternal Darkness wired (`search-graveyard`) |
| **Replay GY card effect** | Paradox | Ignore requirements |
| **Symbol conversion** | Collapse of Reality, Void Summoner Rupture | Change rolled/available symbols |
| **Reposition / push / swap** | Varcolac, Garuda, Twin Blades, Predator's Claws, … | Board positions exist; movers do not |
| **On-damage triggers** | Venomous Fangs → apply toxin | Hook after damage resolves |
| **Roll-triggered equipment** | Black Plague (Corruption → 1 dmg) | Hook after roll / retain keep |
| **On-absorb triggers** | Mutant Spores, Wild Echo, Rust, … | |
| **Ignore Shield / pierce** | War Minotaur passive, Rust | |
| **Attack-damage conditional buffs** | Varcolac passive (+1 after ally attack) | |
| **Energy cost reduction** | Archmage passive, Tome of Interdiction | |
| **Multi-target damage split** | Blade Rain, Extermination | Player chooses distribution |
| **Copy / re-apply die modifiers** | Arcane Echo tactic + face | |
| **Forge-from-effect** (not PLAY forge region) | Corrupting Elder Contamination, Black Plague forge-on-opp already via region | Attack/effect-driven forge |
| **Retain-from-effect** | Void Summoner Dimensional Rift, Forbidden Heritage | `RETAIN_DIE` exists; effect path does not |
| **Destroy / strip overloads** | Mind Control | |
| **Send cards deck → GY** | Dark Pact | |
| **Continuous ritual once-per-turn** beyond Living Library | Serrated Stinger, Abyssal Sacrifice, … | Place/activate wired; more effect bodies missing |
| **Pestilence counters + adjacent forge** | Pestilent Plague face | |
| **Face copy (echo)** | Arcane Echo face | Forge restriction exists; copy does not |
| **Activated pay-Energy remove Corruption** | Forbidden Heritage, Pestilent Plague | |
| **Opponent draws** | Forbidden Heritage | |
| **Toxin removal** | — | Counters persist; nothing clears them yet |

---

## 2. Tactic catalogue — print-only or partial

Full English grammar is in `002`. Cards below either lack an `effect` /
`equipment` / `overload` / `ritual` body, or only implement a subset.

### In `src/game/content/cards.ts` but incomplete

| Card | Gap |
|---|---|
| Runic Nullification | Place/ready works; negate on activate missing |
| Arcane Echo (tactic) | Re-apply die modifiers |
| Venomous Fangs | On-damage → toxin |
| Eternal Darkness | — (`search-graveyard` wired) |
| Black Plague | Equip works; Corruption roll → damage missing |
| Prismatic Barrier | Approximated as shields, not true prevent |

### In Figma / `002` tables, not yet content-coded (or forge-only)

Aggro / control listings in `002` that are not in `CARDS` remain catalogue
targets. Highest-signal unfinished effect shapes from those tables:

| Shape | Example cards |
|---|---|
| Negate | Arcane Silence |
| Mass forge / consume Corruption | Great Contamination, Extermination |
| GY play / recursion | Paradox |
| Overload standings (generate / reroll / ignore shield / toxin on attack) | Blessings, Adrenaline, Rust, Latent Corruption, … |
| Equipment movers / buffs / heal-on-toxin | War Banner, Alpha's Hide, Toxic Heart, Hunter's Collar, … |
| Reaction prevent / draw-on-prevent | Luminar Judgement, Glimmer |
| Symbol convert / deck mill | Collapse of Reality, Dark Pact |
| Strip overloads | Mind Control |

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

Crush and Rending Claw are playable on roll.

---

## 5. Revisit checklist

When returning here at the end of the product loop:

1. Implement **reaction chain** first — unlocks negation / prevent honestly.
2. Add **trigger hooks** (on-damage, on-roll equipment, on-absorb) as shared
   infrastructure, then wire Venomous Fangs / Black Plague / passives.
3. Grow `EffectDefinition` only when a concrete card needs the member.
4. Backfill Figma tactic rows into `CARDS` once their vocabulary exists.
5. Finish face specials and creature riders against the same vocabulary.
6. Re-measure first-player win rate (OPEN_DESIGN) after catalogue depth lands.

Do not treat approximate effects (e.g. Barrier → shields) as final without an
explicit design decision recorded in `OPEN_DESIGN.md`.
