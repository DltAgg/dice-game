# Tactic and ritual cards

File: `src/game/content/cards.ts`  
Grammar: `docs/specs/002-card-layer.md`  
Design: [design.md](design.md)

## Shape

Every hand card has a forge region. Play uses **at most one** of: `effect`,
`equipment`, `overload`, `ritual` (`playCard` in `reduce.ts`).

```ts
export const EXAMPLE: CardId = asCardId("card-example");

card({
  id: EXAMPLE,
  name: "Example",
  energyCost: 2,
  type: "instant", // "reaction" | "equipment" | "overload" | "ritual"
  subtypes: [], // ritual only: "instant" | "continuous" | "reaction"
  attribute: "arcane",
  forge: {
    faces: 1,
    kind: "synthetic", // "natural" only for dual-kind attributes
    attribute: "arcane", // match card.attribute unless a future splash forge is explicit
    target: "own-die", // or "opponent-die"
  },
  // forgeTags?: ["echo"]
  rulesText: "Draw 1 card.",
  effect: { effects: [{ type: "draw-cards", amount: 1 }] },
}),
```

## Region mapping

| Print | Structured field |
|---|---|
| Instant one-shot | `type: "instant"` + `effect: { requires?, additionalEnergy?, effects }` |
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
  energyCost: 5,
  type: "ritual",
  subtypes: ["instant"], // or "reaction" | "continuous"
  attribute: "corruption",
  forge: { faces: 1, kind: "synthetic", attribute: "corruption", target: "own-die" },
  rulesText: "Forge 3 Synthetic Corruption faces on one of the opponent's dice.",
  ritual: {
    activeWhen: { arcane: 1, corruption: 2 }, // omit if print has no Active when
    // additionalEnergy?: 3,
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

- Place from hand (`PLAY_CARD`) → `preparing`. Ready when Active-when is met
  via `ABSORB_SYMBOL_TO_RITUAL` (or immediately if no `activeWhen`).
- Instant / reaction: activate → effects → GY.
- Continuous: activate → exhaust until owner’s next turn; standing triggers
  while `ready`.
- Ready rituals may activate in any phase **except roll** (and in reaction
  windows if subtype includes `reaction`).

`forge-faces`: the **controller** picks a matching face from **their** pool (or
an owned installed copy) and the die/slots. Same install rules as `FORGE_CARD`
(attribute cap, copy rule, draw 1 per face). No extra Energy; ritual already paid.

## Existing effects (prefer these)

Read `src/game/model/effects.ts` as authority. Today:

`damage`, `heal`, `grant-shield`, `generate-symbol`, `draw-cards`, `discard-cards`,
`search-deck`, `search-graveyard`, `gain-energy`, `destroy-equipment`,
`apply-toxin`, `remove-shield`, `next-attack-bonus`, `grant-next-attack-bonus`,
`arm-attack-toxin`, `negate-card`, `grant-damage-prevent`,
`prevent-attack-reflect`, `arm-prevent-draw`, `forge-faces`

Targets: `source-creature`, `declared-target`, `most-damaged-ally`,
`most-shielded-enemy`, `choose-ally`, `choose-enemy`, `chain-attack-target`

Standing triggers live on equipment / continuous rituals — see
[implement-hooks](../implement-hooks/SKILL.md).

## In-repo patterns to copy

| Card | Why |
|---|---|
| Eclipse | Instant `effect` draw + discard |
| Ritual of Contamination | Instant with `requires` + `forge-faces` onto opponent |
| Living Library | Ritual + `search-deck`; Active-when Arcane + Arcane |
| Great Contamination | Ritual + `forge-faces` (3 Corruption on opponent die) |
| Eternal Darkness | Ritual + `search-graveyard` |
| Runic Nullification | Ritual-reaction, `additionalEnergy`, `negate-card` (`instant`) |
| Luminar Prism | Overload `onRoll` heal |
| Persistent Infection | Overload + `faceSymbols: ["corruption"]` |
| War Axe | Equipment `attack-damage-bonus` |
| Black Plague | Equipment `mayTargetOpponent` + `on-roll-symbol`; forge `opponent-die` |
| Abyssal Sacrifice | Continuous ritual `standingAbilities` on discard |

## After editing

- Export the `CardId` const and add the `card({…})` to `DEFINITIONS`.
- Builtin decks: `PROTOTYPE_DECK_COUNTS` (aggro) / `CONTROL_DECK_COUNTS`.
  50–60 cards, ≤4 copies. Do not auto-add 4× to both decks.
- Consistency: `src/game/content/cards.consistency.test.ts`.
- Wired effects need reducer tests (see `playcard.test.ts`, `forgeFaces.test.ts`).
