# Design standards (ritual / tactic / face)

Canon: `competitive_dice_game_agent_bible.md` §§19–20, 26–30.
Grammar: `docs/specs/002-card-layer.md`, `004-face-cards.md`.

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
`OPEN_DESIGN.md`). Engine-converted damage — consume, delayed, conditional,
expensive setup — is a valid play-region payoff, and Control **must** have
enough of it to eliminate creatures. A Control list that can only chip with
1-damage attacks is a miss even if its disruption is excellent. Do not avoid
authoring Control damage because “combat is supposed to close.”

The **or** between forge and effect is load-bearing: one use, one region.

## What “good” looks like

- The player is making a **tradeoff** (forge now vs play now; absorb vs leave
  the symbol in the pool; contaminate their die vs build yours).
- The attribute’s **primary identity** is still recognizable (bible §28–29).
- Costs match role: support and combat tricks still want a real Energy
  number (usually 2+); Arcane control generally medium/high. **Printed
  Energy 1 is exceptional** — niche only, so heavier cards stay appealing.
  The primary way to spend 1 Energy on a card is **cost reduction**, not a
  1-cost card. Corruption **install** remains a rare 1-cost exception
  (Ritual of Contamination: Energy 1 + Requires Corruption; Great
  Contamination 3) because the expense is **stay** (cannot-overwrite /
  forge-lock) plus a paid peel, not the header. See `OPEN_DESIGN.md`
  Corruption install tempo. Do not treat that exception as a band for new
  generic 1-drops.
- Opponent-die forges (Corruption, Black Plague, Great Contamination): the
  **controller** names the face from **their** pool and installs it. Ownership
  stays with the forger; the physical face sits on the target die (§12).

## Attribute identities (directional)

| Attribute | Primary identity | Typical home |
|---|---|---|
| Martial | Direct combat / efficient attacks | Aggro |
| Wild | Creature pressure / flexible aggression | Aggro, Combo, Support |
| Toxin | Attrition / delayed damage | Aggro, Combo |
| Luminar | Synergy / support / combo value | Combo, Support |
| Mechanical | Engine construction / manipulation | Combo, Support |
| Arcane | Control / manipulation / support | Control, Support |
| Corruption | Contaminate the opponent’s dice | Control |
| Darkness | Delayed value / disruption | Control |

Do **not** give every attribute large damage, healing, draw, removal, and
disruption. Sustain attributes must not become the best burst; control must not
become efficient **aggro** (cheap fast creature attacks). Control **should**
deal meaningful damage through its engine (rituals, consume, delayed/conditional
hits). That is not the same as becoming Aggro.

Archetypes (002): Aggro = Wild/Martial/Toxin; Combo = Luminar/Wild/Mechanical/Toxin;
Control = Arcane/Corruption/Darkness; Support = Arcane/Luminar/Wild/Mechanical
(utility may splash; printed Energy 1 remains exceptional — splash via
discounts, not 1-drops).

Builtin decks: `PROTOTYPE_DECK` (Aggro), `CONTROL_DECK`, `TEMPO_DECK`, and
`COMBO_MECHANICAL_DECK` in `cards.ts` (snapshots in `src/decks/prototype.ts`).
Do not dump a new card into Aggro and Control without an identity reason; Mech
homes are Tempo / Combo Mechanical. Legal constructed: 50–60 tactics, ≤4 copies
per id; face deck ≤12, ≤3 per attribute.

## Card kinds — when to use which

| Kind | Use for | Play path |
|---|---|---|
| Instant | Burst, conversion, combat trick | `PLAY_CARD` → `effect` → GY |
| Reaction | Window response from hand | Same, only in reaction window |
| Equipment | Standing ability on a creature | Attach; abilities as `StandingTrigger` |
| Overload | Modify an existing face | Attach to face card; `onRoll` / `onAbsorb` |
| Ritual / Instant or Reaction | Delayed, gated engine play | Place `preparing` → absorb Active-when → `ACTIVATE_RITUAL` → GY |
| Ritual / Continuous | Lasting field engine | `standingAbilities` while ready; Activate only if `ritual.effects` is non-empty (then exhaust). Active-when symbols persist unless an effect discards them |
| Face (natural) | Starting identity faces | Dual-kind attrs + Shield only |
| Face (synthetic) | Named specials only | Pool → install; `onRoll` / `onAbsorb`. Never blank `face-synthetic-<attr>` |

Rituals are a **main type** (`type: "ritual"`), not a subtype. Active-when is
cumulative (`Arcane + Corruption + Corruption`), absorbed onto the ritual during
actions — not auto-from the pool.

Current catalogue cards **forge their own attribute**. Dual-kind → typically
`kind: "natural"`; synthetic-only (Toxin, Mechanical, Corruption, Darkness) →
always `kind: "synthetic"`. Overload/equip gates and generated symbols may
still splash (Latent Corruption overloads Arcane; Hunter's Collar generates
Martial). The two fields remain independent in the model if a future card
needs a true forge splash.

## Face-kind policy

- Dual-kind (Martial, Wild, Arcane, Luminar): natural **and** synthetic forges.
  Synthetics are **named specials** (Crush, Warhorn, …), not identity blanks.
- Synthetic-only (Toxin, Mechanical, Corruption, Darkness): **never**
  `kind: "natural"` faces or forge regions. Forge installs a named special
  of that attribute from the pool.
- Shield: `kind: "untyped"` only. Starting-die identity; never forged; not Natural.
- Never author generic identity synthetics (`face-synthetic-martial`,
  `face-synthetic-corruption`, Forged Martial, Synthetic Arcane, …).

## Cost and Energy

Header `energyCost` is paid on **either** forge or play (OPEN_DESIGN assumption).
Rituals pay the header on **place**; `ritual.additionalEnergy` is extra on
activate (Runic Nullification). Instants may use `effect.requires` (symbol gate)
and `effect.additionalEnergy`.

**Default printed cost is 2 or more.** `energyCost: 1` is a last-resort niche
tool, not the cheap-support band. Players should reach a 1-Energy play mainly
through discounts (next-forge, standing cost reduction, on-roll reduction),
which makes medium/high cards worth holding. A 1-cost that is just “the same
effect, cheaper” makes the 3–5s feel unplayable.

Printed `?` is `variableEnergy: true` with minimum `energyCost` — currently many
catalogue `?` cards are temporarily authored as fixed 2 (see `cards.ts` header
comment / OPEN_DESIGN). Do not invent scaling-off-spend effects until that
vocabulary exists. A `?` card’s *minimum* should still follow the 1-cost
caution (prefer minimum 2 unless the card is the rare niche exception).

## Print English

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
- Instant gate: `effect.requires`; UI prints `[Requires: …]`.

## Anti-patterns

- Silent fake effects for unfinished print.
- Unreachable `EffectDefinition` members “for later”.
- Putting opponent-forge choice on the **opponent** (they receive the physical
  face; the activator picks from their pool).
- Natural Corruption / Darkness / Toxin / Mechanical faces.
- Blank/generic synthetics (attribute-named identity faces).
- Every attribute doing everything.
- Rules logic in React / Zustand / PeerJS.
- Growing AST without a concrete card + resolver + tests in the same change.
