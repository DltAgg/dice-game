# Design standards (ritual / tactic / face)

Canon: `competitive_dice_game_agent_bible.md` §§19–20, 26–30.
Grammar: `docs/specs/002-card-layer.md`, `004-face-cards.md`.
Set craft (uniqueness, forge development, bridges, generic reach):
[design-craft.md](design-craft.md). This file stays identity, exclusive
verbs, kinds, and costs.

## Game goal

Dice Skirmish is a **competitive skirmish engine-builder**. Cards must serve
both:

1. **Engine construction** — the forge region changes a die (bible §13).
2. **Moment-to-moment play** — the other region (instant, ritual, equipment,
   overload, or face inherent).

A card that only deals damage and never touches the engine is usually a miss.
A card that only forges with empty `rulesText` (`""`) is legal (forge-only /
“None”) but should be rare and intentional.

**Lethality is not reserved for creature attacks** (bible §§4, 24, 27, 33;
`OPEN_DESIGN.md`). The match ends when the **enemy legendary** is defeated —
not when the whole squad is cleared. Engine-converted damage — consume,
delayed, conditional, expensive setup — is a valid play-region payoff, and
Control **must** have enough of it to pressure the legendary. A Control list
that can only chip with 1-damage attacks is a miss even if its disruption is
excellent. Do not avoid authoring Control damage because “combat is supposed
to close.”

The **or** between forge and effect is load-bearing: one use, one region.
The two regions must still **work together** (design-craft synergy). A
forge that is an unrelated `faces: 1` sticker fails that test.

## What “good” looks like

- The player is making a **tradeoff** (forge now vs play now; absorb vs leave
  the symbol in the pool; stack another burn tick vs build your die).
- The attribute’s **primary identity** is still recognizable (bible §28–29).
- Costs match role: support and combat tricks still want a real pile cost
  (usually 2+ tokens); Arcane control generally medium/high. **Printed
  1-token `playCost` is exceptional** — niche only, so heavier cards stay appealing.
  The primary way to spend 1 token on a card is **cost reduction** (`[Discount]`),
  not a 1-token card. A rare 1-token is for a keyed engine piece whose real tax
  is stay/peel, not cheap cycle. Do not treat that as a band for new generic
  1-drops.
- Opponent-die forges (Corruption, Black Plague, Great Contamination): the
  **controller** names the face from **their** pool and installs it. Ownership
  stays with the forger; the physical face sits on the target die (§12).

## Attribute identities (directional)

| Attribute | Primary identity | Exclusive mechanic | Typical home |
|---|---|---|---|
| Martial | Direct combat / efficient attacks | Ally creature movement (swap / reposition) | Aggro |
| Wild | Creature pressure / flexible aggression | Extra attacks (`[Frenzy]`) | Aggro, Combo, Support |
| Toxin | Attrition / delayed damage / **burn ticks** | Toxin counter placement | Burn, Combo |
| Luminar | Synergy / support / combo value | `[Prevent]` on **reactions** (attack chain) | Combo, Support |
| Mechanical | Engine construction / manipulation | Own-die reconstruction | Combo, Support |
| Arcane | Control / manipulation / support | See and rearrange top of deck | Control, Support |
| Corruption | **Continuous burn** (damage over time); contaminate-dice is minor spice that feeds burn | Opponent-die manipulation | Burn |
| Darkness | Delayed value / disruption | Mill | Control |

