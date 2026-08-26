# 002 — The card layer

Status: **IMPLEMENTED DEPTH** — grammar + playable catalogue; remaining print
(stun, empty faces) in
[`docs/DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md). Movers, discounts,
GY replay, pierce, consume/split: [`012-deferred-vocabulary.md`](./012-deferred-vocabulary.md).
Face markers: [`013-face-markers.md`](./013-face-markers.md). Push/enemy move
banned (print rewritten).

Derived from the `Card layouts` Figma file, node `2:14`. The layouts are the
authority on the card grammar; this document records that grammar in English and
marks which parts of it the engine implements today.

## The keyword

**Forge.** The Portuguese layouts use `[Forje]`, the imperative of *forjar*, for
the act of changing one or more die faces. It matches the bible's existing
"forging" vocabulary, so no new term is introduced.

## Card grammar

Every card in the file is one template, `Tactics card layout`:

```text
┌──────────────────────────────────────────┐
│  Card Name                        ⟨cost⟩ │   header
│                                          │
│                (art)                     │
│                                          │
│  [Type / … / Attribute]                  │   text box
│  [Forge] 1 face [Natural or Synthetic]   │
│  [Attribute] on your die                 │
│  or                                      │
│  ⟨effect⟩                                │
└──────────────────────────────────────────┘
```

**Print voice (holder).** Effect text is written for the player who currently
has the card on their field. `you` is that holder; `opponent` is their
opponent. A card handed, forged, or equipped onto the other side keeps this
voice — it does not stay in the sender’s second person.

**Printed Energy 1 is exceptional.** Catalogue cards should generally cost 2+.
The intended 1-Energy play pattern is cost reduction on a heavier card, not a
band of 1-drops. Niche 1-costs need a design reason beyond “cheap support.”

Six fields, in the order the layout presents them:

| Field | Where | Notes |
|---|---|---|
| Name | header, left | |
| Energy cost | header, right | Integer, or `?` = variable pay-at-least-1 (see OPEN_DESIGN) |
| Type line | text box, first line | `[Instant\|Reaction\|Equipment\|Overload / <attribute>]` or `[Ritual / <subtype…> / <attribute>]` — Ritual subtypes are Instant, Continuous, Reaction |
| Forge region | text box | how many faces, of which kind and attribute, on which die |
| Requirements | text box, bracketed | optional, and specific to the type / ritual subtype |
| Effect | text box | the alternative to forging |

### The two regions are exclusive

The word **or** between the regions is load-bearing: a card is either forged
onto a die or played for its effect, never both. This is bible §19–20's
two-region architecture, and it is what makes every card a decision rather than
a resource.

### The card's attribute and the forge attribute

They are two fields on the card. The current catalogue **forges its own
attribute**: dual-kind cards typically forge Natural of that attribute;
synthetic-only attributes (Toxin, Mechanical, Corruption, Darkness) always
forge Synthetic. Overload/equip gates and generated symbols may still splash
(*Latent Corruption* is Corruption and forges Corruption, but can only
overload an Arcane face).

### Types and ritual subtypes

| Kind | Meaning |
|---|---|
| **Instant** (main type) | Resolves once immediately from hand. Timing: not a reaction window responder by type alone. |
| **Reaction** (main type) | May respond in a reaction window from hand. |
| **Equipment** (main type) | Attaches to a creature and grants a standing ability. |
| **Overload** (main type) | Attaches to an existing die face and modifies it. |
| **Ritual** (main type) | Goes to the field and waits. `[Active when: …]` names the attributes that switch it on. Subtypes below. |
| Ritual / Instant | Leaves for the GY after one activation. |
| Ritual / Continuous | Stays in play. Standing triggers while ready. Activate (then exhaust) only when print has an activate body. Banked Active-when symbols persist unless an effect discards them. |
| Ritual / Reaction | May respond in a reaction window from the field; leaves for the GY after activation — same fate as Ritual / Instant; the difference is *when* it can be used. |

### Requirement forms

| Form | Meaning | Appears on |
|---|---|---|
| `[Active when: Arcane + Arcane]` | Gate vs the owner’s **attribute pile** (spec `016`). When met, the ritual is / becomes `ready`. Standing fire while ready does not burn the gate. | Ritual |
| `[Spend: Arcane + Arcane]` | Optional burn from the owner’s attribute pile on `ACTIVATE_RITUAL` (often the same counts as Active-when for strong instants). Continuous standing rituals usually omit Spend. | Ritual |
| `[Requires: Martial + Wild]` | Attack **gate** vs the owner’s attribute pile (must hold; not spent) | Creature attack |
| `[Spend: Martial]` | Burn from the owner’s attribute pile (attack `discards`, instant extra cost, ritual activate) | Attack / Instant / Ritual |
| `[Can only overload a Toxin face]` | Restricts the overload target | Overload |
| `[This card may be equipped to a Martial creature]` | Restricts the equip target | Equipment |
| `Pay 3 Energy` | An extra cost inside the effect, on top of the header cost | Instant |

That last one matters: *Runic Nullification* costs 2 in its header and then asks
for 2 more Energy in its effect (4 Energy to actually negate), so the header
cost is what it costs to place the card and an effect may demand more.

### Forge region forms

| Form | Appears on |
|---|---|
| Forge 1 face, Natural, on your die | most |
| Forge 1 face, Synthetic, on your die | most |
| Forge 2 faces, Synthetic, on your die | *Arcane Silence* |
| Forge 1 face, Synthetic, **on the opponent's die** | *Black Plague* |

The **Forge** column in the catalogue tables below is **kind + attribute**,
not a face-card name. `1 Synthetic Corruption, your die` means forge **one
synthetic Corruption named special** from the owner's pool onto that die
(`forge.kind: "synthetic"`, `forge.attribute: "corruption"`). Same for
Synthetic Arcane / Toxin / Mechanical / Darkness / Martial / Wild / Luminar.
There is no catalogue card titled Synthetic Corruption, Forged Martial, etc.
Play-region print such as “Forge 3 Synthetic Corruption faces” uses the same
reading: any matching named special (Canker, Blight, Hexbrand, …).

## Design philosophy, from the file

> All attributes can and should have some way to deal damage, but it should stay
> within their main characteristic. If an attribute's main characteristic is
> sustain, it does not make sense for it to deal massive damage and have sustain
> at the same time.
>
> Damage is **not** reserved for creature attacks (bible §§4, 24, 27; OPEN_DESIGN
> 2026-08-20). Control attributes (Arcane, Darkness) must convert
> their engine into enough damage to eliminate creatures — expensive, delayed,
> or consume-based is in-identity; hoping 1-damage creature attacks close is not.
> Toxin + Corruption are the **Burn** plan (continuous DoT), not Control’s
> contaminate-the-die manabase.

| Archetype | Attributes |
|---|---|
| Aggro | Martial, Wild |
| Combo | Luminar, Wild, Mechanical, Toxin |
| Control | Arcane, Darkness |
| Burn | Toxin, Corruption |
| Support | Arcane, Luminar, Wild, Mechanical |

Builtin constructed lists (content + `src/decks/prototype.ts`): **Aggro**
(`PROTOTYPE_*` / `deck-prototype`), **Control** (`CONTROL_*` /
`deck-control`), **Tempo** (`TEMPO_*` / `deck-tempo` — Mech+Luminar sequencing),
**Combo Mechanical** (`COMBO_MECHANICAL_*` / `deck-combo-mechanical` — Mech
engine chaining), **Burn** (`BURN_*` / `deck-burn` — Toxin ticks + Corruption
DoT). Do not dump Mech into Aggro/Control without an identity reason.

> Support faces are not limited to only this, but should have low-cost cards
> that contribute to other builds.

## The catalogue, translated

Costs shown as `?` are **variable**: pay 1 or more Energy (`variableEnergy` in
content). Where the frame name and the printed name disagree, the printed name
is used.

### Aggro deck

Builtin **Aggro** (`PROTOTYPE_*`) is **Martial / Wild only** — same two-color
engine paradigm as Control = Arcane / Darkness. Catalogue rows below still
include historical Toxin / splash print for reference; those Toxin cards are
**not** on the Aggro builtin (they live on Burn / Combo).

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Runic Nullification | Ritual / Reaction / Arcane | 1 Synthetic Arcane, your die | *Active when: Arcane + Arcane.* Pay 2 Energy. [Negate Instant]. |
| 5 | Arcane Echo | Instant / Mechanical | 1 Synthetic Mechanical, your die | [Stamp]. |
| 1 | Blessing of the Hunt | Overload / Martial | 1 Natural Martial, your die | On roll: [Generate 1 Martial]. |
| 1 | Martial Blessing | Overload / Martial | 1 Natural Martial, your die | On roll: [Empower 1]. |
| 1 | Toxic Blessing | Overload / Toxin | 1 Synthetic Toxin, your die | *Toxin faces only.* On roll: [Mark 1 Toxin on attacks]. |
| ? | Mutant Spores | Overload / Toxin | 1 Synthetic Toxin, your die | *Toxin faces only.* On absorb: [Heal 1]. |
| ? | Wild Echo | Overload / Wild | 1 Natural Wild, your die | *Natural Wild faces only.* On absorb: [Generate 1 Wild]. |
| 1 | Adrenaline | Overload / Wild | 1 Natural Wild, your die | *Natural Wild faces only.* On roll: once per turn you may [Reroll] this face. If it lands on this face again, [Strike 1] 2 of your creatures. |
| ? | Rust | Overload / Martial | 1 Natural Martial, your die | *Natural Martial faces only.* On absorb: [Pierce 2]. |
| 1 | Ritual of Contamination | Instant / Corruption | 1 Synthetic Corruption, your die | *Requires: Corruption.* [Forge 1 Synthetic Corruption] on the opponent's die. |
| 4 | Luminar Judgement | Reaction / Luminar | 1 Natural Luminar, your die | On ally would take damage: prevent it; if you do, deal that much to the attacking creature. |
| 2 | Glimmer | Reaction / Luminar | 1 Synthetic Luminar, your die | On prevent damage: [Draw 2]. |
| 2 | Predator's Claws | Equipment / Martial | 1 Natural Martial, your die | On absorb Martial: this creature may [Reposition]. |
| 3 | Venomous Fangs | Equipment / Toxin | 1 Synthetic Toxin, your die | On deal damage: [Mark 1 Toxin]. |
| 4 | Serrated Stinger | Ritual / Continuous / Toxin | 1 Synthetic Toxin, your die | *Active when: Wild + Toxin.* On special attack: [Mark 1 Toxin]. |
| 4 | War Banner | Equipment / Wild | 1 Natural Wild, your die | On basic attack, allied creature to the left: +1 damage. |
| 4 | Alpha's Hide | Equipment / Wild | 1 Natural Wild, your die | On special attack: [Generate 1 Wild] on another card. |
| 5 | Toxic Heart | Equipment / Toxin | 1 Synthetic Toxin, your die | On toxin damage: [Heal 1] this creature. |
| 3 | Hunter's Collar | Equipment / Wild | 1 Natural Wild, your die | On absorb Wild: [Generate 1 Martial]. |
| 5 | Insignia of Command | Equipment / Martial | 1 Natural Martial, your die | *Martial creatures only.* On attack, once per turn: another ally may [Reposition]. |
| 2 | War Axe | Equipment / Martial | 1 Natural Martial, your die | On basic attack: +1 damage. |
| 2 | Hunting Armour | Equipment / Luminar | 1 Natural Luminar, your die | On take damage, once per turn: reduce it by 1. |
| 3 | Twin Blades | Equipment / Martial | 1 Natural Martial, your die | On basic attack: [Strip 1 Shield]. |
| 3 | Wild Carapace | Equipment / Wild | 1 Natural Wild, your die | On absorb Wild: [Heal 1]. |

### Control deck

Figma print mixed Arcane / Corruption / Darkness. **Builtin Control** is now
**Arcane / Darkness only** (no Corruption contaminate, no Luminar attack costs).
Per bible §27 / OPEN_DESIGN 2026-08-20, Control must convert its engine into
lethal damage — **Umbral Bolt**, **Rift Collapse**, **Umbral Brand**, and
**Runeflare** / **Sacrifice** are that path. Corruption rows below remain
catalogue identity for other strategies (burn sibling), not the Control builtin.

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 3 | Great Contamination | Ritual / Instant / Corruption | 1 Synthetic Corruption, your die | *Active when: Corruption + Corruption.* [Forge 3 Synthetic Corruption] on one of the opponent's dice. |
| 6 | Extermination | Ritual / Instant / Corruption | 1 Synthetic Corruption, your die | *Active when: Corruption + Corruption + Corruption.* Consume every Synthetic Corruption face from one die of one player and deal twice the number consumed as damage, split across up to 2 creatures. |
| 2 | Living Library | Ritual / Instant / Arcane | 1 Synthetic Arcane, your die | *Active when: Arcane + Arcane.* [Search 2] Instant or Ritual cards. |
| 3 | Paradox | Ritual / Instant / Darkness | 1 Synthetic Darkness, your die | Choose 1 Instant or Ritual card in your graveyard and use its effect immediately, ignoring its requirements. |
| 5 | Eternal Darkness | Ritual / Instant / Darkness | 1 Synthetic Darkness, your die | *Active when: Darkness + Darkness.* [Recall 3]. |
| 2 | Latent Corruption | Overload / Corruption | 1 Synthetic Corruption, your die | *Arcane faces only.* On roll: [Generate 1 Arcane]. |
| 2 | Luminar Prism | Overload / Luminar | 1 Natural Luminar, your die | On roll: [Heal 1]. |
| 1 | Arcane Amplifier | Overload / Arcane | 1 Natural Arcane, your die | *Arcane faces only.* On roll: [Generate 1 Arcane]. |
| 2 | Arcane Resonance | Overload / Arcane | 1 Natural Arcane, your die | On roll: [Generate 1 Arcane]. |
| 3 | Calculated Sacrifice | Instant / Corruption | 1 Synthetic Corruption, your die | [Destroy Equipment]. |
| 3 | Eclipse | Instant / Darkness | 1 Synthetic Darkness, your die | [Draw 2]. [Discard 1]. |
| 4 | Collapse of Reality | Instant / Arcane | 1 Natural Arcane, your die | [Convert 2]. |
| 4 | Dark Pact | Instant / Darkness | 1 Synthetic Darkness, your die | [Mill 2] Rituals of different attributes. |
| 6 | Mind Control | Instant / Corruption | 1 Synthetic Corruption, your die | Choose one: remove every Overload from 1 opposing face; or remove 1 Overload from up to 2 opposing faces. |
| 4 | Arcane Silence | Reaction / Arcane | 2 Synthetic Arcane, your die | [Negate]. |
| 2 | Persistent Infection | Overload / Corruption | 1 Synthetic Corruption, your die | *Corruption faces only.* On roll: [Gain 1 Energy]. |
| 2 | Blade of Serene Light | Equipment / Luminar | 1 Natural Luminar, your die | On deal damage: [Heal 1] on an allied creature. |
| 2 | Black Plague | Equipment / Corruption | 1 Synthetic Corruption, **the opponent's die** | *May be equipped to an opposing creature.* On roll Corruption: [Strike 1] this creature. |
| 2 | Archmage's Grimoire | Equipment / Darkness | 1 Synthetic Darkness, your die | *Arcane or Darkness creatures only.* On absorb Arcane or Darkness: [Draw 1]. [Discard 1]. |
| 3 | Tome of Interdiction | Equipment / Arcane | 1 Natural Arcane, your die | The first Instant Arcane used each turn costs 1 less Energy. |
| 3 | Abyssal Sacrifice | Ritual / Continuous / Darkness | 1 Synthetic Darkness, your die | *Active when: Arcane + Darkness.* On discard: [Generate 1 Darkness]. |
| 3 | Mirrored Rune | Equipment / Arcane | 1 Natural Arcane, your die | On absorb Arcane: copy another symbol onto it. |

## Naming inconsistencies in the file

Recorded so the content layer settles on one term each. The bible §26 name is
used in all cases.

| In the file | Also written | Used here |
|---|---|---|
| Selvagem | — | Wild |
| Luminar | Luz | Luminar |
| Trevas | Escuridão | Darkness |
| Arcana | Arcano | Arcane |

*Blessing of the Hunt*, *Martial Blessing*, *Toxic Blessing* and *Mutant Spores*
were typed Arcane and forged Natural Arcane in the layout dump (copy-paste).
Catalogue entries now match their primary identity (Martial / Toxin, with
synthetic Toxin forges). *Wild Echo* / *Adrenaline* / *Rust* were similarly
Corruption in that dump and are now Wild / Wild / Martial.

### Mechanical assembly (authored)

First Mechanical engine-construction package (absorb-vs-pool: Ratchet / Foundry
want absorb; Governor / Spare Cog / Die Press want the pool). Not dumped into
Aggro / Control; featured in builtin **Tempo** and **Combo Mechanical** lists.

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Ratchet | Overload / Mechanical | 1 Synthetic Mechanical, your die | *Mechanical faces only.* On absorb: [Generate 1 Mechanical]. |
| 3 | Assembly Line | Ritual / Instant / Mechanical | 1 Synthetic Mechanical, your die | *Active when: Mechanical + Mechanical.* [Forge 2 Synthetic Mechanical] on your die. |
| 2 | Governor | Overload / Mechanical | 1 Synthetic Mechanical, your die | *Mechanical faces only.* On roll: [Generate 1 Mechanical]. |
| 3 | Spare Cog | Instant / Mechanical | 1 Synthetic Mechanical, your die | [Generate 1 Mechanical]. |
| 3 | Die Press | Instant / Mechanical | 1 Synthetic Mechanical, your die | *Requires: Mechanical + Mechanical.* [Forge 2 Synthetic Mechanical] on your die. |
| 3 | Foundry | Ritual / Continuous / Mechanical | 1 Synthetic Mechanical, your die | *Active when: Mechanical + Mechanical.* On absorb Mechanical: [Gain 1 Energy]. |

### Mechanical combo wave 2 (authored)

Deepens Combo sequencing on the same absorb-vs-pool tension: Transmission /
Servomotor / Foundry lean absorb; Camshaft / Clockwork / Blueprint / Stamp lean
roll-pool; Coupling spends a stacked pool; Safety Latch / Recalibrate protect or
reset without Arcane negate. Densified in builtin **Combo Mechanical**; Tempo
takes a lighter cut. **Reforge** uses `replace-synthetic-face` (spec `012`).
Safety Latch is a Mechanical reaction (generate + next-forge discount), not prevent.

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Transmission | Overload / Mechanical | 1 Synthetic Mechanical, your die | *Mechanical faces only.* On absorb: copy another symbol onto it. |
| 1 | Camshaft | Overload / Mechanical | 1 Synthetic Mechanical, your die | *Mechanical faces only.* On roll: [Discount 1] forge. Niche 1-cost: gated discount enabler, not a generator. |
| 2 | Servomotor | Equipment / Mechanical | 1 Synthetic Mechanical, your die | On absorb Mechanical, once per turn: [Generate 1 Mechanical]. |
| 2 | Safety Latch | Reaction / Mechanical | 1 Synthetic Mechanical, your die | [Generate 1 Mechanical]. [Discount 1] forge. |
| 2 | Blueprint | Instant / Mechanical | 1 Synthetic Mechanical, your die | [Generate 1 Mechanical]. [Discount 1] forge. |
| 3 | Stamp | Instant / Mechanical | 1 Synthetic Mechanical, your die | *Requires: Mechanical.* [Stamp]. |
| 3 | Coupling | Instant / Mechanical | 1 Synthetic Mechanical, your die | *Requires: Mechanical + Mechanical.* [Double]. |
| 2 | Clockwork | Ritual / Continuous / Mechanical | 1 Synthetic Mechanical, your die | *Active when: Mechanical + Mechanical.* On roll Mechanical: [Generate 1 Mechanical]. |
| 3 | Recalibrate | Reaction / Mechanical | 1 Synthetic Mechanical, your die | [Recall 1] that costs 2 or less. |
| 3 | Reforge | Instant / Mechanical | 1 Synthetic Mechanical, your die | *Requires: Mechanical.* [Reforge]. |

### Martial / Wild aggro package (authored)

Playtest gap-fill for Aggro (Martial / Wild). Fully wired on existing
vocabulary. Martial / Wild rows live on builtin Aggro (`PROTOTYPE_*`); Toxin
rows (Dose, Blight Strike, Virulent Rite) are Burn / Combo splash, not Aggro.
Temper / Untamed exist so named synthetic Martial / Wild **named specials** can
be forged (existing Martial / Wild tactics only forge Natural). Individual
Toxin tactics forge synthetic Toxin (named specials from the pool, not a card
named Synthetic Toxin).

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Temper | Instant / Martial | 1 Natural Martial, your die | [Forge 1 Synthetic Martial] on your die. |
| 2 | Opening Cut | Instant / Martial | 1 Natural Martial, your die | *Requires: Martial.* [Strike 2]. |
| 2 | Press the Attack | Instant / Martial | 1 Natural Martial, your die | [Empower 2]. |
| 2 | Riposte | Reaction / Martial | 1 Natural Martial, your die | [Generate 1 Martial]. [Empower 1]. |
| 2 | Whetstone | Equipment / Martial | 1 Natural Martial, your die | On attack: [Generate 1 Martial]. |
| 2 | Untamed | Instant / Wild | 1 Natural Wild, your die | [Forge 1 Synthetic Wild] on your die. |
| 2 | Pounce | Instant / Wild | 1 Natural Wild, your die | *Requires: Wild.* [Empower 2] on an allied creature. |
| 2 | Pack Surge | Instant / Wild | 1 Natural Wild, your die | [Generate 1 Wild]. [Empower 1]. |
| 2 | Rending Mark | Instant / Wild | 1 Natural Wild, your die | [Strip 2 Shield]. |
| 1 | Snarl | Overload / Wild | 1 Natural Wild, your die | *Natural Wild faces only.* On roll: [Empower 1]. |
| 2 | Dose | Instant / Toxin | 1 Synthetic Toxin, your die | *Requires: Toxin.* [Mark 2 Toxin]. |
| 2 | Blight Strike | Instant / Toxin | 1 Synthetic Toxin, your die | [Empower 1]. [Mark 1 Toxin on attacks]. |
| 3 | Call to Arms | Ritual / Instant / Martial | 1 Natural Martial, your die | *Active when: Martial + Martial.* [Empower 2]. |
| 3 | Battle Hymn | Ritual / Continuous / Martial | 1 Natural Martial, your die | *Active when: Martial + Martial.* On attack: [Empower 1]. |
| 3 | Pack Law | Ritual / Continuous / Wild | 1 Natural Wild, your die | *Active when: Wild + Wild.* On absorb Wild: [Empower 1]. |
| 3 | Virulent Rite | Ritual / Instant / Toxin | 1 Synthetic Toxin, your die | *Active when: Toxin + Toxin.* [Forge 2 Synthetic Toxin] on your die. |
| 2 | Dress Ranks | Instant / Martial | 1 Natural Martial, your die | [Reposition]. |
| 2 | Share the Kill | Instant / Wild | 1 Natural Wild, your die | Move 1 absorbed attribute token from one allied creature to another allied creature. |
| 2 | Den Share | Equipment / Wild | 1 Natural Wild, your die | On absorb Wild, once per turn: copy 1 attribute token from this creature onto another allied creature. |

### Attribute exclusive signatures (authored)

On-pie proving cards for exclusive verbs (spec `015` mill / pack feeding).
Former leaks (Sift, Riposte, …) were moved or rewritten onto the owning
attribute; they are not counted as signature pieces unless they now print
that verb.

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Consult | Instant / Arcane | 1 Natural Arcane, your die | [Insight 3]. |
| 2 | Bury the Name | Instant / Darkness | 1 Synthetic Darkness, your die | Opponent [Mill 3]. |
| 2 | Grave Whisper | Equipment / Darkness | 1 Synthetic Darkness, your die | *Arcane or Darkness creatures only.* On absorb Darkness, once per turn: opponent [Mill 1]. |

### Control interaction (authored)

Playtest gap-fill for Control (Arcane / Darkness): token strip, ritual destroy,
cheaper tactic negate, ritual-only negate, symbol-taxed Instant negate. Fully
wired. Copies of the earlier package live in builtin Control; Counterglyph is
catalogue-only until deck-designer places it.

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 3 | Siphon Sigil | Instant / Arcane | 1 Natural Arcane, your die | [Drain 2]. |
| 4 | Dispel Circle | Instant / Arcane | 1 Natural Arcane, your die | [Destroy Ritual]. |
| 3 | Seal the Rite | Reaction / Arcane | 1 Synthetic Arcane, your die | [Negate Ritual]. |
| 0 | Counterglyph | Reaction / Arcane | 1 Synthetic Arcane, your die | *Requires: Arcane.* [Negate Instant]. |
| 3 | Fade | Reaction / Darkness | 1 Synthetic Darkness, your die | [Negate]. |

### Control two-color rework (authored)

Builtin Control manabase is **exactly Arcane + Darkness**. These cards close
and generate Darkness without Corruption installs or Toxin ticks. Fully wired.
Printed Energy 3–4 on damage / peel; Gloom Resonance / Umbral Brand at 2.

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 3 | Umbral Bolt | Instant / Darkness | 1 Synthetic Darkness, your die | *Requires: Darkness.* [Strike 3]. |
| 4 | Rift Collapse | Ritual / Instant / Darkness | 1 Synthetic Darkness, your die | *Active when: Arcane + Darkness.* [Strike 4]. |
| 3 | Unmake | Instant / Darkness | 1 Synthetic Darkness, your die | [Destroy Equipment]. |
| 2 | Gloom Resonance | Overload / Darkness | 1 Synthetic Darkness, your die | *Darkness faces only.* On roll: [Generate 1 Darkness]. |
| 2 | Umbral Brand | Equipment / Darkness | 1 Synthetic Darkness, your die | *Arcane or Darkness creatures only.* On absorb Darkness, once per turn: [Strike 1]. |

### Generic utility (authored)

Playtest gap-fill: splashable 2-cost tools. Look-top (Sift / Second Wind) is
Arcane’s exclusive; prevent (Sidestep) is Luminar’s. Shield and own-die reroll
stay shared secondaries. Printed Energy 2 — 1-Energy plays come from discounts
(§34.5). Fully wired. Builtin **Control** runs Consult / Bury the Name /
Grave Whisper for scry+mill and splashes Rethrow / Sidestep / Warding Charm;
**Burn** splashes the survive package. Sift / Second Wind stay Arcane catalogue.
Not on Aggro / Tempo / Combo Mechanical (Hunting Armour is Tempo Luminar).

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Raise Guard | Instant / Martial | 1 Natural Martial, your die | [Mark 2 Shield]. |
| 2 | Sidestep | Reaction / Luminar | 1 Natural Luminar, your die | [Prevent]. |
| 2 | Rethrow | Instant / Arcane | 1 Natural Arcane, your die | [Reroll]. |
| 2 | Sift | Instant / Arcane | 1 Natural Arcane, your die | [Insight 2]. |
| 2 | Second Wind | Instant / Arcane | 1 Natural Arcane, your die | [Gain 1 Energy]. [Insight 1]. |
| 2 | Warding Charm | Equipment / Arcane | 1 Natural Arcane, your die | On absorb, once per turn: [Mark 1 Shield] this creature. |

### Toxin / Corruption continuous burn (authored)

Builtin **Burn** (`BURN_DECK` / `deck-burn`): Toxin ticks + Corruption DoT.
Fully wired. Not on Aggro / Control / Tempo / Combo lists. Great Contamination’s
Active-when is Corruption+Corruption (no Arcane) so Burn does not need a Control
manabase. Latent Corruption is left as an Arcane-engine leftover (deck-designer
brief in `design.md`). Hexbrand / Blight / Canker stay off the Burn face deck.

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 3 | Slow Burn | Ritual / Continuous / Toxin | 1 Synthetic Toxin, your die | *Active when: Toxin + Toxin.* On start of opponent's turn: [Mark 1 Toxin] the enemy with the most damage. |
| 3 | Venom Font | Equipment / Toxin | 1 Synthetic Toxin, your die | On absorb Toxin: [Mark 1 Toxin]. |
| 3 | Concentrate | Instant / Toxin | 1 Synthetic Toxin, your die | *Requires: Toxin.* [Mark 2 Toxin] a chosen enemy that already has Toxin. |
| 2 | Ichor Sheath | Overload / Toxin | 1 Synthetic Toxin, your die | *Toxin faces only.* On absorb: [Strike 1]. |
| 3 | Fester | Equipment / Toxin | 1 Synthetic Toxin, your die | On toxin damage: [Mark 1 Toxin] the opposing creature that took that damage. |
| 3 | Smolder | Ritual / Continuous / Corruption | 1 Synthetic Corruption, your die | *Active when: Corruption + Corruption.* On start of opponent's turn: [Strike 1] the enemy with the most damage. |
| 3 | Cinder Hex | Equipment / Corruption | 1 Synthetic Corruption, **the opponent's die** | *May be equipped to an opposing creature.* On start of turn: [Strike 1] this creature. |
| 2 | Ember Tide | Overload / Corruption | 1 Synthetic Corruption, your die | *Corruption faces only.* On roll: [Strike 1]. On absorb: [Mark 1 Toxin]. |

## What this slice implements

The grammar in full, and the subset of the effect vocabulary the engine can
already express.

| In | Out, and why |
|---|---|
| Card model: name, cost (fixed or `?` / variable), type, subtypes, attribute, forge region, requirements, effect, equipment, English `rulesText` | — |
| Deck, hand, graveyard, equipment, overload, ritual; opening 5; draw 2 per turn | — (no mulligan) |
| Forging a Natural or Synthetic face onto your own die **or an opponent's**; **draw 1 per face forged** | — |
| Playing an Instant for its effect, paying Energy | Reaction chain `008`; discounts `012` |
| Equipping a card onto a creature; attack-damage bonuses; destroy-equipment; cost discounts | — |
| Overload attachment to a die face; on-roll effects; cleared on forge | Adrenaline / Rethrow reroll `012`; Overcharge skip-next still deferred |
| Ritual place → preparing / ready / exhausted; ACTIVATE_RITUAL | Paradox replay `012` |
| Toxin counters; 1 damage per counter at owner's turn start | Adaptive Toxin strip→damage still deferred |
| `[Requires: …]` attack gate; `[Spend: …]` pile burn; `[Active when: …]` on rituals | Resonance wildcard `012` |
| Deck search (`search-deck` + `RESOLVE_SEARCH`); Living Library | — |
| Mill (`mill-cards`); Bury the Name / Grave Whisper | Spec `015` |
| Pack feeding (`transfer-attribute-tokens` / `copy-attribute-tokens`) | Spec `015` |
| Damage, heal, shield, symbol generation, draw, discard, Energy gain, destroy equipment, apply-toxin, convert, retain-from-effect, GY replay, movers | Stun / empty print — see DEFERRED_CATALOGUE |

Equipment, Overload and Ritual are wired as board regions (main types for
equipment/overload; ritual is main type with subtypes). Remaining catalogue
gaps are stun and empty print — see
[`docs/DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md) and
[`012-deferred-vocabulary.md`](./012-deferred-vocabulary.md).

## UI

`src/ui/cards/TacticCard.tsx` renders the Figma template in English:

```text
Name                                          ⟨cost⟩
(art)
[Type / … / <attribute>]
[Forge] N face [Natural|Synthetic] [Attribute] on your die
or
⟨gate⟩
⟨effect⟩ | None
```

Run `npm run dev` to see the catalogue.
