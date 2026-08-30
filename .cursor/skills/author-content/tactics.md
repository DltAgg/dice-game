# Tactic and ritual cards

File: `src/server/content/cards/<card-id>.json` (add the id constant in `cards.ts`)  
Grammar: `docs/specs/002-card-layer.md`  
Design: [design.md](design.md) · craft: [design-craft.md](design-craft.md)

**Audit live JSON first.** Do not clone the last hand card’s `forge.faces: 1`
sticker. `faces` (1, 2, rarely 3) and natural vs synthetic are designed
choices. Play-region `[Forge 2]` (Tempering Line, Tooling Order) does **not**
occupy a Forge-2 **region** slot.

## Shape

Every hand card has a forge region. Play uses **at most one** of: `effect`,
`equipment`, `overload`, `ritual` (`playCard` in `reduce.ts`).

```ts
export const EXAMPLE: CardId = asCardId("card-example");

card({
  id: EXAMPLE,
  name: "Example",
  playCost: { arcane: 2 }, // 1-token is exceptional; prefer 2+ of the card's attribute
  type: "instant", // "reaction" | "equipment" | "overload" | "ritual"
  subtypes: [], // ritual only: "instant" | "continuous" | "reaction"
  attribute: "arcane",
  forge: {
    faces: 1, // designed: 1, 2, rarely 3 — never an unexamined default
    kind: "synthetic", // or "natural" — pick with a reason (design-craft.md)
    attribute: "arcane", // match card.attribute unless a future splash forge is explicit
    target: "own-die", // or "opponent-die"
  },
  // forgeTags?: ["echo"]
  rulesText: "Draw 1 card.",
  effect: { effects: [{ type: "draw-cards", amount: 1 }] },
}),
```

Print is the **holder’s** voice: `you` is the player whose field this card
is on; `opponent` is *their* opponent. A card given, forged, or equipped to
the other player does not keep the sender’s pronouns. Header `playCost`
totaling **1 pile token** is exceptional — prefer 2+ and let `[Discount]`
create cheaper plays.

Forge-region count is independent of play-region `[Forge N]`. Example of a
**designed** two-face forge region (slot, not a card to copy):

```ts
forge: { faces: 2, kind: "natural", attribute: "martial", target: "own-die" },
```

## Region mapping

| Print | Structured field |
|---|---|
| Instant one-shot | `type: "instant"` + `effect: { requires?, effects }` |
| Reaction from hand | `type: "reaction"` + `effect: …` |
| Equipment | `type: "equipment"` + `equipment: { mayTargetOpponent, creatureAttributes?, abilities }` |
| Overload | `type: "overload"` + `overload: { faceSymbols?, faceKinds?, onRoll, onAbsorb? }` |
| Ritual | `type: "ritual"` + subtypes `instant` / `reaction` / `continuous` + `ritual: { … }` |
| Forge only (“None”) | `rulesText: ""`, no playable region |

Attachment **types** (`equipment` / `overload`) **must** match regions
(`cards.consistency.test.ts`). Rituals must have a `ritual` region if
`type === "ritual"`. Empty `abilities` / `effects` is OK only when place/attach
should work and the clause is deferred.

## Ritual template

```ts
card({
  id: EXAMPLE_RITUAL,
  name: "Example Ritual",
  playCost: { corruption: 3, arcane: 2 },
  type: "ritual",
  subtypes: ["instant"], // or "reaction" | "continuous"
  attribute: "corruption",
  forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
  // Print "Synthetic Corruption" = kind+attribute, not a card named Synthetic Corruption.
  // faces: 1 here is still a choice; do not copy it as the only ritual forge.
  rulesText: "Forge 3 synthetic Corruption faces on one of the opponent's dice.",
  ritual: {
    activeWhen: { arcane: 1, corruption: 2 }, // omit if print has no Active when
    // spend?: { arcane: 1, corruption: 2 }, // pile burn on activate (often = gate)
    effects: [
      {
        type: "forge-faces",
        faces: 3,
        kind: "synthetic",
        attribute: "corruption",
        target: "opponent-die",
      },
    ],
    // standingAbilities?: [ … ] // continuous only, while ready
  },
}),
```

