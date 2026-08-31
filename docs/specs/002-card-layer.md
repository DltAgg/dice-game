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

**Printed 1-token `playCost` is exceptional.** Catalogue cards should generally cost 2+.
The intended 1-token play pattern is cost reduction on a heavier card, not a
band of 1-drops. Niche 1-token costs need a design reason beyond “cheap support.”

Six fields, in the order the layout presents them:

| Field | Where | Notes |
|---|---|---|
| Name | header, left | |
| Play cost | header, right | Pile tokens in `playCost` (`SymbolRequirement`), or `?` = variable (DEFERRED; fixed `playCost` for now) |
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
| Ritual / Instant | Retired from play. Leftover copies still leave for the GY after one activation. Author Instant cards instead. |
| Ritual / Continuous | Stays in play. Standing triggers while ready. Activate (then exhaust) only when print has an activate body. Active-when is a one-time unlock from the owner's pile. |
| Ritual / Reaction | May respond in a reaction window from the field while ready. Stays and exhausts (once per turn) — not GY. |

### Requirement forms

| Form | Meaning | Appears on |
|---|---|---|
| `[Active when: Arcane + Arcane]` | One-time unlock vs the owner’s **attribute pile** (spec `016`). When met, the ritual becomes `ready` and stays ready unless an effect says otherwise. Standing fire while ready does not burn the gate. | Ritual |
| `[Spend: Arcane + Arcane]` | Optional burn from the owner’s attribute pile on `ACTIVATE_RITUAL` (often the same counts as Active-when for strong instants). Continuous standing rituals usually omit Spend. | Ritual |
| `[Requires: Martial + Wild]` | Attack **gate** vs the owner’s attribute pile (must hold; not spent) | Creature attack |
| `[Spend: Martial]` | Burn from the owner’s attribute pile (attack `discards`, instant extra cost, ritual activate) | Attack / Instant / Ritual |
| `[Can only overload a Toxin face]` | Restricts the overload target | Overload |
| `[This card may be equipped to a Martial creature]` | Restricts the equip target | Equipment |
| `Pay 3` (pile tokens) | An extra `[Spend: …]` inside the effect, on top of header `playCost` | Instant |

*Runic Nullification* has `playCost` 2 Arcane in the header, then `[Spend: 2 x
Arcane]` on activate (4 pile tokens total to negate).

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
> 2026-08-20). You win by defeating the **enemy legendary**, not by clearing
> the whole squad. Control attributes (Arcane, Darkness) must convert
> their engine into enough damage to pressure that legendary — expensive,
> delayed, or consume-based is in-identity; hoping 1-damage creature attacks
> close is not. Toxin + Corruption are the **Burn** plan (continuous DoT onto
> the legendary), not Control’s contaminate-the-die manabase.

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

Costs shown as `?` are **variable** pile pay (DEFERRED). Catalogue `?` cards
currently use a fixed `playCost` until variable spend UX ships. Where the frame
name and the printed name disagree, the printed name is used.

> **Catalogue reset (2026-08-29).** `src/server/content/cards/` holds two
> archetype sets: the Mechanical + Luminar **Tempo** catalogue and the
> Arcane + Darkness **Control** catalogue, both below. Every
> `### … deck` / `### … (authored)` table *after* those two names **retired
> print with no catalogue entry** — read those as role/design reference for
> vocabulary decisions, never as a list of live cards.

### Mechanical + Luminar Tempo catalogue (authored)

Tempo **wins by** sequencing pile → forge → pressure on the enemy legendary.
Mechanical rebuilds and discounts **its own** dice; Luminar sustains and buys
tempo back with reaction `[Prevent]`. Every row serves forge or play.

`playCost` is the attribute pile, not generic Energy. All 22 print 2+.

**Mechanical — own-die reconstruction, generation, forge discounts**

