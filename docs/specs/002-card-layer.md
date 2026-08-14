# 002 — The card layer

Status: **DEFERRED DEPTH** — engine playable subset + English Figma card UI;
remaining catalogue effects parked in [`docs/DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md)
for revisit after M3.

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
│  Tactic Name                      ⟨cost⟩ │   header
│                                          │
│                (art)                     │
│                                          │
│  [Tactic|Ritual / Type / Attribute]      │   text box
│  [Forge] 1 face [Natural or Synthetic]   │
│  [Attribute] on your die                 │
│  or                                      │
│  ⟨effect⟩                                │
└──────────────────────────────────────────┘
```

Six fields, in the order the layout presents them:

| Field | Where | Notes |
|---|---|---|
| Name | header, left | |
| Energy cost | header, right | Integer, or `?` = variable pay-at-least-1 (see OPEN_DESIGN) |
| Type line | text box, first line | `[Tactic \| Ritual / <subtype…> / <attribute>]` — subtypes include Instant, Continuous, Reaction, Equipment, Overload |


| Forge region | text box | how many faces, of which kind and attribute, on which die |
| Requirements | text box, bracketed | optional, and specific to the subtype |
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

### Subtypes

| Subtype | What the effect region does |
| Kind / subtype | Meaning |
|---|---|
| **Tactic** (main type) | Hand card played for effect, equipment, or overload. |
| **Ritual** (main type) | Goes to the field and waits. `[Active when: …]` names the attributes that switch it on. |
| Instant | Resolves once immediately (tactics), or a ritual that leaves for the GY after one activation. Timing: not a reaction window responder by subtype alone. |
| Continuous | Ritual stays in play after activation (exhausts until the owner's next turn). |
| Reaction | May respond in a reaction window (from hand as a tactic, or from the field as a ritual-reaction). Ritual / Reaction leaves for the GY after activation — same fate as Ritual / Instant; the difference is *when* it can be used. |
| Equipment | Attaches to a creature and grants a standing ability. |
| Overload | Attaches to an existing die face and modifies it. |

### Requirement forms

| Form | Meaning | Appears on |
|---|---|---|
| `[Active when: Arcane + Arcane]` | Cumulative gate — absorb matching symbols onto the ritual (one pip per attribute per turn) | Ritual |
| `[Requires: Arcane + Corruption]` | Gate on the effect | Instant |
| `[Can only overload a Toxin face]` | Restricts the overload target | Overload |
| `[This card may be equipped to a Martial creature]` | Restricts the equip target | Equipment |
| `Pay 3 Energy` | An extra cost inside the effect, on top of the header cost | Instant |

That last one matters: *Runic Nullification* costs 2 in its header and then asks
for 3 more Energy in its effect, so the header cost is what it costs to use the
card and an effect may demand more.

### Forge region forms

| Form | Appears on |
|---|---|
| Forge 1 face, Natural, on your die | most |
| Forge 1 face, Synthetic, on your die | most |
| Forge 2 faces, Synthetic, on your die | *Arcane Silence* |
| Forge 1 face, Synthetic, **on the opponent's die** | *Black Plague* |

## Design philosophy, from the file

> All attributes can and should have some way to deal damage, but it should stay
> within their main characteristic. If an attribute's main characteristic is
> sustain, it does not make sense for it to deal massive damage and have sustain
> at the same time.

| Archetype | Attributes |
|---|---|
| Aggro | Wild, Martial, Toxin |
| Combo | Luminar, Wild, Mechanical, Toxin |
| Control | Arcane, Corruption, Darkness |
| Support | Arcane, Luminar, Wild, Mechanical |

> Support faces are not limited to only this, but should have low-cost cards
> that contribute to other builds.

## The catalogue, translated

Costs shown as `?` are **variable**: pay 1 or more Energy (`variableEnergy` in
content). Where the frame name and the printed name disagree, the printed name
is used.

### Aggro deck

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Runic Nullification | Ritual / Reaction / Arcane | 1 Synthetic Arcane, your die | *Active when: Arcane + Arcane.* Pay 3 Energy, negate the effect of 1 Tactic card. |
| 5 | Arcane Echo | Tactic / Instant / Arcane | 1 Synthetic Arcane, your die | Apply the modifiers of one of the dice again. |
| ? | Blessing of the Hunt | Tactic / Overload / Martial | 1 Natural Martial, your die | On roll: generate Martial. |
| ? | Martial Blessing | Tactic / Overload / Martial | 1 Natural Martial, your die | On roll: the next attack this turn deals +1 damage. |
| ? | Toxic Blessing | Tactic / Overload / Toxin | 1 Synthetic Toxin, your die | *Toxin faces only.* On roll: all attacks this turn apply 1 Toxin marker. |
| ? | Mutant Spores | Tactic / Overload / Toxin | 1 Synthetic Toxin, your die | *Toxin faces only.* On absorb: heal 1. |
| ? | Wild Echo | Tactic / Overload / Wild | 1 Natural Wild, your die | *Natural Wild faces only.* On absorb: generate Wild. |
| ? | Adrenaline | Tactic / Overload / Wild | 1 Natural Wild, your die | *Natural Wild faces only.* On roll: once per turn you may reroll this face. If it lands on this face again, deal 1 damage to 2 of your creatures. |
| ? | Rust | Tactic / Overload / Martial | 1 Natural Martial, your die | *Natural Martial faces only.* On absorb: your attacks this turn ignore 2 Shield. |
| 2 | Ritual of Contamination | Tactic / Instant / Corruption | 1 Synthetic Corruption, your die | *Requires: Arcane + Corruption.* Forge 1 Synthetic Corruption face on the opponent's die. |
| 4 | Luminar Judgement | Tactic / Reaction / Luminar | 1 Natural Luminar, your die | On ally would take damage: prevent it; if you do, deal that much to the attacking creature. |
| 2 | Glimmer | Tactic / Reaction / Luminar | 1 Synthetic Luminar, your die | On prevent damage: draw 2 cards. |
| 2 | Predator's Claws | Tactic / Equipment / Wild | 1 Natural Wild, your die | On absorb Wild: this creature may move 1 position. |
| 3 | Venomous Fangs | Tactic / Equipment / Toxin | 1 Synthetic Toxin, your die | On deal damage: apply 1 Toxin marker. |
| 4 | Serrated Stinger | Ritual / Continuous / Toxin | 1 Synthetic Toxin, your die | *Active when: Wild + Toxin.* On special attack: apply 1 Toxin marker. |
| 4 | War Banner | Tactic / Equipment / Wild | 1 Natural Wild, your die | On basic attack, allied creature to the left: deal +1 damage. |
| 4 | Alpha's Hide | Tactic / Equipment / Wild | 1 Natural Wild, your die | On special attack: generate Wild on another card. |
| 5 | Toxic Heart | Tactic / Equipment / Toxin | 1 Synthetic Toxin, your die | On toxin damage: heal 1 on this creature. |
| 3 | Hunter's Collar | Tactic / Equipment / Wild | 1 Natural Wild, your die | On change position: generate Martial. |
| 5 | Insignia of Command | Tactic / Equipment / Wild | 1 Natural Wild, your die | *Martial creatures only.* On attack, once per turn: another ally may reposition. |
| 2 | War Axe | Tactic / Equipment / Martial | 1 Natural Martial, your die | On basic attack: deal +1 damage. |
| 2 | Hunting Armour | Tactic / Equipment / Wild | 1 Natural Wild, your die | On take damage, once per turn: reduce it by 1. |
| 3 | Twin Blades | Tactic / Equipment / Martial | 1 Natural Martial, your die | On basic attack: push the target one position. |
| 3 | Wild Carapace | Tactic / Equipment / Wild | 1 Natural Wild, your die | On absorb Wild: heal 1. |

### Control deck

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 5 | Great Contamination | Ritual / Instant / Corruption | 1 Synthetic Corruption, your die | *Active when: Arcane + Corruption + Corruption.* Forge 3 Synthetic Corruption faces on one of the opponent's dice. |
| 6 | Extermination | Ritual / Instant / Corruption | 1 Synthetic Corruption, your die | *Active when: Corruption + Corruption + Corruption.* Consume every Synthetic Corruption face from one die of one player and deal twice the number consumed as damage, split across up to 2 creatures. |
| 2 | Living Library | Ritual / Instant / Arcane | 1 Synthetic Arcane, your die | *Active when: Arcane + Arcane.* Add 2 Tactic cards from your deck to your hand. |
| 3 | Paradox | Ritual / Instant / Darkness | 1 Synthetic Darkness, your die | Choose 1 Tactic card in your graveyard and use its effect immediately, ignoring its requirements. |
| 5 | Eternal Darkness | Ritual / Instant / Darkness | 1 Synthetic Darkness, your die | *Active when: Darkness + Darkness.* Choose up to 3 cards in your graveyard and return them to your hand. |
| 4 | Latent Corruption | Tactic / Overload / Corruption | 1 Synthetic Corruption, your die | *Arcane faces only.* On roll: generate 1 additional Arcane. |
| 3 | Luminar Prism | Tactic / Overload / Luminar | 1 Natural Luminar, your die | On roll: heal 1. |
| 2 | Arcane Amplifier | Tactic / Overload / Arcane | 1 Natural Arcane, your die | *Arcane faces only.* On roll: generate 1 additional Arcane. |
| 4 | Arcane Resonance | Tactic / Overload / Arcane | 1 Natural Arcane, your die | On roll: generate 1 Arcane. |
| 3 | Calculated Sacrifice | Tactic / Instant / Corruption | 1 Synthetic Corruption, your die | Destroy 1 Equipment on an opposing creature. |
| 3 | Eclipse | Tactic / Instant / Darkness | 1 Synthetic Darkness, your die | Draw 2 cards and discard 1. |
| 4 | Collapse of Reality | Tactic / Instant / Arcane | 1 Natural Arcane, your die | Convert up to two symbols into any other 2 Natural symbols. |
| 4 | Dark Pact | Tactic / Instant / Darkness | 1 Synthetic Darkness, your die | Send 2 Tactic cards of different attributes from your deck to the graveyard. |
| 6 | Mind Control | Tactic / Instant / Corruption | 1 Synthetic Corruption, your die | Choose one: remove every Overload from 1 opposing face; or remove 1 Overload from up to 2 opposing faces. |
| 5 | Arcane Silence | Tactic / Reaction / Arcane | 2 Synthetic Arcane, your die | Negate the effect of 1 Tactic card. |
| 4 | Persistent Infection | Tactic / Overload / Corruption | 1 Synthetic Corruption, your die | *Corruption faces only.* On roll: gain 1 Energy. |
| 2 | Blade of Serene Light | Tactic / Equipment / Luminar | 1 Natural Luminar, your die | On deal damage: heal 1 on an allied creature. |
| 4 | Black Plague | Tactic / Equipment / Corruption | 1 Synthetic Corruption, **the opponent's die** | *May be equipped to an opposing creature.* On roll Corruption: this creature takes 1 damage. |
| 2 | Archmage's Grimoire | Tactic / Equipment / Darkness | 1 Synthetic Darkness, your die | *Arcane or Darkness creatures only.* On absorb Arcane or Darkness: draw 1 card and discard 1. |
| 3 | Tome of Interdiction | Tactic / Equipment / Arcane | 1 Natural Arcane, your die | The first Instant Arcane Tactic used each turn costs 1 less Energy. |
| 3 | Abyssal Sacrifice | Ritual / Continuous / Darkness | 1 Synthetic Darkness, your die | *Active when: Arcane + Darkness.* On discard: generate 1 Darkness. |
| 3 | Mirrored Rune | Tactic / Equipment / Arcane | 1 Natural Arcane, your die | On absorb Arcane: copy another symbol onto it. |

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
want absorb; Governor / Spare Cog / Die Press want the pool). Not in the Figma
Aggro / Control lists; catalogue-only until a combo loadout is requested.

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Ratchet | Tactic / Overload / Mechanical | 1 Synthetic Mechanical, your die | *Mechanical faces only.* On absorb: generate Mechanical. |
| 3 | Assembly Line | Ritual / Instant / Mechanical | 1 Synthetic Mechanical, your die | *Active when: Mechanical + Mechanical.* Forge 2 Synthetic Mechanical faces on your die. |
| 2 | Governor | Tactic / Overload / Mechanical | 1 Synthetic Mechanical, your die | *Mechanical faces only.* On roll: generate Mechanical. |
| 2 | Spare Cog | Tactic / Instant / Mechanical | 1 Synthetic Mechanical, your die | Generate 1 Mechanical. |
| 3 | Die Press | Tactic / Instant / Mechanical | 1 Synthetic Mechanical, your die | *Requires: Mechanical + Mechanical.* Forge 2 Synthetic Mechanical faces on your die. |
| 3 | Foundry | Ritual / Continuous / Mechanical | 1 Synthetic Mechanical, your die | *Active when: Mechanical + Mechanical.* On absorb Mechanical: gain 1 Energy. |

## What this slice implements

The grammar in full, and the subset of the effect vocabulary the engine can
already express.

| In | Out, and why |
|---|---|
| Card model: name, cost (fixed or `?` / variable), type, subtypes, attribute, forge region, requirements, effect, equipment, English `rulesText` | — |
| Deck, hand, graveyard, equipment, overload, ritual; opening 5; draw 1 per turn | — (no mulligan) |
| Forging a Natural or Synthetic face onto your own die **or an opponent's**; **draw 1 per face forged** | — |
| Playing an Instant for its effect, paying Energy | See DEFERRED_CATALOGUE (reaction chain, …) |
| Equipping a card onto a creature; attack-damage bonuses; destroy-equipment | See DEFERRED_CATALOGUE |
| Overload attachment to a die face; on-roll effects; cleared on forge | See DEFERRED_CATALOGUE |
| Ritual place → preparing / ready / exhausted; ACTIVATE_RITUAL | See DEFERRED_CATALOGUE |
| Toxin counters; 1 damage per counter at owner's turn start | See DEFERRED_CATALOGUE |
| `[Requires: …]` gates on an effect; `[Active when: …]` on rituals | See DEFERRED_CATALOGUE |
| Deck search (`search-deck` + `RESOLVE_SEARCH`); Living Library | — |
| Damage, heal, shield, symbol generation, draw, discard, Energy gain, destroy equipment, apply-toxin | See DEFERRED_CATALOGUE |

Equipment, Overload and Ritual are wired as board subtypes. Remaining catalogue
depth (reactions, triggers, unfinished vocabulary) is deferred — see
[`docs/DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md).

## UI

`src/ui/cards/TacticCard.tsx` renders the Figma template in English:

```text
Name                                          ⟨cost⟩
(art)
[Tactic / <subtype…> / <attribute>]
[Forge] N face [Natural|Synthetic] [Attribute] on your die
or
⟨gate⟩
⟨effect⟩ | None
```

Run `npm run dev` to see the catalogue.
