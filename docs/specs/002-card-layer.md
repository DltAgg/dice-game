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

Builtin constructed lists (content + `src/decks/prototype.ts`): **Aggro**
(`PROTOTYPE_*` / `deck-prototype`), **Control** (`CONTROL_*` /
`deck-control`), **Tempo** (`TEMPO_*` / `deck-tempo` — Mech+Luminar sequencing),
**Combo Mechanical** (`COMBO_MECHANICAL_*` / `deck-combo-mechanical` — Mech
engine chaining). Do not dump Mech into Aggro/Control without an identity reason.

> Support faces are not limited to only this, but should have low-cost cards
> that contribute to other builds.

## The catalogue, translated

Costs shown as `?` are **variable**: pay 1 or more Energy (`variableEnergy` in
content). Where the frame name and the printed name disagree, the printed name
is used.

### Aggro deck

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Runic Nullification | Ritual / Reaction / Arcane | 1 Synthetic Arcane, your die | *Active when: Arcane + Arcane.* Pay 3 Energy, negate the effect of 1 Instant card. |
| 5 | Arcane Echo | Instant / Arcane | 1 Synthetic Arcane, your die | Apply the modifiers of one of the dice again. |
| ? | Blessing of the Hunt | Overload / Martial | 1 Natural Martial, your die | On roll: generate Martial. |
| ? | Martial Blessing | Overload / Martial | 1 Natural Martial, your die | On roll: the next attack this turn deals +1 damage. |
| ? | Toxic Blessing | Overload / Toxin | 1 Synthetic Toxin, your die | *Toxin faces only.* On roll: all attacks this turn apply 1 Toxin marker. |
| ? | Mutant Spores | Overload / Toxin | 1 Synthetic Toxin, your die | *Toxin faces only.* On absorb: heal 1. |
| ? | Wild Echo | Overload / Wild | 1 Natural Wild, your die | *Natural Wild faces only.* On absorb: generate Wild. |
| ? | Adrenaline | Overload / Wild | 1 Natural Wild, your die | *Natural Wild faces only.* On roll: once per turn you may reroll this face. If it lands on this face again, deal 1 damage to 2 of your creatures. |
| ? | Rust | Overload / Martial | 1 Natural Martial, your die | *Natural Martial faces only.* On absorb: your attacks this turn ignore 2 Shield. |
| 2 | Ritual of Contamination | Instant / Corruption | 1 Synthetic Corruption, your die | *Requires: Arcane + Corruption.* Forge 1 Synthetic Corruption face on the opponent's die. |
| 4 | Luminar Judgement | Reaction / Luminar | 1 Natural Luminar, your die | On ally would take damage: prevent it; if you do, deal that much to the attacking creature. |
| 2 | Glimmer | Reaction / Luminar | 1 Synthetic Luminar, your die | On prevent damage: draw 2 cards. |
| 2 | Predator's Claws | Equipment / Wild | 1 Natural Wild, your die | On absorb Wild: this creature may move 1 position. |
| 3 | Venomous Fangs | Equipment / Toxin | 1 Synthetic Toxin, your die | On deal damage: apply 1 Toxin marker. |
| 4 | Serrated Stinger | Ritual / Continuous / Toxin | 1 Synthetic Toxin, your die | *Active when: Wild + Toxin.* On special attack: apply 1 Toxin marker. |
| 4 | War Banner | Equipment / Wild | 1 Natural Wild, your die | On basic attack, allied creature to the left: deal +1 damage. |
| 4 | Alpha's Hide | Equipment / Wild | 1 Natural Wild, your die | On special attack: generate Wild on another card. |
| 5 | Toxic Heart | Equipment / Toxin | 1 Synthetic Toxin, your die | On toxin damage: heal 1 on this creature. |
| 3 | Hunter's Collar | Equipment / Wild | 1 Natural Wild, your die | On change position: generate 1 Martial. |
| 5 | Insignia of Command | Equipment / Wild | 1 Natural Wild, your die | *Martial creatures only.* On attack, once per turn: another ally may reposition. |
| 2 | War Axe | Equipment / Martial | 1 Natural Martial, your die | On basic attack: deal +1 damage. |
| 2 | Hunting Armour | Equipment / Wild | 1 Natural Wild, your die | On take damage, once per turn: reduce it by 1. |
| 3 | Twin Blades | Equipment / Martial | 1 Natural Martial, your die | On basic attack: remove 1 Shield from the target. |
| 3 | Wild Carapace | Equipment / Wild | 1 Natural Wild, your die | On absorb Wild: heal 1. |