| Cost | Name | Type line | Printed play region | Role in Tempo |
|---|---|---|---|---|
| 2 M | Cog Draft | Instant / Mechanical | `[Generate 2 Mechanical]. [Draw 1].` | Opener. Converts a turn into pile + a card. |
| 2 M | Tooling Order | Instant / Mechanical | `[Requires 2 x Mechanical]`. `[Forge 2 Synthetic Mechanical]` on your die. | Pile → die assembly; the main pile sink. |
| 2 M | Shim Kit | Instant / Mechanical | `[Discount 2]` forge. | One-shot discount that turns a forge into a tempo turn. |
| 3 M | Quickset Jig | Equipment / Mechanical | On roll Mechanical: `[Discount 1]` forge. | Standing discount engine — rolls, not pile. |
| 2 M | Die Punch | Instant / Mechanical | `[Requires 1 x Mechanical]`. `[Stamp]`. | Own-die reconstruction: reapply your die modifiers. |
| 2 M | Recast | Instant / Mechanical | `[Requires 1 x Mechanical]`. `[Reforge]` a Synthetic Mechanical face. | Swaps a stale synthetic without a fresh forge. |
| 2 M | Twin Cam | Instant / Mechanical | `[Requires 2 x Mechanical]`. `[Double]`. | Payoff for a stacked die: next face effect twice. |
| 2 M | Idler Gear | Overload / Mechanical | Mechanical face only. On roll: `[Generate 1 Mechanical]`. `[Generate 1 Luminar]`. | The two-color bridge welded to the die — Mechanical face, Luminar payout. |
| 2 M | Pawl Spring | Overload / Mechanical | Mechanical face only. On absorb, once per turn: `[Discount 1]` forge. | The absorb-vs-pool tension. Its natural forge paints the Mechanical face it can later overload. |
| 2 M | Driveshaft Rig | Equipment / Mechanical | On absorb Mechanical (`ally`), once per turn: `[Generate 1 Mechanical]`. | Standing pile growth off your own banking. |
| 3 M | Machine Shop | Ritual / Continuous / Mechanical | `[Active when: 2 x Mechanical]`. On roll Mechanical: `[Generate 1 Mechanical]`. | The engine's compounding loop while the pile holds. **Forge region installs two** synthetic Mechanical faces — the workshop either runs or gets scrapped for parts. |
| 3 M | Tempering Line | Ritual / Continuous / Mechanical | `[Active when: 2 x Mechanical]`. `[Spend: 2 x Mechanical]`. `[Forge 2 Synthetic Mechanical]`. `[Discount 1]` forge. | Construction engine: recurring Forge 2 while the pile holds; Spend 2 each activate. |

**Luminar — heal, `[Mark N Shield]`, reaction `[Prevent]` only**

| Cost | Name | Type line | Printed play region | Role in Tempo |
|---|---|---|---|---|
| 2 L | Glint Veil | Reaction / Luminar | `[Prevent 1]` on the waiting attack. | Cheapest chain answer; buys a turn of assembly. |
| 3 L | Lantern Oath | Reaction / Luminar | `[Prevent 2]`. On prevent damage: `[Draw 1]`. | Prevent that refuels — reaction-exclusive `[Prevent]`. |
| 3 L | Mirrorward | Reaction / Luminar | `[Prevent]` the waiting attack; `[Strike]` the attacker for the damage prevented. | Turns the opponent's swing into pressure. |
| 2 L + 1 M | Mending Light | Instant / Luminar | `[Heal 2]` on your most damaged creature. `[Discount 1]` forge. | The two-color bridge. Both halves of the cost are spent on payoff both halves want: the Luminar body sustains, the Mechanical pip buys the next install. Not a converter. |
| 3 L | Bright Cadence | Instant / Luminar | `[Mark 2 Shield]` on an allied creature you choose. `[Empower 1]`. | Proactive Luminar — shields, never `[Prevent]`. |
| 2 L | Prism Mantle | Equipment / Luminar | On take damage, once per turn: reduce it by 1. | Makes the legendary hard to race without printing Prevent. |
| 2 L + 1 M | Beacon Array | Equipment / Luminar | On absorb Luminar **or Shield** (`ally`), once per turn: `[Heal 1]`. | The only card that pays off a Shield absorb, so opening Shield faces stop being dead sustain. |
| 2 L | Choirlight | Overload / Luminar | Luminar face only. On roll: `[Heal 1]`. | Sustain welded to a face the deck already rolls. |
| 3 L | Radiant Accord | Ritual / Continuous / Luminar | `[Active when: 1 x Luminar, 1 x Mechanical]`. On absorb Luminar (`ally`), once per turn: `[Mark 1 Shield]`. | Two-color gate; standing Shield while the pile holds. |
| 3 L | Daybreak Rite | Ritual / Continuous / Luminar | `[Active when: 2 x Luminar]`. `[Spend: 2 x Luminar]`. `[Heal 2]` on each allied frontline creature. | Named Rite: Luminar sustain engine, not a one-shot stabilize. Spend 2 each activate. |

Faces (spec `004`) and the Tempo squad (spec `003`) carry the same split:
Mechanical faces bank and rebuild, Luminar faces shield and sustain.

