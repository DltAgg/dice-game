# Tactic cards

File: `src/game/content/cards.ts`  
Grammar: `docs/specs/002-card-layer.md`

## Shape

Every tactic has a forge region. Play uses **at most one** of: `effect`,
`equipment`, `overload`, `ritual` (see `playCard` routing in `reduce.ts`).

```ts
export const EXAMPLE: CardId = asCardId("card-example");

card({
  id: EXAMPLE,
  name: "Example",
  energyCost: 2,
  type: "tactic",
  subtypes: ["instant"], // + ritual/reaction/equipment/overload as printed
  // duration?: "instant" | "continuous"  // rituals
  attribute: "arcane",
  forge: {
    faces: 1,
    kind: "synthetic", // or "natural"
    attribute: "arcane", // may differ from card attribute
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
| Instant one-shot | `effect: { requires?, additionalEnergy?, effects }` |
| Equipment | `equipment: { mayTargetOpponent, creatureAttributes?, abilities }` |
| Overload | `overload: { faceSymbols?, faceKinds?, onRoll }` |
| Ritual | `ritual: { activeWhen, effects }` |
| Forge only (“None”) | `rulesText: ""`, no playable region |

Attachment subtypes **must** match regions (`cards.consistency.test.ts`). Empty
`abilities: []` / `effects: []` is OK when place/attach works but triggers wait.

## Existing effects (prefer these)

`damage`, `heal`, `grant-shield`, `generate-symbol`, `draw-cards`, `discard-cards`,
`search-deck`, `search-graveyard`, `gain-energy`, `destroy-equipment`,
`apply-toxin`, `remove-shield`, `next-attack-bonus`

Targets: `source-creature`, `declared-target`, `most-damaged-ally`,
`most-shielded-enemy`, `choose-ally`, `choose-enemy`

## Examples in-repo

- Eclipse — `effect` draw + discard
- Living Library — ritual + `search-deck`
- Luminar Prism — overload heal on roll
- Persistent Infection — overload + `faceSymbols: ["corruption"]`
- War Axe — equipment `attack-damage-bonus`
- Runic Nullification — ritual with empty effects (negate deferred)

## After editing

- `PROTOTYPE_DECK` is typically 4× every definition (deck size 50–60).
- Keep loadout tests green (`deckMaxCopiesPerCard: 4`).
