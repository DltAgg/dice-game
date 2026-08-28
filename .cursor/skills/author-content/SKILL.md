---
name: author-content
description: >-
  Create or update tactic, ritual, and face-card catalogue entries (and
  creatures) as typed data in src/server/content. Use when designing a new card,
  adding print/Figma/CSV text, or when the user mentions catalogue, forge,
  overload, ritual, equipment, face deck, or deferred effects.
---

# Author game content

Hand-author **JSON** (one file per entity) under `src/server/content`. There is
**no** CSV ingest — spreadsheets are worksheets, then catalogue documents.

This skill is the path for **new** ritual / tactic / face cards as well as
translating print. Design canon: `competitive_dice_game_agent_bible.md`.
Philosophy and attribute identities: [design.md](design.md).
Print keywords: [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md) — new/edited
`rulesText` uses `[Mark N X]`, `[Empower N]`, etc. Do not mint Dose/Envenom-style
verbs for a new token.

## Choose the catalogue

| Content | File | Spec |
|---|---|---|
| Tactic + ritual (hand) | `src/server/content/cards/<card-id>.json` | `docs/specs/002-card-layer.md` |
| Face cards (dice) | `src/server/content/faces/<face-id>.json` | `docs/specs/004-face-cards.md` |
| Creatures | `src/server/content/creatures/<creature-id>.json` | `docs/specs/003-creature-cards.md` |
| Builtin loadouts | `src/server/content/loadouts/<archetype>.json` | `docs/specs/019-content-json.md` |

Types: `src/server/model/cards.ts`, `dice.ts`, `effects.ts`, `creatures.ts`.

## Hard rules

1. **Forge or play, never both** on the same use (bible §19–20). Every hand card
   still *has* a forge region; the player chooses which region to use.
2. Set structured engine fields **only** when every printed clause is modelled.
   Write `rulesText` with keywords from [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md)
   (`On roll: [Mark 1 Toxin].`). Park gaps in `docs/DEFERRED_CATALOGUE.md`.
   Never approximate silently.
3. Effects are **data** (AST `op` nodes or legacy `type` members compiled by
   `AstCompiler`). Prefer existing opcodes; grow the engine only with
   [develop-engine](../develop-engine/SKILL.md) in the same change as the card.
4. `src/server` stays pure. Do not put rules in UI / store / networking.
   One entity per JSON file; do not grow `cards.ts` / `creatures.ts` / `faces.ts`
   past `module-budget.test.ts`.
5. Forge the card’s own attribute. Natural forges are legal for every
   attribute; synthetic forges still name a special from the pool (never
   blank `face-synthetic-<attr>`). Keep splash in overload/equip gates or
   generated symbols, not in a mismatched forge, unless a future card
   explicitly needs a forge splash.
6. **Print voice is the holder.** Write `rulesText` from the player who
   currently has the card on their field (their die, creature, ritual row,
   or equipment). **you** / **your** = that holder. **opponent** /
   **opposing** / **enemy** = *their* opponent. If you forge, equip, or
   hand the card onto the other side of the table, do not keep writing from
   the original owner’s view — the new holder is now “you.” When both
   players must act, name the actors in print (“you choose…”, “that
   creature’s controller discards…”) instead of relying on owner/controller
   jargon.
7. **Printed Energy 1 is exceptional.** Do not author `energyCost: 1` as
   cheap cycle. 1-cost cards must be narrow and niche so 2+ cards stay
   appealing. The primary way to play something for 1 Energy is **cost
   reduction** (discounts, next-forge, creature passives), not a roster of
   natural 1-drops. Prefer printed 2+.

## Workflow

Copy and track:

```text
Card Progress:
- [ ] 1. Kind + attribute identity + exclusive mechanic (design.md)
- [ ] 2. Print / rulesText: timing prefixes + `docs/KEYWORDS.md`
- [ ] 3. Map clauses → existing effects / hooks OR defer
- [ ] 4. Author catalogue entry (ids, forge, play region)
- [ ] 5. Grow engine only if a concrete clause needs it
- [ ] 6. Tests + decks/face-deck + DEFERRED_CATALOGUE
- [ ] 7. DoD
```

1. Identify kind: **instant** / **reaction** / **equipment** / **overload**,
   **ritual** (subtypes instant / reaction / continuous), or **face**
   (natural / synthetic / untyped).
2. Check [design.md](design.md) — identity, **exclusive mechanic**, cost band,
   what the card is *for*. Do not print another attribute’s exclusive verb.
3. Align names and attributes with English specs (`002` / `003` / `004`).
4. Timing print → [standardize-card-effects](../standardize-card-effects/SKILL.md).
   Standing hooks → [implement-hooks](../implement-hooks/SKILL.md).
5. Add exported id + definition in the right file.
6. If vocabulary is missing → develop-engine **with** resolver + tests, then wire.
7. Update deferred catalogue / spec tables. Add copies to a builtin deck only
   when that is requested and the 40–50 / ≤3-copies rules still hold.
8. New cards that only use existing effects do **not** belong in
   `docs/RULEBOOK.md`. If this change needed a new mechanic, engine-developer
   updates the rulebook in the same engine change. New tokens or keywords
   update `docs/KEYWORDS.md` in the same change.
9. DoD: `npm run typecheck && npm test && npm run lint` ([`TOOLS.md`](../../../TOOLS.md)).

## Progressive references

- Design / game goal: [design.md](design.md)
- Tactics + rituals: [tactics.md](tactics.md)
- Faces / dice: [faces.md](faces.md)
- Creatures: [creatures.md](creatures.md)
- CSV column order: [csv-tactics.md](csv-tactics.md)

## Id conventions

| Kind | Pattern | Example |
|---|---|---|
| Hand card / ritual | `card-<kebab>` | `card-great-contamination` |
| Creature | `creature-<kebab>` | `creature-minotaur` |
| Natural face | `face-natural-<attr>` | `face-natural-arcane` |
| Untyped face | `face-untyped-shield` | `face-untyped-shield` |
| Synthetic named special | `face-synthetic-<kebab>` | `face-synthetic-crush` |
| Attack | `attack-<creature>-<kebab>` | `attack-minotaur-heavy-axe` |
| Ability | `ability-<creature>-<kebab>` | `ability-warden-ward` |

Never `face-synthetic-martial` / `face-synthetic-corruption` (no blank generic
identity synthetics). Forging names a **named special** from the pool.

Const exports: `SCREAMING_SNAKE`. Attributes: `martial`, `wild`, `toxin`,
`arcane`, `luminar`, `mechanical`, `corruption`, `darkness`.