### Control deck

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 5 | Great Contamination | Ritual / Instant / Corruption | 1 Synthetic Corruption, your die | *Active when: Arcane + Corruption + Corruption.* Forge 3 Synthetic Corruption faces on one of the opponent's dice. |
| 6 | Extermination | Ritual / Instant / Corruption | 1 Synthetic Corruption, your die | *Active when: Corruption + Corruption + Corruption.* Consume every Synthetic Corruption face from one die of one player and deal twice the number consumed as damage, split across up to 2 creatures. |
| 2 | Living Library | Ritual / Instant / Arcane | 1 Synthetic Arcane, your die | *Active when: Arcane + Arcane.* Add 2 Instant or Ritual cards from your deck to your hand. |
| 3 | Paradox | Ritual / Instant / Darkness | 1 Synthetic Darkness, your die | Choose 1 Instant or Ritual card in your graveyard and use its effect immediately, ignoring its requirements. |
| 5 | Eternal Darkness | Ritual / Instant / Darkness | 1 Synthetic Darkness, your die | *Active when: Darkness + Darkness.* Choose up to 3 cards in your graveyard and return them to your hand. |
| 4 | Latent Corruption | Overload / Corruption | 1 Synthetic Corruption, your die | *Arcane faces only.* On roll: generate 1 additional Arcane. |
| 3 | Luminar Prism | Overload / Luminar | 1 Natural Luminar, your die | On roll: heal 1. |
| 2 | Arcane Amplifier | Overload / Arcane | 1 Natural Arcane, your die | *Arcane faces only.* On roll: generate 1 additional Arcane. |
| 4 | Arcane Resonance | Overload / Arcane | 1 Natural Arcane, your die | On roll: generate 1 Arcane. |
| 3 | Calculated Sacrifice | Instant / Corruption | 1 Synthetic Corruption, your die | Destroy 1 Equipment on an opposing creature. |
| 3 | Eclipse | Instant / Darkness | 1 Synthetic Darkness, your die | Draw 2 cards and discard 1. |
| 4 | Collapse of Reality | Instant / Arcane | 1 Natural Arcane, your die | Convert up to two symbols into any other 2 Natural symbols. |
| 4 | Dark Pact | Instant / Darkness | 1 Synthetic Darkness, your die | Send 2 Ritual cards of different attributes from your deck to the graveyard. |
| 6 | Mind Control | Instant / Corruption | 1 Synthetic Corruption, your die | Choose one: remove every Overload from 1 opposing face; or remove 1 Overload from up to 2 opposing faces. |
| 5 | Arcane Silence | Reaction / Arcane | 2 Synthetic Arcane, your die | Negate the effect of 1 card. |
| 4 | Persistent Infection | Overload / Corruption | 1 Synthetic Corruption, your die | *Corruption faces only.* On roll: gain 1 Energy. |
| 2 | Blade of Serene Light | Equipment / Luminar | 1 Natural Luminar, your die | On deal damage: heal 1 on an allied creature. |
| 4 | Black Plague | Equipment / Corruption | 1 Synthetic Corruption, **the opponent's die** | *May be equipped to an opposing creature.* On roll Corruption: this creature takes 1 damage. |
| 2 | Archmage's Grimoire | Equipment / Darkness | 1 Synthetic Darkness, your die | *Arcane or Darkness creatures only.* On absorb Arcane or Darkness: draw 1 card and discard 1. |
| 3 | Tome of Interdiction | Equipment / Arcane | 1 Natural Arcane, your die | The first Instant Arcane used each turn costs 1 less Energy. |
| 3 | Abyssal Sacrifice | Ritual / Continuous / Darkness | 1 Synthetic Darkness, your die | *Active when: Arcane + Darkness.* On discard: generate 1 Darkness. |
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
| 2 | Ratchet | Overload / Mechanical | 1 Synthetic Mechanical, your die | *Mechanical faces only.* On absorb: generate Mechanical. |
| 3 | Assembly Line | Ritual / Instant / Mechanical | 1 Synthetic Mechanical, your die | *Active when: Mechanical + Mechanical.* Forge 2 Synthetic Mechanical faces on your die. |
| 2 | Governor | Overload / Mechanical | 1 Synthetic Mechanical, your die | *Mechanical faces only.* On roll: generate Mechanical. |
| 2 | Spare Cog | Instant / Mechanical | 1 Synthetic Mechanical, your die | Generate 1 Mechanical. |
| 3 | Die Press | Instant / Mechanical | 1 Synthetic Mechanical, your die | *Requires: Mechanical + Mechanical.* Forge 2 Synthetic Mechanical faces on your die. |
| 3 | Foundry | Ritual / Continuous / Mechanical | 1 Synthetic Mechanical, your die | *Active when: Mechanical + Mechanical.* On absorb Mechanical: gain 1 Energy. |