**Exclusive mechanic** is the one verb no other attribute may print. Identity is broader (Martial still hits hard; Mechanical still generates Mechanical). See [Attribute exclusive mechanics](#attribute-exclusive-mechanics-decided) before authoring.

Do **not** give every attribute large damage, healing, draw, removal, and
disruption. Sustain attributes must not become the best burst; control must not
become efficient **aggro** (cheap fast creature attacks). Control **should**
deal meaningful damage through its engine (rituals, consume, delayed/conditional
hits). That is not the same as becoming Aggro.

Archetypes (002): Aggro = Martial/Wild; Combo = Luminar/Wild/Mechanical/Toxin;
Control = Arcane/Darkness; **Burn** (builtin `BURN_DECK`) =
Toxin/Corruption; Support = Arcane/Luminar/Wild/Mechanical
(utility may splash; printed 1-token `playCost` remains exceptional — splash via
discounts, not 1-drops). **Support-colored** is not **true generic reach**:
Support cards still have an attribute identity. Generic reach (any Martial,
Arcane, or Darkness list could maindeck it — no pile-color requirement, still
touches dice) is a separate slot; see [design-craft.md](design-craft.md).
Do **not** invent a 9th colorless attribute. Toxin is **not** builtin
Aggro — it lives on Burn (and Combo splash). Corruption is **not** Control’s
future home and must not require an Arcane/Darkness manabase. Do not turn
Corruption into generic Arcane negate.

Builtin decks: `src/server/content/loadouts/` (`aggro.json` persisted id
`deck-prototype`, plus control / tempo / combo-mechanical / burn). Client
wrappers: `src/client/decks/prototype.ts`.
Do not dump a new card into Aggro and Control without an identity reason; Mech
homes are Tempo / Combo Mechanical. Legal constructed: 40–50 tactics, ≤3 copies
per id; face deck ≤12, ≤3 per attribute.

**Feel vs pie:** exclusive verbs stay in this file. Shared mechanics (`[Generate]`,
Strike, `[Discount]`) still **feel like a deck style** depending on window —
attack-spend refund plays as Aggro even on Control. Track and update
[`docs/MECHANIC_ARCHETYPES.md`](../../../docs/MECHANIC_ARCHETYPES.md) from playtests.

## Attribute exclusive mechanics (`DECIDED`)

Canon pointer: bible §29 · `OPEN_DESIGN.md` (2026-08-21). Card-designer
**must** check this section before choosing an attribute for a new card.

Each attribute owns **one signature verb**. Do not print that verb on any
other attribute, even as a splash, a rider, or a “small version.” Identity
(efficient attacks, own-attribute generate, tiny heal, a single
`next-attack-bonus`, cost reduction, forge of your own attribute) is **not**
exclusive — those stay shared secondary tools.

Pairings that keep the pie readable:

- **Deck** (Arcane) vs **graveyard from deck** (Darkness).
- **Your die** (Mechanical) vs **their die** (Corruption).
- **Where the body stands** (Martial) vs **which body holds the fuel** (Wild).
- **Stop damage** (Luminar) vs **stack delayed damage** (Toxin).

| Attribute | Exclusive verb | Counts as (print this only here) | Does not count as |
|---|---|---|---|
| **Arcane** | See and rearrange the top of your deck | Look at top N; reorder; put some to hand / bottom / top; deck search (`search-deck`) as the heavy form | Draw without looking; mill; GY search |
| **Darkness** | Mill | Put cards from a deck into a graveyard (yours or the opponent’s), including named-from-deck piles that land in GY | Discard from hand; return from GY; look at top without GY |
| **Luminar** | Damage prevention (`[Prevent]` on reactions) | `[Prevent]` / `grant-attack-prevent` on **`type: "reaction"`** cards only, during a living attack chain link, onto that attack’s target; prevent-and-reflect; `On prevent damage:` payoffs | Proactive `[Prevent]` on faces, On absorb, instants, equipment, or standing passives; `damagePreventBuffer` / proactive arms; Shield/Heal standing in for Prevent |
| **Corruption** | Opponent-die manipulation | Forge / markers / lock / suppress / strip / steal overloads on **their** faces; opponent-die named specials | Own-die forge; own overloads; Toxin markers on creatures |
| **Toxin** | Toxin counter placement | Apply / spread / arm-attack Toxin markers; payoffs that *require* those markers | Corruption face ticks; generic delayed damage with no Toxin marker |
| **Martial** | Ally creature movement | Swap two allies; reposition an ally frontline ↔ back (War Charge, Command) | Enemy push (banned); extra attacks (`[Frenzy]` is Wild); sharing tokens |
| **Mechanical** | Own-die reconstruction | Extra forge on **your** die; replace your faces without a forge-draw (`[Reforge]` / `[Cross forge]`); reapply / copy / double **your** face and overload modifiers (Stamp, Coupling); move your overloads between **your** faces | Opponent-die (Corruption); deck order (Arcane); generating symbols; pile tokens; GY recursion |
| **Wild** | Extra attacks (`[Frenzy]`) | Grant a creature additional attacks this turn beyond the usual one (`grant-extra-attack`); may combine with `[Spend]` / absorb timing per card | Absorbing onto yourself (universal); generating pool symbols; ally reposition (Martial) |

### Authoring notes

- **One verb, many cards.** Vary cost, timing (`On roll` / `On absorb` / instant / standing), amount, and gate — do not invent a second exclusive for the same attribute.
- **Proving cards (already in catalogue):** Check **live JSON** first — this
  list may predate the catalogue reset. Arcane — Insight Rune, Living Library, Consult, Sift, Second Wind. Darkness — Dark Pact, Bury the Name, Grave Whisper. Luminar — Glimmer and prevent package (spec `009`), Sidestep, Hunting Armour. Corruption — Great Contamination, Wasting Brand, face-marker suite. Toxin — Dose / Venom / apply-toxin package. Martial — War Charge swap, Command, Dress Ranks, Predator’s Claws, Insignia of Command. Mechanical — Assembly Line, Die Press, Reforge, Stamp, Coupling, Arcane Echo (re-fire). Wild — Varcolac (creature Frenzy proving: ally-other / Coordinated Hunt), Instinct absorb Frenzy, Pounce (Spend + Frenzy), Den Share (On absorb Wild Frenzy). Share the Kill is `[Drain]` (shared). Pack Share is `[Generate]`.
- **Off-pie leaks** on Sift, Second Wind, Sidestep, Hunting Armour, Safety Latch, Predator’s Claws, Insignia of Command, Hunter’s Collar, Riposte, Revelation, Pack absorb, Garuda Dive, and Arcane Echo were **fixed** (moved onto the verb’s owner or rewritten off the stolen verb). Do not reintroduce them. Adrenaline / Rethrow (own-die reroll) are not anyone’s exclusive.
- **Wild vs Martial:** Martial moves the **body**. Wild grants **extra attacks** (`[Frenzy]`). A Wild card that swaps positions is in the wrong attribute; a Martial card that grants Frenzy is in the wrong attribute.
- **`[Prevent]` is reaction-exclusive** (spec `009`, `OPEN_DESIGN` 2026-08-29). Only
  Luminar **reaction** cards may print `[Prevent]` / use `grant-attack-prevent`.
  It answers an attack declaration on the chain — no attack link → whiff. Proactive
  Luminar mitigation uses `[Mark N Shield]` / `[Heal]`, not `[Prevent]` on faces,
  On absorb, instants, or standing abilities.
- **Mechanical vs Corruption:** Mechanical rebuilds **your** engine. Corruption contaminates **theirs**. An opponent-die forge on a Mechanical card is in the wrong attribute.

## Card kinds — when to use which

| Kind | Use for | Play path |
|---|---|---|
| Instant | Burst, conversion, combat trick | `PLAY_CARD` → `effect` → GY |
| Reaction | Window response from hand | Same, only in reaction window |
| Equipment | Standing ability on a creature | Attach; abilities as `StandingTrigger` |
| Overload | Modify an existing face | Attach to face card; `onRoll` / `onAbsorb` |
| Ritual / Instant | Retired; leftover copies still GY after activate | Prefer a hand Instant. Place → activate → GY if any leftover |
| Ritual / Reaction | Delayed field responder, once per turn | Place `preparing` → pile meets Active-when → `ACTIVATE_RITUAL` in a window → stay, exhaust |
| Ritual / Continuous | Lasting field engine | `standingAbilities` while ready; Activate only if `ritual.effects` is non-empty (then exhaust). Gate is owner’s **attribute pile** |
| Face (natural) | Starting identity faces | All eight attrs + Shield |
| Face (synthetic) | Named specials only | Pool → install; `onRoll` / `onAbsorb`. Never blank `face-synthetic-<attr>` |

Rituals are a **main type** (`type: "ritual"`), not a subtype. `activeWhen` is a
**pile gate** on the owner’s `attributePool` (`Arcane + Corruption + Corruption`
means hold those counts in the pile). Optional `ritual.spend` burns pile tokens
on activate. See [attribute-pile.md](attribute-pile.md).

Current catalogue cards **forge their own attribute**. Dual-kind cards may forge
Natural or Synthetic of that attribute — **pick kind with a reason**, not a
default (see [design-craft.md](design-craft.md)). Overload/equip gates and
generated symbols may still splash. The two fields remain independent in the
model if a future card needs a true forge splash. Spec `002` “Attribute bridge
cards” JSON is gone; do not recreate Spend/Generate glue.

## Face-kind policy

- All eight attributes are dual-kind: natural **and** synthetic forges.
  Naturals are identity basics (`face-natural-<attr>`). Synthetics are
  **named specials** (Crush, Warhorn, Venom, …), not identity blanks.
- Shield: `kind: "untyped"` only. Starting-die identity; never forged; not Natural.
- Never author generic identity synthetics (`face-synthetic-martial`,
  `face-synthetic-corruption`, Forged Martial, Synthetic Arcane, …).

## Cost and pile spend

Header `playCost` is a `SymbolRequirement` burned from the **attribute pile**.
Match live JSON (`card-shim-kit.json`: `"playCost": { "mechanical": 2 }`).

| When | Engine |
|---|---|
| Play (instant / reaction / equip / overload) | Header `playCost` (`[Spend]`; burns) |
| Ritual **place** | Header `playCost` |
| Ritual **activate** extra | `ritual.spend` (optional, `[Spend]`). Gate is `ritual.activeWhen` (`[Active when]`; no burn) |
| Play-region / instant **gate** | `effect.requires` — prints `[Requires]`; **does not burn** |
| **Natural** forge | Nothing from `playCost` |
| **Synthetic** forge | Header `playCost` (`docs/RULEBOOK.md` §8) |

Extra burn that is not a gate → raise header `playCost`. Do not mint
`effect.spend`. `[Discount]` cuts header Spend only. Fuel grammar:
[attribute-pile.md](attribute-pile.md).

**Default printed cost is 2+ pile tokens.** `playCost` totaling 1 token is a
last-resort niche tool, not the cheap-support band. Cheaper plays come from
`[Discount]` (`arm-forge-discount` / `play-cost-discount`), which makes
medium/high cards worth holding.

Printed `?` is variable pile pay (DEFERRED) — currently many catalogue `?` cards
use a fixed `playCost` of 2. Do not invent scaling-off-spend effects until that
vocabulary exists. If a card needs a resource plus, use `[Generate]`,
`[Discount]`, draw, yield, or brief `engine-developer`.

## Print English

- **Keywords.** New and edited print uses [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md).
  Timing prefixes + keyword clauses: `On roll: [Empower 1].` `On absorb: [Mark 1 Toxin].`
  New tokens join `[Mark N X]` / `[Strip N X]` — do not invent Dose / Envenom / Brand.
  Do not mass-rewrite old catalogue English unless asked.
- **Holder perspective.** The reader is the player who currently has this
  card on their field. **you** = that player. **opponent** / **enemy** =
  their opponent. If the card is forged, equipped, or handed onto the other
  side, the new holder is “you”; do not keep the sender’s voice. When two
  players must choose or act, spell out who does each action.
- Instant / ritual activate: imperative clauses, no “Whenever…”.
- Faces / overloads: `On roll:` / `On absorb:` lines.
- Equipment / continuous rituals: `On deal damage:` / `On absorb:` / … matching
  hook names (see standardize-card-effects).
- Ritual gate: stored in `ritual.activeWhen`; UI prints `[Active when: …]`.
  Do not also put that line in `rulesText`.
- Play-region gate: `effect.requires`; UI prints `[Requires: …]` (hold, no
  burn). Twin Cam / Tooling Order / Die Punch / Recast stay gates. Extra
  burn that is not a gate → raise `playCost`. Attack specials: `requires`
  = `[Requires]` gate, `discards` = `[Spend]` — do not fake a gate in
  `discards`. See [attribute-pile.md](attribute-pile.md).

## Anti-patterns

- Silent fake effects for unfinished print.
- Unreachable `EffectDefinition` members “for later”.
- Putting opponent-forge choice on the **opponent** (they receive the physical
  face; the activator picks from their pool).
- Blank/generic synthetics (attribute-named identity faces).
- Every attribute doing everything.
- Printing another attribute’s **exclusive verb** (see exclusive mechanics
  above) as a splash or rider.
- Default `forge.faces: 1` sticker unrelated to the play region.
- `[Spend] X, [Generate] Y` converters as “bridges” (spec `002` glue table is
  a failure mode — live JSON is truth).
- Cloning Cogtooth (`On roll: [Generate 1 SameAttr]`) to fill the dual-pip hole.
- Copying vanilla `002` baselines into constructed.
- Rules logic in React / Zustand / PeerJS.
- Growing AST without a concrete card + resolver + tests in the same change.

## Deck-designer brief — Burn identity (2026-08-20)

Builtin Burn (`BURN_*` / `deck-burn`) is the Toxin + Corruption DoT list.
When cutting Corruption from Control:

**Keep / densify for Burn:** Dose, Blight Strike, Venomous Fangs, Serrated
Stinger, Toxic Blessing, Virulent Rite, Slow Burn, Venom Font, Concentrate,
Ichor Sheath, Fester, Black Plague, Persistent Infection, Ritual of
Contamination, Smolder, Cinder Hex, Ember Tide, Extermination (consume closer),
Great Contamination (opponent-die install; pair with Wasting Brand). Faces:
Venom, Spores, Needle, Seep, Marrow Rot, Cinder (own-die ticks), Wasting Brand
(opponent-die self-damage; holder voice).

**Leave off Aggro:** Toxin pressure (Fangs, Blessing, Dose, Blight Strike,
Needle, Seep, Virulent Rite) belongs on Burn / Combo splash — not builtin
Martial/Wild Aggro.

**Fights Burn — cut from Control, do not maindeck in Burn:**
- Latent Corruption (`card-latent-corruption`) — Arcane-face overload that
  generates Arcane. Control engine leftover; not continuous burn.
- Hexbrand / Blight / Canker / Calculated Sacrifice / Mind Control — disruption
  and contaminate-without-ticks. Optional 1–2 ofs as spice, not the plan.

**Control remaining home:** Arcane + Darkness. Do not splash Corruption as a
fourth resource. Great Contamination’s Active-when is now Corruption+Corruption
(no Arcane) so Burn can install without a Control manabase.

