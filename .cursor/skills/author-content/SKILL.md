---
name: author-content
description: >-
  Design then author Fighters, named faces, Response cards, and Modify cards
  as typed JSON in src/server/content. Use when occupying a catalogue slot,
  adding print, or when the user mentions fighters, dice faces, techniques,
  assists, responses, modifies, meter, tag, or a deck list. Do not use to
  invent a new card type, a per-fighter deck, or deckbuilding dice.
---

# Author game content

**Design a unique slot, then** hand-author **JSON** (one file per entity)
under `src/server/content`. There is no CSV ingest. Do not transcribe the
last file, and do not invent a second content model.

Confirmed content model: [`docs/specs/030-offensive-control.md`](../../../docs/specs/030-offensive-control.md).
Layer homes and the first-playtest philosophy: [design.md](design.md).
Uniqueness and wrong-layer redirects: [design-craft.md](design-craft.md).
Print keywords: [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md) — reuse
`[Mark N X]`, `[Strip N X]`, and `[Modify]`. Do not mint a new verb.
How a shipped rule currently plays: [`docs/RULEBOOK.md`](../../../docs/RULEBOOK.md).
New cards that only use existing effects do not belong in the rulebook.

Pile-era feel rows in [`docs/MECHANIC_ARCHETYPES.md`](../../../docs/MECHANIC_ARCHETYPES.md)
are archaeology. Do not author a new card to match them.

## Choose the catalogue

| Content | File | Inspect before writing |
|---|---|---|
| Response / Modify | `src/server/content/cards/<card-id>.json` | `src/server/model/cards.ts`, `schema/card.schema.json` |
| Named face | `src/server/content/faces/<face-id>.json` | `src/server/model/dice.ts`, `faceTypes.ts`, `schema/face.schema.json` |
| Fighter (engine type `Creature*`) | `src/server/content/creatures/<creature-id>.json` | `src/server/model/creatures.ts`, `fighterTechniques.ts`, `schema/creature.schema.json` |
| One shared deck | `src/server/content/loadouts/<id>.json` | `src/server/rules/loadout.ts` — deck-designer owns lists |

Effects: `src/server/model/effects.ts`. Meter, Tag, and Assist already have
rules modules — reuse them; do not add a Tag card type or an Assist card.

## Hard rules

1. **Two card behaviors.** `type` is `"response"` or `"modify"`. Block, Dodge,
   Counter, prevent, and redirect are effects on a Response. Roll, die,
   moveset, target, and tag are `modifySubject` values, not types. Do not
   mint `DiceModificationCard`, `RollModificationCard`, `TagCard`,
   `AssistCard`, or `SituationCard`.
2. **Dice are inputs.** A face has a name, a type, a primary effect, and a
   secondary effect. Attacks, grabs, movement, and other character offensive
   tools belong here. Generic Block, Dodge, Counter, and damage reduction do
   not. A rolled face is not spent for the match. The same face instance
   cannot fill two inputs of one action. A later action may use it again.
   "Another die" is another die of the same player.
3. **Fighters are not stat blocks.** Identity is the base die, named faces,
   Simple Actions (own die), Techniques (primary = Active Fighter's own die,
   secondary = another own die, ordered), one Assist (Fighter-owned, not a
   card), optional Passive, and HP. Print says Fighter. Engine types stay
   `Creature*`.
4. **One deck, one hand, one Meter pool.** Fighters do not restrict
   construction. `fighterRestriction` is a play check ("Magnus is on your
   team" / "Magnus is Active"), not a deck ban. Meter is an exceptional
   break of the normal rules, including an optional exceptional mode. It is
   not card mana. Not every strong card spends it.
5. **Tag is an operation**, not a face and not a card type. A card may cause
   or alter a Tag (`modifySubject: "tag"`).
6. **Lifecycle is only** `one-shot` (play, resolve, discard unless
   `afterResolveZone` is set) or `persistent`. No extra lifecycle categories.
7. **Die writes** are Modify subject `die`. They last until the next match,
   which rebuilds each Current Die from that Fighter's `baseDie`. No
   temporary die mods. No deckbuilding dice.
8. **Legality** is priority + timing + behavior + valid target + state +
   Meter when that mode needs it. Reuse existing timing keywords. Do not
   invent `TimingCondition`.
9. **A Response does not take offense** by itself. The offensive sequence is
   who can keep pressing. Do not set `seizesOffense` to steal the sequence.
10. Set structured fields only when every printed clause is modelled. Park
    gaps in `docs/DEFERRED_CATALOGUE.md`. Never approximate silently.
11. Effects are **data**. Missing vocabulary → proving-card brief to
    `engine-developer`. Do not implement the reducer from this skill.
12. **Print voice is the holder.** **you** / **your** = the player who has
    the card or face. **opponent** = their opponent, including after a
    hand-off. Name both actors when two players must act.
13. **No live attribute pile.** Do not author `[Requires]` / `[Spend]` /
    Active-when as fuel. Do not author natural or synthetic face kinds, or
    Shield as a resource.
14. Schemas may still require a `forge` object, an `attacks` array, or a
    `face-(natural|synthetic|untyped)-` id. Satisfy the current validator.
    Do not design around those leftovers, and do not invent a parallel id
    scheme. Equipment, overload, and ritual regions are leftover zones, not
    card kinds.

## Workflow

```text
Card Progress:
- [ ] 1. Inspect live JSON and the schemas listed above
- [ ] 2. Name the layer (die / fighter / card / meter / tag / assist)
- [ ] 3. If the request breaks that layer, stop and propose the closest home
- [ ] 4. Uniqueness (design-craft.md) — reject reskins and anti-patterns
- [ ] 5. Print: timing prefixes + docs/KEYWORDS.md (no new verb)
- [ ] 6. Map clauses → existing effects OR defer OR engine brief
- [ ] 7. Author one JSON file; id constant in the matching loader
- [ ] 8. DoD
```

1. Grep `src/server/content/{cards,faces,creatures}/`. Occupy an empty slot
   in the layer that already exists.
2. Kind is Response, Modify, named face, or Fighter move — see
   [design.md](design.md). Not instant, reaction, equipment, overload, or
   ritual.
3. Timing print → [standardize-card-effects](../standardize-card-effects/SKILL.md).
4. Add the exported id in `cards.ts` / `faces.ts` / `creatures.ts`.
5. Builtin lists change only when asked, and only through deck-designer.
6. DoD: `npm run typecheck && npm test && npm run lint`
   ([`TOOLS.md`](../../../TOOLS.md)).

## Progressive references

- Model, redirects, first-playtest philosophy: [design.md](design.md)
- Uniqueness and anti-patterns: [design-craft.md](design-craft.md)
- Response / Modify JSON: [tactics.md](tactics.md)
- Named faces: [faces.md](faces.md)
- Fighters: [creatures.md](creatures.md)
- CSV worksheets: [csv-tactics.md](csv-tactics.md)

## Id conventions

| Kind | Pattern | Example |
|---|---|---|
| Hand card | `card-<kebab>` | `card-standing-block` |
| Fighter | `creature-<kebab>` | `creature-magnus` |
| Face | schema `faceId` pattern, name token after the move | `face-natural-jab` only while the pattern still requires a prefix |
| Attack id | `attack-<fighter>-<kebab>` | `attack-magnus-lariat` |
| Technique id | string on the Fighter | `lariat` |

The `natural` / `synthetic` / `untyped` token in a face id is a validator
prefix, not a kind. Never `face-synthetic-martial` or `face-untyped-shield`
as a designed resource.

Const exports: `SCREAMING_SNAKE`.
