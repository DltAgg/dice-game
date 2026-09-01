---
name: author-content
description: >-
  Design then author tactic, ritual, and face-card catalogue entries (and
  creatures) as typed data in src/server/content. Use when occupying a new
  catalogue slot, adding print/Figma/CSV text, or when the user mentions
  catalogue, forge, overload, ritual, equipment, face deck, attribute pile,
  Requires/Spend, uniqueness, deferred effects, or playtest “felt like the
  wrong archetype.” Do not use to clone the last card or to reprint Forge-1
  Spend/Generate glue.
---

# Author game content

**Design a unique slot, then** hand-author **JSON** (one file per entity)
under `src/server/content`. There is **no** CSV ingest — spreadsheets are
worksheets, then catalogue documents. Do not transcribe the last file.

This skill is the path for **new** ritual / tactic / face cards as well as
translating print. Design canon: `competitive_dice_game_agent_bible.md`.
Set craft (uniqueness, forge, bridges, generic reach): [design-craft.md](design-craft.md).
Philosophy and attribute identities: [design.md](design.md).
**Attribute pile (fuel, Absorb, gates):** [attribute-pile.md](attribute-pile.md) —
read before editing rituals, `onAbsorb`, attack costs, or standing `on-absorb`.
Print keywords: [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md) — new/edited
`rulesText` uses `[Mark N X]`, `[Empower N]`, etc. Do not mint Dose/Envenom-style
verbs for a new token.
Mechanic × archetype feel (playtest tracker): [`docs/MECHANIC_ARCHETYPES.md`](../../../docs/MECHANIC_ARCHETYPES.md)
— same opcode, different **window**, different deck style. Update it when a
playtest retargets a leak.

## Choose the catalogue

| Content | File | Spec |
|---|---|---|
| Tactic + ritual (hand) | `src/server/content/cards/<card-id>.json` | `docs/specs/002-card-layer.md` |
| Face cards (dice) | `src/server/content/faces/<face-id>.json` | `docs/specs/004-face-cards.md` |
| Creatures | `src/server/content/creatures/<creature-id>.json` | `docs/specs/003-creature-cards.md` |
| Builtin loadouts | `src/server/content/loadouts/<archetype>.json` | `docs/specs/019-content-json.md` |

Types: `src/server/model/cards.ts`, `dice.ts`, `effects.ts`, `creatures.ts`.

## Hard rules

1. **Play, forge, or `[Overcharge]` — never two on the same use** (bible §19–20
   + spec `021`). Every hand card still *has* a forge region. Do **not** print
   `[Overcharge]` on each card (master rule; RULEBOOK §11). Spec
   `013` `optional-overcharge` is a face-marker opcode, not this keyword.
2. Set structured engine fields **only** when every printed clause is modelled.
   Write `rulesText` with keywords from [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md)
   (`On roll: [Mark 1 Toxin].`). Park gaps in `docs/DEFERRED_CATALOGUE.md`.
   Never approximate silently.
3. **`[Prevent]`** is **Luminar + reaction-exclusive** (`grant-attack-prevent`
   on `type: "reaction"` only, during an attack chain). Proactive mitigation
   uses `[Mark N Shield]` / `[Heal]` — not `[Prevent]` on faces, absorb, or
   standing hooks. Spec `009` · `docs/KEYWORDS.md`.
4. Effects are **data** (AST `op` nodes or legacy `type` members compiled by
   `AstCompiler`). Prefer existing opcodes. Missing vocabulary → proving-card
   brief to `engine-developer` ([develop-engine](../develop-engine/SKILL.md)).
   Do not implement reducer/AST from this skill.
5. `src/server` stays pure. Do not put rules in UI / store / networking.
   One entity per JSON file; do not grow `cards.ts` / `creatures.ts` / `faces.ts`
   past `module-budget.test.ts`.
6. Forge the card’s own attribute. Natural forges are legal for every
   attribute; synthetic forges still name a special from the pool (never
   blank `face-synthetic-<attr>`). Keep splash in overload/equip gates or
   generated symbols, not in a mismatched forge, unless a future card
   explicitly needs a forge splash.