### Mechanical combo wave 2 (authored)

Deepens Combo sequencing on the same absorb-vs-pool tension: Transmission /
Servomotor / Foundry lean absorb; Camshaft / Clockwork / Blueprint / Stamp lean
roll-pool; Coupling spends a stacked pool; Safety Latch / Recalibrate protect or
reset without Arcane negate. Densified in builtin **Combo Mechanical**; Tempo
takes a lighter cut. **Reforge** uses `replace-synthetic-face` (spec `012`).

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Transmission | Overload / Mechanical | 1 Synthetic Mechanical, your die | *Mechanical faces only.* On absorb: copy another symbol onto it. |
| 2 | Camshaft | Overload / Mechanical | 1 Synthetic Mechanical, your die | *Mechanical faces only.* On roll: next forge costs 1 less Energy. |
| 2 | Servomotor | Equipment / Mechanical | 1 Synthetic Mechanical, your die | On absorb Mechanical: generate Mechanical. |
| 2 | Safety Latch | Reaction / Mechanical | 1 Synthetic Mechanical, your die | Prevent 1 damage. Generate 1 Mechanical. |
| 2 | Blueprint | Instant / Mechanical | 1 Synthetic Mechanical, your die | Generate 1 Mechanical. Next forge costs 1 less Energy. |
| 3 | Stamp | Instant / Mechanical | 1 Synthetic Mechanical, your die | *Requires: Mechanical.* Reapply one of your dice's face modifiers. |
| 3 | Coupling | Instant / Mechanical | 1 Synthetic Mechanical, your die | *Requires: Mechanical + Mechanical.* Next face effect this turn resolves twice. |
| 3 | Clockwork | Ritual / Continuous / Mechanical | 1 Synthetic Mechanical, your die | *Active when: Mechanical + Mechanical.* On roll Mechanical: generate Mechanical. |
| 3 | Recalibrate | Reaction / Mechanical | 1 Synthetic Mechanical, your die | Return a card that costs 2 or less from your GY to hand. |
| 3 | Reforge | Instant / Mechanical | 1 Synthetic Mechanical, your die | *Requires: Mechanical.* Replace one Synthetic Mechanical face on your die with a different pool face (no forge-draw). |

### Martial / Wild / Toxin aggro package (authored)