### Arcane + Darkness Control catalogue (authored)

Control **wins by** stretching the game with deck manipulation, negates, and
ritual/equipment removal, then converting that long engine into **lethal
damage on the enemy legendary** — Pall of Ash, Sable Tithe, Lightless Verdict,
Riftmark, Sigil Flare ticks, and Duskthrone Oracle's `[Drain]`. It is not
creature beatdown and it is not a damage-free prison: the closers are the plan.

Arcane owns **`[Insight]` / `[Search]`** (deck top and deck dig), the negates,
ritual destroy, and cost reduction on its own Instants. Darkness owns
**`[Mill]`**, graveyard recursion (`[Recall]` / replay), discard-for-fuel, and
the drain/strike closers. No Corruption opponent-die, no Luminar `[Prevent]`,
no Toxin markers, no Martial `[Swap]`, no Wild `[Frenzy]`, and Mechanical
`[Stamp]` / `[Reforge]` stay out.

`playCost` is the attribute pile, not generic Energy. All 22 print 2+.

**Arcane — deck-top manipulation, negates, ritual answers, discounts**

| Cost | Name | Type line | Printed play region | Role in Control |
|---|---|---|---|---|
| 2 A | Thread the Weave | Instant / Arcane | `[Insight 2].` | Cheapest dig; sets up the closer you need. Its **synthetic** forge is the other half of the choice — dig now or install a named Arcane face. |
| 2 A | Oracle's Margin | Instant / Arcane | `[Insight 1]. [Discount 1]` forge. | Filter the top and cheapen the next install. Card advantage stays on Gloomdraft; this one converts information into engine. |
| 3 A | Glyph of Refusal | Reaction / Arcane | `[Negate].` | The catch-all answer; taxes their best turn. |
| 2 A | Sealbind Rune | Reaction / Arcane | `[Negate Ritual].` | Narrow, cheap answer to ritual engines. |
| 3 A | Unwrite | Instant / Arcane | `[Destroy Ritual]` your opponent controls. | Cleans up a ritual that already landed. |
| 3 A | Riftmark | Instant / Arcane | `[Spend: Arcane]`. `[Drain 2].` | Arcane's closer: reach plus sustain in one card. |
| 3 A | Scholar's Lien | Equipment / Arcane | `[Discount 1]` on the first Arcane Instant you play each turn. | Makes the answer suite cheap enough to hold up. |
| 2 A | Runewatch Lens | Overload / Arcane | Arcane face only. On roll: `[Generate 1 Arcane]`. On absorb, once per turn: `[Insight 1]`. | Both halves live — the absorb-vs-pool decision on a face you already roll. |
| 3 A | Archivist's Summons | Ritual / Continuous / Arcane | `[Active when: 2 x Arcane]`. `[Spend: 2 x Arcane]`. `[Search 2]` Instant or Ritual cards. | Control tutor engine: recurring search while you hold the pile. Spend 2 each activate. |
| 3 A | Foresight Tithe | Ritual / Continuous / Arcane | `[Active when: 2 x Arcane]`. On roll Arcane: `[Insight 1]`. | Compounding selection while the pile holds. |
| 2 A | Warded Annals | Equipment / Arcane | On absorb Arcane, once per turn: `[Mark 1 Shield]` on this creature. | Keeps the legendary alive without printing `[Prevent]`. |

**Darkness — `[Mill]`, graveyard recursion, discard fuel, closers**