7. **Print voice is the holder.** Write `rulesText` from the player who
   currently has the card on their field (their die, creature, ritual row,
   or equipment). **you** / **your** = that holder. **opponent** /
   **opposing** / **enemy** = *their* opponent. If you forge, equip, or
   hand the card onto the other side of the table, do not keep writing from
   the original owner’s view — the new holder is now “you.” When both
   players must act, name the actors in print (“you choose…”, “that
   creature’s controller discards…”) instead of relying on owner/controller
   jargon.
8. **Printed 1-token `playCost` is exceptional.** Do not author `playCost`
   totaling 1 token as cheap cycle. Prefer 2+ of the card’s attribute.
   Gates are `[Requires]` only (`effect.requires` holds; it does not burn).
   Extra burn: raise `playCost`, `ritual.spend`, or attack `discards` — see
   [attribute-pile.md](attribute-pile.md). `[Discount]` cuts header Spend
   only. Natural forge does not burn `playCost`; synthetic forge does.
   Cheaper plays come from `[Discount]`, not a roster of 1-token cards.
9. **Do not clone the last card.** Audit live JSON first. Default
   `forge.faces: 1` + own-attribute Natural/Synthetic with no rider is a
   sticker, not a design. `[Spend] X, [Generate] Y` is not a bridge.
   Craft: [design-craft.md](design-craft.md).

## Workflow

Copy and track:

```text
Card Progress:
- [ ] 1. Catalogue audit (live JSON) + empty slot (design-craft.md)
- [ ] 2. Uniqueness + dice-resonance + forge intent — reject reskins
- [ ] 3. Kind + attribute identity + exclusive mechanic (design.md)
- [ ] 3b. Window/feel (`docs/MECHANIC_ARCHETYPES.md`) — reject `RETARGETED` / `ANTI`
- [ ] 4. Pile costs / gates if relevant (attribute-pile.md) — not a converter license
- [ ] 5. Print / rulesText: timing prefixes + `docs/KEYWORDS.md`
- [ ] 6. Map clauses → existing effects / hooks OR defer OR engine brief
- [ ] 7. Author catalogue entry (ids, forge, play region)
- [ ] 8. Grow engine only if a concrete clause needs it (brief engine-developer;
       do not skip dual-pip / OR-cost holes)
- [ ] 9. Tests + decks/face-deck + DEFERRED_CATALOGUE
- [ ] 10. DoD
```

1. Grep/read live `src/server/content/{cards,faces,creatures}/`. Name the
   empty slot (attribute × kind × forge shape × payoff × home). Reject
   same-kind + `forge.faces: 1` + same Spend/Generate or On-roll
   Generate-same-attr. Craft: [design-craft.md](design-craft.md).
2. Identify kind: **instant** / **reaction** / **equipment** / **overload**,
   **ritual** (subtypes instant / reaction / continuous), or **face**
   (natural / synthetic / untyped). Design `forge.faces` (1, 2, rarely 3)
   and natural vs synthetic **with a reason**.
3. Check [design.md](design.md) — identity, **exclusive mechanic**, cost band,
   what the card is *for*. Do not print another attribute’s exclusive verb.
4. Align names and attributes with English specs (`002` / `003` / `004`)
   as **grammar / rate anchors**. Live JSON is catalogue truth; stale spec
   tables of missing cards are not a pattern.
5. Timing print → [standardize-card-effects](../standardize-card-effects/SKILL.md).
   Standing hooks → [implement-hooks](../implement-hooks/SKILL.md).
   Standardizing English is not making every card Forge-1 + one opcode.
6. Add exported id + definition in the right file.
7. If vocabulary is missing → proving-card brief to engine-developer, then wire.
8. Update deferred catalogue / spec tables. Add copies to a builtin deck only
   when that is requested and the 40–50 / ≤3-copies rules still hold.
9. New cards that only use existing effects do **not** belong in
   `docs/RULEBOOK.md`. If this change needed a new mechanic, engine-developer
   updates the rulebook in the same engine change. New tokens or keywords
   update `docs/KEYWORDS.md` in the same change.
10. DoD: `npm run typecheck && npm test && npm run lint` ([`TOOLS.md`](../../../TOOLS.md)).

## Progressive references

- **Set craft** (uniqueness, forge, bridges, generic reach): [design-craft.md](design-craft.md)
- **Attribute pile (spec `016`):** [attribute-pile.md](attribute-pile.md)
- Design / identities / exclusive verbs: [design.md](design.md)
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