- Place from hand (`PLAY_CARD`) → `preparing`. Ready when the owner’s
  **attribute pile** meets `activeWhen` (refreshed on any pile change), or
  immediately if no `activeWhen`.
- Instant / reaction: activate → optional `spend` burn → effects → GY.
- Continuous: standing triggers while `ready`. Activate only when
  `ritual.effects` is non-empty (then exhaust until the owner's next turn).
  Readiness is re-checked against the pile each turn; standing fire does not
  spend Active-when / Spend.
- Ready rituals may activate in any phase **except roll** (and in reaction
  windows if subtype includes `reaction`).

`forge-faces`: the **controller** picks a matching **named special** from
**their** pool (or an owned installed copy) and the die/slots. Same install
rules as `FORGE_CARD` (attribute cap, copy rule, draw 1 per face). Header
`playCost` already paid on place; activate may also burn `ritual.spend`.

Print like “Forge 3 synthetic Corruption faces” means **any Corruption named
special** in the pool (`kind: "synthetic"`, `symbol: "corruption"`: Canker,
Blight, Hexbrand, …). There is no catalogue card named Synthetic Corruption /
Forged Martial / etc. Same reading for Synthetic Toxin, Mechanical, Darkness,
Martial, Wild, Arcane, Luminar.

## Existing effects (prefer these)

Print those effects with [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md)
(`[Mark N Toxin]` not “apply N Toxin markers”). Engine members:

Read `src/server/model/effects.ts` as authority. Today:

`damage`, `heal`, `grant-shield`, `generate-symbol`, `draw-cards`, `discard-cards`,
`search-deck`, `search-graveyard`, `arm-forge-discount`, `destroy-equipment`,
`apply-toxin`, `remove-shield`, `next-attack-bonus`, `grant-next-attack-bonus`,
`arm-attack-toxin`, `negate-card`, `negate-ritual`,
`destroy-ritual`, `grant-damage-prevent`,
`prevent-attack-reflect`, `arm-prevent-draw`, `forge-faces`,
`mill-cards`, `grant-extra-attack` (`[Frenzy]`), `drain-life`

Targets: `source-creature`, `declared-target`, `most-damaged-ally`,
`most-damaged-enemy`, `most-shielded-enemy`, `choose-ally`, `choose-enemy`, `choose-opponent-ritual`,
`declared-ritual`, `chain-attack-target`

Standing triggers live on equipment / continuous rituals — see
[implement-hooks](../implement-hooks/SKILL.md).

## In-repo patterns to copy

**Live JSON only** (`src/server/content/cards/`). Spec `002` tables of missing
cards (Bloodline Pact, Ichor Exchange, Eclipse, …) are not copy sources.
`[Spend] X, [Generate] Y` glue is an anti-pattern ([design-craft.md](design-craft.md)).

| Card | Why |
|---|---|
| Thread the Weave | Instant exclusive verb (`[Insight]`) |
| Recast | Play-region `[Reforge]` (Mechanical exclusive) — forge region still 1; do not treat as occupying extra-forge-region |
| Tooling Order | Play-region `[Forge 2]` — **not** `forge.faces: 2` |
| Tempering Line | Ritual play-region Forge 2 + Discount |
| Shim Kit | `[Discount]` payoff |
| Beacon Array | Dual `playCost` (Luminar+Mechanical) — unfinished as a bridge if the effect ignores the second color |
| Nightglass Rune | Overload On roll + mill |
| Machine Shop | Equipment `on-roll-symbol` |

Do not copy Cogtooth-shaped Generate-same-attr, or any live card’s forge
sticker, as the new card’s entire identity.

## After editing

- Export the `CardId` const and add the definition to the catalogue.
- Builtin decks: `src/server/content/loadouts/*.json` (see `deck-designer`).
  40–50 cards, ≤3 copies. Do not auto-add 3× to both decks.
- Consistency: `src/server/content/cards.consistency.test.ts`.
- Wired effects need reducer tests (see `playcard.test.ts`, `forgeFaces.test.ts`).