| Cost | Name | Type line | Printed play region | Role in Control |
|---|---|---|---|---|
| 2 D | Hollow Tide | Instant / Darkness | Your opponent `[Mill 3]`. | The mill clock and Darkness's cheapest play. |
| 2 D | Gloomdraft | Instant / Darkness | `[Draw 2]. [Discard 1].` | Card flow that also feeds Nightmarrow Pact. |
| 3 D | Pall of Ash | Instant / Darkness | `[Spend: Darkness]`. `[Strike 3].` | The clean burn on the enemy legendary. |
| 3 D | Sable Tithe | Instant / Darkness | Your opponent `[Mill 2]`. `[Strike 2]`. | Splits the two clocks onto one card. |
| 3 D | Swallowed Whole | Reaction / Darkness | `[Negate]`. Your opponent `[Mill 2]`. | Darkness's answer — it advances the mill plan too. |
| 2 D | Cinerary Locket | Equipment / Darkness | Arcane or Darkness creatures only. On absorb Darkness, once per turn: your opponent `[Mill 2]`. | Standing mill off your own banking. |
| 2 D | Nightglass Rune | Overload / Darkness | Darkness face only. On roll: `[Generate 1 Darkness]`. On absorb, once per turn: your opponent `[Mill 1]`. | Cheap recurring fuel with a mill tick attached. |
| 3 D | Graven Summons | Ritual / Continuous / Darkness | `[Active when: Arcane + Darkness]`. `[Spend: 2 x Darkness]`. `[Recall 2]`. | Darkness recursion engine; Spend 2 each activate. |
| 3 D | Echo of the Buried | Instant / Darkness | Choose an Instant or Ritual card in your graveyard and resolve its effect, ignoring its costs. It stays in your graveyard. | Paradox-style one-shot. Recurring free replay is broken. |
| 3 D | Nightmarrow Pact | Ritual / Continuous / Darkness | `[Active when: Arcane + Darkness]`. On discard: `[Generate 1 Darkness]`. | Converts every discard into pile fuel. |
| 4 D | Lightless Verdict | Instant / Darkness | `[Requires: Arcane]`. `[Strike 4].` | The top-end closer — dump it from hand for the kill. Recurring Strike 4 is warped. **Forge region installs two** synthetic Darkness faces, so an early copy is engine instead of a dead finisher. |

Faces (spec `004`) and the Control squad (spec `003`) carry the same split:
Arcane faces see and chip, Darkness faces mill and buy back.
`src/server/reducer/controlPackage.test.ts` covers the wiring.

### Generic reach (authored)

Two cards **both** builtins maindeck. The test is mechanical, not vibes:

- **no header `playCost`** — you never need a pile colour to play them;
- **no attribute-exclusive verb** (no `[Insight]`, `[Mill]`, `[Prevent]`,
  `[Reforge]`, `[Stamp]`, `[Double]`) and **no `[Spend] X → [Generate] Y`**
  conversion pretending to be splashable;
- they still **touch dice** — a reroll and a Shield mark.

Their `attribute` is **forge paint only**: forging paints that attribute onto
your die, which is the dice-native splash. It is not a ninth colourless
attribute, and each builtin gets one on-colour paint and one off-colour paint.
An empty header cost is the generic-reach tool, so the play region stays
modest — 1-pip `playCost` remains exceptional and is not the answer here.

| Cost | Name | Type line | Printed play region | Why both lists run it |
|---|---|---|---|---|
| — | Rethrow | Instant / Mechanical | `[Reroll]` one of your rolled dice. | The die is the protagonist and a bad roll is the worst turn in the game. Forge paint is Mechanical, so Tempo also gets a free natural install. |
| — | Ward Chit | Instant / Arcane | `[Mark 1 Shield]` on an allied creature you choose. | Free interaction with the Shield token every deck already absorbs. Forge paint is Arcane, so Control also gets a free natural install. |

`[Reroll]` and Mark/Strip of **Shield** are shared vocabulary in
`docs/KEYWORDS.md` — neither is an attribute exclusive.

### Aggro deck

Builtin **Aggro** (`PROTOTYPE_*`) is **Martial / Wild only** — same two-color
engine paradigm as Control = Arcane / Darkness. **Wins by** converting dice
into immediate pressure on the **enemy legendary** (frontline peel,
`[Reposition]` / Command lane control, Blade Rain reach, burst Strike) while
Dress Ranks / Wild Carapace keep Ironhoof Warlord alive — not by clearing the
whole opposing squad. Catalogue rows below still include historical Toxin /
splash print for reference; those Toxin cards are **not** on the Aggro builtin
(they live on Burn / Combo).

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Runic Nullification | Ritual / Reaction / Arcane | 1 Synthetic Arcane, your die | *[Active when: 2 x Arcane]. [Spend: 2 x Arcane]. [Negate Instant].* |
| 4 | Arcane Echo | Instant / Mechanical | 1 Synthetic Mechanical, your die | [Stamp]. |
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
| 3 | Serrated Stinger | Ritual / Continuous / Toxin | 1 Synthetic Toxin, your die | *Active when: Wild + Toxin.* On special attack: [Mark 1 Toxin]. |
| 3 | War Banner | Equipment / Wild | 1 Natural Wild, your die | On basic attack, allied creature to the left: +1 damage. |
| 3 | Alpha's Hide | Equipment / Wild | 1 Natural Wild, your die | On special attack: [Generate 1 Wild] on another card. |
| 3 | Toxic Heart | Equipment / Toxin | 1 Synthetic Toxin, your die | On toxin damage: [Heal 1] this creature. |
| 2 | Hunter's Collar | Equipment / Wild | 1 Natural Wild, your die | On absorb Wild: [Generate 1 Martial]. |
| 4 | Insignia of Command | Equipment / Martial | 1 Natural Martial, your die | *Martial creatures only.* On attack, once per turn: another ally may [Reposition]. |
| 2 | War Axe | Equipment / Martial | 1 Natural Martial, your die | On basic attack: +1 damage. |
| 2 | Hunting Armour | Equipment / Luminar | 1 Natural Luminar, your die | On take damage, once per turn: reduce it by 1. |
| 2 | Twin Blades | Equipment / Martial | 1 Natural Martial, your die | On basic attack: [Strip 1 Shield]. |
| 2 | Wild Carapace | Equipment / Wild | 1 Natural Wild, your die | On absorb Wild: [Heal 1] this creature. |

