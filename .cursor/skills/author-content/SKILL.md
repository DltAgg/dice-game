---
name: author-content
description: >-
  Create or update tactic, ritual, and face-card catalogue entries (and
  creatures) as typed data in src/game/content. Use when designing a new card,
  adding print/Figma/CSV text, or when the user mentions catalogue, forge,
  overload, ritual, equipment, face deck, or deferred effects.
---

# Author game content

Hand-author TypeScript in `src/game/content`. There is **no** CSV ingest —
spreadsheets are worksheets, then catalogue entries.

This skill is the path for **new** ritual / tactic / face cards as well as
translating print. Design canon: `competitive_dice_game_agent_bible.md`.
Philosophy and attribute identities: [design.md](design.md).

## Choose the catalogue

| Content | File | Spec |
|---|---|---|
| Tactic + ritual (hand) | `src/game/content/cards.ts` | `docs/specs/002-card-layer.md` |
| Face cards (dice) | `src/game/content/faces.ts` | `docs/specs/004-face-cards.md` |
| Creatures | `src/game/content/creatures.ts` | `docs/specs/003-creature-cards.md` |

Types: `src/game/model/cards.ts`, `dice.ts`, `effects.ts`, `creatures.ts`.

## Hard rules

1. **Forge or play, never both** on the same use (bible §19–20). Every hand card
   still *has* a forge region; the player chooses which region to use.
2. Set structured engine fields **only** when every printed clause is modelled.
   Keep accurate English `rulesText`. Park gaps in `docs/DEFERRED_CATALOGUE.md`.
   Never approximate silently.
3. Effects are **data** (`EffectDefinition`), never functions. Prefer existing
   members; grow the union only with [develop-engine](../develop-engine/SKILL.md)
   in the same change as the card that needs it.
4. `src/game` stays pure. Do not put rules in UI / store / networking.
5. Forge the card’s own attribute. Synthetic-only attributes never use
   `kind: "natural"`. Keep splash in overload/equip gates or generated
   symbols, not in a mismatched forge, unless a future card explicitly
   needs a forge splash.

## Workflow

Copy and track:

```text
Card Progress:
- [ ] 1. Kind + attribute identity (design.md)
- [ ] 2. Print / rulesText in standard timing English
- [ ] 3. Map clauses → existing effects / hooks OR defer
- [ ] 4. Author catalogue entry (ids, forge, play region)
- [ ] 5. Grow engine only if a concrete clause needs it
- [ ] 6. Tests + decks/face-deck + DEFERRED_CATALOGUE
- [ ] 7. DoD
```

1. Identify kind: **tactic** (instant / reaction / equipment / overload),
   **ritual** (instant / reaction / continuous), or **face** (natural / synthetic).
2. Check [design.md](design.md) — identity, cost band, what the card is *for*.
3. Align names and attributes with English specs (`002` / `003` / `004`).
4. Timing print → [standardize-card-effects](../standardize-card-effects/SKILL.md).
   Standing hooks → [implement-hooks](../implement-hooks/SKILL.md).
5. Add exported id + definition in the right file.
6. If vocabulary is missing → develop-engine **with** resolver + tests, then wire.
7. Update deferred catalogue / spec tables. Add copies to a builtin deck only
   when that is requested and the 50–60 / ≤4-copies rules still hold.
8. DoD: `npm run typecheck && npm test && npm run lint` ([`TOOLS.md`](../../../TOOLS.md)).

## Progressive references

- Design / game goal: [design.md](design.md)
- Tactics + rituals: [tactics.md](tactics.md)
- Faces / dice: [faces.md](faces.md)
- Creatures: [creatures.md](creatures.md)
- CSV column order: [csv-tactics.md](csv-tactics.md)

## Id conventions

| Kind | Pattern | Example |
|---|---|---|
| Tactic / ritual | `card-<kebab>` | `card-great-contamination` |
| Creature | `creature-<kebab>` | `creature-minotaur` |
| Natural face | `face-natural-<attr\|shield>` | `face-natural-arcane` |
| Synthetic / named | `face-synthetic-<kebab>` | `face-synthetic-crush` |
| Attack | `attack-<creature>-<kebab>` | `attack-minotaur-heavy-axe` |
| Ability | `ability-<creature>-<kebab>` | `ability-warden-ward` |

Const exports: `SCREAMING_SNAKE`. Attributes: `martial`, `wild`, `toxin`,
`arcane`, `luminar`, `mechanical`, `corruption`, `darkness`.