Playtest gap-fill for Aggro (Martial / Wild / Toxin). Fully wired on existing
vocabulary. Catalogue-only — not added to builtin decks. Temper / Untamed exist
so named synthetic Martial / Wild specials can be forged (existing Martial /
Wild tactics only forge Natural). Virulent Rite is a two-face Toxin burst;
individual Toxin tactics already forge Synthetic Toxin.

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Temper | Instant / Martial | 1 Natural Martial, your die | Forge 1 Synthetic Martial face on your die. |
| 2 | Opening Cut | Instant / Martial | 1 Natural Martial, your die | *Requires: Martial.* Deal 2 damage to a chosen enemy. |
| 2 | Press the Attack | Instant / Martial | 1 Natural Martial, your die | The next attack this turn deals +2 damage. |
| 2 | Riposte | Reaction / Martial | 1 Natural Martial, your die | Prevent 1 damage. The next attack this turn deals +1 damage. |
| 2 | Whetstone | Equipment / Martial | 1 Natural Martial, your die | On attack: generate 1 Martial. |
| 2 | Untamed | Instant / Wild | 1 Natural Wild, your die | Forge 1 Synthetic Wild face on your die. |
| 2 | Pounce | Instant / Wild | 1 Natural Wild, your die | *Requires: Wild.* Choose an allied creature. Its next attack deals +2 damage. |
| 2 | Pack Surge | Instant / Wild | 1 Natural Wild, your die | Generate 1 Wild. The next attack this turn deals +1 damage. |
| 2 | Rending Mark | Instant / Wild | 1 Natural Wild, your die | A chosen enemy creature loses 2 Shield. |
| 2 | Snarl | Overload / Wild | 1 Natural Wild, your die | *Natural Wild faces only.* On roll: the next attack this turn deals +1 damage. |
| 2 | Dose | Instant / Toxin | 1 Synthetic Toxin, your die | *Requires: Toxin.* Apply 2 Toxin markers to a chosen enemy. |
| 2 | Blight Strike | Instant / Toxin | 1 Synthetic Toxin, your die | The next attack this turn deals +1 damage. All attacks this turn apply 1 Toxin marker. |
| 3 | Call to Arms | Ritual / Instant / Martial | 1 Natural Martial, your die | *Active when: Martial + Martial.* The next attack this turn deals +2 damage. |
| 3 | Battle Hymn | Ritual / Continuous / Martial | 1 Natural Martial, your die | *Active when: Martial + Martial.* On attack: the next attack this turn deals +1 damage. |
| 3 | Pack Law | Ritual / Continuous / Wild | 1 Natural Wild, your die | *Active when: Wild + Wild.* On absorb Wild: the next attack this turn deals +1 damage. |
| 3 | Virulent Rite | Ritual / Instant / Toxin | 1 Synthetic Toxin, your die | *Active when: Toxin + Toxin.* Forge 2 Synthetic Toxin faces on your die. |

### Control interaction (authored)

Playtest gap-fill for Control (Arcane / Corruption / Darkness): token strip,
ritual destroy, cheaper tactic negate, ritual-only negate. Fully wired.
Catalogue-only until deck-designer adds copies to builtin control lists.

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 3 | Siphon Sigil | Instant / Arcane | 1 Natural Arcane, your die | A chosen enemy creature discards 2 attribute tokens. |
| 4 | Dispel Circle | Instant / Arcane | 1 Natural Arcane, your die | Send 1 opposing Ritual to its owner's graveyard. |
| 3 | Seal the Rite | Reaction / Arcane | 1 Synthetic Arcane, your die | Negate 1 Ritual. |
| 3 | Fade | Reaction / Darkness | 1 Synthetic Darkness, your die | Negate the effect of 1 card. |

## What this slice implements

The grammar in full, and the subset of the effect vocabulary the engine can
already express.

| In | Out, and why |
|---|---|
| Card model: name, cost (fixed or `?` / variable), type, subtypes, attribute, forge region, requirements, effect, equipment, English `rulesText` | — |
| Deck, hand, graveyard, equipment, overload, ritual; opening 5; draw 1 per turn | — (no mulligan) |
| Forging a Natural or Synthetic face onto your own die **or an opponent's**; **draw 1 per face forged** | — |
| Playing an Instant for its effect, paying Energy | Reaction chain `008`; discounts `012` |
| Equipping a card onto a creature; attack-damage bonuses; destroy-equipment; cost discounts | — |
| Overload attachment to a die face; on-roll effects; cleared on forge | Adrenaline reroll `012`; Overcharge skip-next still deferred |
| Ritual place → preparing / ready / exhausted; ACTIVATE_RITUAL | Paradox replay `012` |
| Toxin counters; 1 damage per counter at owner's turn start | Adaptive Toxin strip→damage still deferred |
| `[Requires: …]` gates on an effect; `[Active when: …]` on rituals | Resonance wildcard `012` |
| Deck search (`search-deck` + `RESOLVE_SEARCH`); Living Library | — |
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