### Control deck

Figma print mixed Arcane / Corruption / Darkness. **Builtin Control** is now
**Arcane / Darkness only** (no Corruption contaminate, no Luminar attack costs).
**Wins by** converting a long engine + disruption into lethal damage on the
**enemy legendary** — **Umbral Bolt**, **Rift Collapse**, **Umbral Brand**,
**Siphon Sigil**, and **Runeflare** / **Sacrifice** / **Nightwell** — while
**Warding Charm** and Fade / Seal protect Nightvault Sovereign. Not “clear the
squad,” and not “no damage.” Corruption rows below remain catalogue identity
for other strategies (burn sibling), not the Control builtin.

Live replacements of this table’s Ritual Instant tutors: Archivist's Summons is Ritual / Continuous; Echo of the Buried (Paradox) is Instant / Darkness; Tempering Line (Assembly Line) is Ritual / Continuous.

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 3 | Great Contamination | Ritual / Instant / Corruption | 1 Synthetic Corruption, your die | *Active when: Corruption + Corruption.* [Forge 3 Synthetic Corruption] on one of the opponent's dice. |
| 4 | Extermination | Ritual / Instant / Corruption | 1 Synthetic Corruption, your die | *Active when: Corruption + Corruption + Corruption.* Consume every Synthetic Corruption face from one die of one player and deal twice the number consumed as damage, split across up to 2 creatures. |
| 2 | Living Library | Ritual / Instant / Arcane | 1 Synthetic Arcane, your die | *Active when: Arcane + Arcane.* [Search 2] Instant or Ritual cards. |
| 3 | Paradox | Ritual / Instant / Darkness | 1 Synthetic Darkness, your die | Choose 1 Instant or Ritual card in your graveyard and use its effect immediately, ignoring its requirements. |
| 4 | Eternal Darkness | Ritual / Instant / Darkness | 1 Synthetic Darkness, your die | *Active when: Darkness + Darkness.* [Recall 3]. |
| 2 | Latent Corruption | Overload / Corruption | 1 Synthetic Corruption, your die | *Arcane faces only.* On roll: [Generate 1 Arcane]. |
| 2 | Luminar Prism | Overload / Luminar | 1 Natural Luminar, your die | On roll: [Heal 1]. |
| 1 | Arcane Amplifier | Overload / Arcane | 1 Natural Arcane, your die | *Arcane faces only.* On roll: [Generate 1 Arcane]. |
| 2 | Arcane Resonance | Overload / Arcane | 1 Natural Arcane, your die | On roll: [Generate 1 Arcane]. |
| 3 | Calculated Sacrifice | Instant / Corruption | 1 Synthetic Corruption, your die | [Destroy Equipment]. |
| 2 | Eclipse | Instant / Darkness | 1 Synthetic Darkness, your die | [Draw 2]. [Discard 1]. |
| 3 | Collapse of Reality | Instant / Arcane | 1 Natural Arcane, your die | [Convert 2]. |
| 3 | Dark Pact | Instant / Darkness | 1 Synthetic Darkness, your die | [Mill 2] Rituals of different attributes. |
| 4 | Mind Control | Instant / Corruption | 1 Synthetic Corruption, your die | Choose one: remove every Overload from 1 opposing face; or remove 1 Overload from up to 2 opposing faces. |
| 3 | Arcane Silence | Reaction / Arcane | 2 Synthetic Arcane, your die | [Negate]. |
| 2 | Persistent Infection | Overload / Corruption | 1 Synthetic Corruption, your die | *Corruption faces only.* On roll: [Generate 1 Corruption]. |
| 2 | Blade of Serene Light | Equipment / Luminar | 1 Natural Luminar, your die | On deal damage: [Heal 1] on an allied creature. |
| 2 | Black Plague | Equipment / Corruption | 1 Synthetic Corruption, **the opponent's die** | *May be equipped to an opposing creature.* On roll Corruption: [Strike 1] this creature. |
| 2 | Archmage's Grimoire | Equipment / Darkness | 1 Synthetic Darkness, your die | *Arcane or Darkness creatures only.* On absorb Arcane or Darkness: [Draw 1]. [Discard 1]. |
| 3 | Tome of Interdiction | Equipment / Arcane | 1 Natural Arcane, your die | The first Instant Arcane used each turn costs 1 less. |
| 2 | Abyssal Sacrifice | Ritual / Continuous / Darkness | 1 Synthetic Darkness, your die | *Active when: Arcane + Darkness.* On discard: [Generate 1 Darkness]. |
| 3 | Mirrored Rune | Equipment / Arcane | 1 Natural Arcane, your die | On absorb Arcane: copy another symbol in your pool. |

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
want absorb; Governor / Die Press want the pool; Spare Cog installs a face). Not
dumped into Aggro / Control; featured in builtin **Tempo** and **Combo
Mechanical** lists. Live replacement of this table’s Ritual Instant Assembly
Line: Tempering Line is Ritual / Continuous.

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Ratchet | Overload / Mechanical | 1 Synthetic Mechanical, your die | *Mechanical faces only.* On absorb: [Generate 1 Mechanical]. |
| 3 | Assembly Line | Ritual / Instant / Mechanical | 1 Synthetic Mechanical, your die | *Active when: Mechanical + Mechanical.* [Forge 2 Synthetic Mechanical] on your die. |
| 2 | Governor | Overload / Mechanical | 1 Synthetic Mechanical, your die | *Mechanical faces only.* On roll: [Generate 1 Mechanical]. |
| 2 | Spare Cog | Instant / Mechanical | 1 Synthetic Mechanical, your die | [Forge 1 Synthetic Mechanical] on your die. |
| 3 | Die Press | Instant / Mechanical | 1 Synthetic Mechanical, your die | *Requires: Mechanical + Mechanical.* [Forge 2 Synthetic Mechanical] on your die. |
| 3 | Foundry | Ritual / Continuous / Mechanical | 1 Synthetic Mechanical, your die | *Active when: Mechanical + Mechanical.* On absorb Mechanical: [Generate 1 Mechanical]. |

