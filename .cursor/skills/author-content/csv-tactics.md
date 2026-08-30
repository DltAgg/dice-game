# CSV → tactic cards

When the user supplies a CSV of tactics, columns are **exactly** this order:

1. **Card text** — printed body (type line, forge, gates, rules; may be multiline)
2. **Play cost** — pile tokens (`playCost` total or per-attribute map, e.g. `{ darkness: 3 }`)
3. **Card name** — English display name

Example:

```csv
Card text,Play cost,Card name
"Draw 2 cards and discard 1. Forge 1 synthetic Darkness face on your die.",3,Eclipse
```

Author as `"playCost": { "darkness": 3 }` (card attribute), never `"energyCost": 3`.

If headers or order differ, **stop and confirm** before mass-authoring.

“Forge 1 Synthetic Darkness” (or Toxin / Mechanical / Corruption / …) is
**kind + attribute**: install a **named special** of that symbol from the
pool. It is not a card titled Synthetic Darkness. The `Forge 1` in this
example is **column-order illustration**, not a craft default
([design-craft.md](design-craft.md)).

## Process

1. List every row with proposed: main type, ritual subtypes if any, attribute, forge, playable region, deferred gaps.
   Uniqueness + forge intent still apply ([design-craft.md](design-craft.md)).
   Do not batch-author Forge 1 Natural of own attribute + one opcode.
2. Get alignment (or proceed if the user said to implement the batch).
3. Author each row into `src/server/content/cards/<card-id>.json` per [tactics.md](tactics.md).
4. Update `docs/specs/002-card-layer.md` tables and `docs/DEFERRED_CATALOGUE.md`.
5. Run DoD checks.

## Classification cheat sheet

| Text cues | Region |
|---|---|
| Instant / one-shot verbs (draw, deal, search…) | `type: "instant"` + `effect` |
| Reaction window from hand | `type: "reaction"` + `effect` |
| “Equip” / “whenever this creature…” standing | `type: "equipment"` + `equipment` |
| “When this face is rolled” / face-only gate | `type: "overload"` + `overload` |
| “Active when:” / stays on field | `type: "ritual"` + `ritual` region |
| “None” / empty effect / forge-only | forge only |

Do not build a permanent CSV importer unless the user asks for tooling.
