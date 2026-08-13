# Examples — standardize card texts & triggers

## Face print: Revelation / Instinct / Primordial Fury

These are the house style for roll+absorb faces (even when still print-only):

```ts
// Revelation
"On roll: reveal the top card of your deck; you may put it on the bottom.\n" +
  "On absorb: heal 2 on a creature that has less than half its Life remaining."

// Instinct
"On roll: an allied creature may reposition 1 space.\n" +
  "On absorb: it may perform a Basic Attack if it has not attacked this turn."

// Primordial Fury
"On roll: if an allied creature has attacked this turn, gain 1 Energy.\n" +
  "On absorb: this creature's next Basic Attack deals +1 damage."
```

**When wiring later**, map only clauses the engine can express. Examples of
honest partial wiring:

| Clause | If vocabulary exists | If not |
|---|---|---|
| On absorb: next Basic +1 | `onAbsorb: [{ type: "next-attack-bonus", amount: 1 }]` | Keep text; `onAbsorb: []` |
| On roll: gain 1 Energy if attacked | Needs conditional roll effect | Keep text; `onRoll: []` |
| On roll: reposition | Needs reposition effect | Keep text; defer |

## Before → after (face text)

**Before (mixed):**
> When this face is rolled or absorbed, heal an ally or draw.

**After (standard):**
```text
On roll: heal 1 on an allied creature.
On absorb: draw 1 card.
```

## Equipment: Venomous Fangs

**Print:** Whenever this creature deals damage, apply 1 Toxin marker.

**Data:**
```ts
abilities: [
  {
    type: "on-deal-damage",
    effects: [
      { type: "apply-toxin", amount: 1, target: { kind: "declared-target" } },
    ],
  },
],
```

Hook supplies `declared-target` = creature that took HP damage.

## Overload: Mutant Spores

**Print:** Toxin faces only. When absorbed, heal 1.

**Data:**
```ts
overload: {
  faceSymbols: ["toxin"],
  onRoll: [],
  onAbsorb: [{ type: "heal", amount: 1, target: { kind: "most-damaged-ally" } }],
},
```

## New card from CSV (process sketch)

1. Columns: Card text, Energy cost, Card name (see author-content `csv-tactics.md`).
2. Rewrite text into timing lines / regions.
3. Classify type (`tactic` | `ritual`) + subtypes.
4. For each clause: existing effect? → wire. Else → DEFERRED row.
5. Add definition; run DoD.

## Fully wired simple face (Crush-style)

```ts
face({
  id: CRUSH,
  name: "Crush",
  kind: "synthetic",
  symbol: "martial",
  rulesText: "The next attack this turn deals +1 damage.",
  onRoll: [{ type: "next-attack-bonus", amount: 1 }],
  onAbsorb: [],
  maxOverloads: 2,
  forgeRestriction: null,
}),
```

Single timing → one region; no need for an “On roll:” prefix if the card has
only roll text historically — but **new** dual-region faces should always use
the On roll / On absorb pair for consistency.