### Mechanical combo wave 2 (authored)

Deepens Combo sequencing on the same absorb-vs-pool tension: Transmission /
Servomotor / Foundry lean absorb; Camshaft / Clockwork / Stamp lean roll-pool;
Coupling spends a stacked pool; Blueprint / Safety Latch arm forge discounts;
Recalibrate resets without Arcane negate. Densified in builtin **Combo
Mechanical**; Tempo takes a lighter cut. **Reforge** uses
`replace-synthetic-face` (spec `012`). Safety Latch is a Mechanical reaction
(next-forge discount), not prevent.

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Transmission | Overload / Mechanical | 1 Synthetic Mechanical, your die | *Mechanical faces only.* On absorb: copy another symbol in your pool. |
| 1 | Camshaft | Overload / Mechanical | 1 Synthetic Mechanical, your die | *Mechanical faces only.* On roll: [Discount 1] forge. Niche 1-cost: gated discount enabler, not a generator. |
| 2 | Servomotor | Equipment / Mechanical | 1 Synthetic Mechanical, your die | On absorb Mechanical, once per turn: [Generate 1 Mechanical]. |
| 2 | Safety Latch | Reaction / Mechanical | 1 Synthetic Mechanical, your die | [Discount 2] forge. |
| 2 | Blueprint | Instant / Mechanical | 1 Synthetic Mechanical, your die | [Discount 2] forge. |
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
| 2 | Riposte | Reaction / Martial | 1 Natural Martial, your die | [Empower 2]. |
| 2 | Whetstone | Equipment / Martial | 1 Natural Martial, your die | On attack: [Generate 1 Martial]. |
| 2 | Untamed | Instant / Wild | 1 Natural Wild, your die | [Forge 1 Synthetic Wild] on your die. |
| 2 | Pounce | Instant / Wild | 1 Natural Wild, your die | *Requires: Wild.* [Empower 2] on an allied creature. |
| 2 | Pack Surge | Instant / Wild | 1 Natural Wild, your die | [Empower 2]. |
| 2 | Rending Mark | Instant / Wild | 1 Natural Wild, your die | [Strip 2 Shield]. |
| 1 | Snarl | Overload / Wild | 1 Natural Wild, your die | *Natural Wild faces only.* On roll: [Empower 1]. |
| 2 | Dose | Instant / Toxin | 1 Synthetic Toxin, your die | *Requires: Toxin.* [Mark 2 Toxin]. |
| 2 | Blight Strike | Instant / Toxin | 1 Synthetic Toxin, your die | [Empower 1]. [Mark 1 Toxin on attacks]. |
| 3 | Call to Arms | Ritual / Instant / Martial | 1 Natural Martial, your die | *Active when: Martial + Martial.* [Empower 2]. |
| 3 | Battle Hymn | Ritual / Continuous / Martial | 1 Natural Martial, your die | *Active when: Martial + Martial.* On attack: [Empower 1]. |
| 3 | Pack Law | Ritual / Continuous / Wild | 1 Natural Wild, your die | *Active when: Wild + Wild.* On absorb Wild: [Empower 1]. |
| 3 | Virulent Rite | Ritual / Instant / Toxin | 1 Synthetic Toxin, your die | *Active when: Toxin + Toxin.* [Forge 2 Synthetic Toxin] on your die. |
| 2 | Dress Ranks | Instant / Martial | 1 Natural Martial, your die | [Reposition]. |
| 2 | Share the Kill | Instant / Wild | 1 Natural Wild, your die | [Drain 1]. |
| 2 | Den Share | Equipment / Wild | 1 Natural Wild, your die | On absorb Wild, once per turn: [Empower 1] another allied creature. |

### Attribute exclusive signatures (authored)

On-pie proving cards for exclusive verbs (spec `015` mill; Wild `[Frenzy]`).

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
| 3 | Dispel Circle | Instant / Arcane | 1 Natural Arcane, your die | [Destroy Ritual]. |
| 3 | Seal the Rite | Reaction / Arcane | 1 Synthetic Arcane, your die | [Negate Ritual]. |
| 0 | Counterglyph | Reaction / Arcane | 1 Synthetic Arcane, your die | *Requires: Arcane.* [Negate Instant]. |
| 3 | Fade | Reaction / Darkness | 1 Synthetic Darkness, your die | [Negate]. |

### Control two-color rework (authored)

Builtin Control manabase is **exactly Arcane + Darkness**. These cards close
and generate Darkness without Corruption installs or Toxin ticks. Fully wired.
Printed `playCost` 3–4 on damage / peel; Gloom Resonance / Umbral Brand at 2.

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 3 | Umbral Bolt | Instant / Darkness | 1 Synthetic Darkness, your die | *Requires: Darkness.* [Strike 3]. |
| 3 | Rift Collapse | Ritual / Instant / Darkness | 1 Synthetic Darkness, your die | *Active when: Arcane + Darkness.* [Strike 4]. |
| 3 | Unmake | Instant / Darkness | 1 Synthetic Darkness, your die | [Destroy Equipment]. |
| 2 | Gloom Resonance | Overload / Darkness | 1 Synthetic Darkness, your die | *Darkness faces only.* On roll: [Generate 1 Darkness]. |
| 2 | Umbral Brand | Equipment / Darkness | 1 Synthetic Darkness, your die | *Arcane or Darkness creatures only.* On absorb Darkness, once per turn: [Strike 1]. |

### Generic utility (authored)

Playtest gap-fill: splashable 2-cost tools. Look-top (Sift / Second Wind) is
Arcane’s exclusive; prevent (Sidestep) is Luminar’s. Shield and own-die reroll
stay shared secondaries. Printed `playCost` 2 — 1-token plays come from discounts
(§34.5). Fully wired. Builtin **Control** runs Consult / Bury the Name /
Warding Charm (legendary Shields) and may splash Grave Whisper for mill;
**Burn** uses Toxic Heart / Mutant Spores for survive (not Martial Raise Guard).
Sift / Second Wind stay Arcane catalogue. Not on Aggro (Hunting Armour /
Sidestep are Tempo / Combo Luminar).

| Cost | Name | Type line | Forge | Effect |
|---|---|---|---|---|
| 2 | Raise Guard | Instant / Martial | 1 Natural Martial, your die | [Mark 2 Shield]. |
| 2 | Sidestep | Reaction / Luminar | 1 Natural Luminar, your die | [Prevent]. |
| 2 | Rethrow | Instant / Arcane | 1 Natural Arcane, your die | [Reroll]. |
| 2 | Sift | Instant / Arcane | 1 Natural Arcane, your die | [Insight 2]. |
| 2 | Second Wind | Instant / Arcane | 1 Natural Arcane, your die | [Insight 1]. |
| 2 | Warding Charm | Equipment / Arcane | 1 Natural Arcane, your die | On absorb, once per turn: [Mark 1 Shield] this creature. |

### Toxin / Corruption continuous burn (authored)

Builtin **Burn** (`BURN_DECK` / `deck-burn`): Toxin ticks + Corruption DoT
stacked onto the **enemy legendary** (Slow Burn snowballs the most-damaged
body; Extermination is the consume closer). Fully wired. Not on Aggro /
Control / Tempo / Combo lists. Great Contamination’s Active-when is
Corruption+Corruption (no Arcane) so Burn does not need a Control manabase.
Latent Corruption is left as an Arcane-engine leftover (deck-designer brief in
`design.md`). Hexbrand / Blight / Canker stay off the Burn face deck. Martial
Survive (Raise Guard) is **not** Burn — use Toxic Heart / Mutant Spores.

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
| Playing an Instant for its effect, paying `playCost` / `[Spend]` | Reaction chain `008`; discounts `012` |
| Equipping a card onto a creature; attack-damage bonuses; destroy-equipment; cost discounts | — |
| Overload attachment to a die face; on-roll effects; cleared on forge | Adrenaline / Rethrow reroll `012`; Overcharge skip-next still deferred |
| Ritual place → preparing / ready / exhausted; ACTIVATE_RITUAL | Paradox replay `012` |
| Toxin counters; damage equal to markers at owner's turn end, then clear; soft max 3 | Adaptive Toxin strip→damage wired `013` |
| `[Requires: …]` attack gate; `[Spend: …]` pile burn; `[Active when: …]` on rituals | Resonance wildcard `012` |
| Deck search (`search-deck` + `RESOLVE_SEARCH`); Living Library | — |
| Mill (`mill-cards`); Bury the Name / Grave Whisper | Spec `015` |
| `[Drain]` life transfer; `[Frenzy]` extra attacks | Spec `011` / `016` |
| Damage, heal, shield, symbol generation, draw, discard, destroy equipment, apply-toxin, convert, retain-from-effect, GY replay, movers | Stun / empty print — see DEFERRED_CATALOGUE |

Equipment, Overload and Ritual are wired as board regions (main types for
equipment/overload; ritual is main type with subtypes). Remaining catalogue
gaps are stun and empty print — see
[`docs/DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md) and
[`012-deferred-vocabulary.md`](./012-deferred-vocabulary.md).

## UI

### Attribute bridge cards (authored)

Playtest glue for stranded pile tokens when a dual-attribute creature dies.
Fully wired; deck-designer places homes in builtins where they support the
legendary plan (Aggro Martial↔Wild, Control Arcane↔Darkness, Burn
Toxin↔Corruption). Natural forge of the card’s primary attribute. Pattern:
spend/generate across a pair, dual `playCost`, or standing absorb/deal-damage
generate of the partner.

| Pair | Cards |
|---|---|
| Martial ↔ Wild | Bloodline Pact, Pack Drill, Crosscut, Warpath Harness |
| Arcane ↔ Darkness | Shadow Cipher, Veiled Tome, Umbral Lens |
| Toxin ↔ Corruption | Ichor Exchange, Blight Trade, Seeping Brand |
| Luminar ↔ Arcane / Wild | Prism Conduit, Hunt Beacon |
| Mechanical ↔ Martial / Arcane | Gear Salute, Runic Cog |

### Vanilla baselines (rate anchors)

Reference-only curve anchors — **not** for competitive builtins. Ids
`card-baseline-{attr}-{instant\|reaction\|equipment\|overload\|ritual}-{2\|3\|4}`
(120 hand cards). Each forges 1 Natural of its attribute. Rate sketch: Instant
Strike/Mark scales `cost−1`; Mechanical instant/reaction `[Discount (cost−1)]
forge`; Arcane instant/reaction `[Insight (cost−1)]` (Insight 1 =
`peek-deck-optional-bottom`); Equipment basic-attack bonus `cost−1`; Overload
On roll Generate/Empower (recurring Generate same-attr is fine); Ritual Instant
delayed Strike = cost. Do **not** print same-attr `[Generate]` on
instant/reaction baselines — under pile banking that is a net loss. Attribute
exclusives honored (e.g. Luminar reactions use `[Prevent]`; Toxin uses
`[Mark N Toxin]`).

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
