---
name: standardize-card-effects
description: >-
  Turn Fighter, face, Response, and Modify print into timing-prefixed keyword
  English and existing effect data. Use when normalizing rules text, wiring
  primary or secondary face effects, or trigger-ifying a clause while editing
  catalogue JSON. Do not use to invent a card type, a pile cost, or a
  defensive die face.
---

# Standardize card texts

Read [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md) before print or effect
data. The source is [`docs/GAME_STATE.md`](../../../docs/GAME_STATE.md).
Turn free-form print into **timing-prefixed keyword English** plus **data
effects** on the field that already exists. Never invent silent
approximations. Reuse `[Mark]`, `[Strip]`, and `[Modify]`. Do not mint a
verb. `[Block N]`, `[Counter]`, and `[Parry]` already have print. Dodge is
not current print. The change is not done when the print and the glossary
disagree. User-supplied print stays verbatim.

Standardizing English is not making every card the same shape. Slot
uniqueness is [author-content](../author-content/SKILL.md) and
[design.md](../author-content/design.md) **before** this step.

Companion: [develop-engine](../develop-engine/SKILL.md) when a clause needs a
new `EffectDefinition`. Do not grow the engine from this skill.

## Voice

**you** / **your** is the holder. **opponent** is their opponent. Name both
actors when two players must act. Never "Whenever…".

## Where the clause lives

| Print is about… | Field |
|---|---|
| Face hit, or the first face of a Technique | `primaryEffects` |
| The other face of a Technique | `secondaryEffects` |
| `[Block N]`, `[Counter]`, `[Parry]`, redirect | card `type: "response"` and `effect.effects` |
| Roll, die, moveset, target, or tag change | card `type: "modify"` and `modifySubject` |
| Fighter passive that the engine already hooks | `standingAbilities` on the Fighter |
| Assist | `assistEffects` on the Fighter |

Leave `onAbsorb` empty on new faces. Do not move new print onto overload or
ritual hosts. A moveset Modify attaches in the equipment zone. That is not a
card type.

Timing prefixes that already exist stay prefixes: `On roll:`, `On attack:`,
`On deal damage:`, `On take damage:`, `On start of turn:`. A prefix is
eligibility in that window. It is not a new `TimingCondition`. A Technique
requirement lists the faces (`X + Y:`). Do not prefix that line with
`On attack:`.

## Map to effects that exist

Prefer members already in `src/server/model/effects.ts`.

| Print fragment | Prefer |
|---|---|
| `[Strike N]` | `damage`, or `assist-hit` when the Strike is an Assist |
| `+N damage` | `next-attack-bonus` |
| `[Mark N X]` / `[Strip N X]` | `mark` / `strip` |
| `[Draw N]` | `draw-cards`. Not attached, and not repeating, unless it is part of a Technique or an Assist or it has a restriction |
| `[Block N]` | `reduce-damage` |
| `[Counter]` | `negate-card`. Does not end the sequence |
| `[Parry]` | `grant-attack-prevent`, and the card ends the sequence |
| Replace | Modify `die`, or `replaceFaceId` |
| Change the showing face | Modify `roll` |

Do not author `[Forge]`, `[Generate]`, `[Empower]`, `[Pierce]`, `[Requires]`,
`[Spend]`, `[Convert]`, `[Desynthesize]`, or Shield as a resource.

If the clause needs a field the effect list does not have, keep the print
accurate, leave the array empty, and add `docs/DEFERRED_CATALOGUE.md`. Then
brief `engine-developer` if the user wants it built.

## Workflow

```text
Standardize Progress:
- [ ] 1. Capture print authority (do not "improve" the meaning)
- [ ] 2. Name the layer (face / response / modify / fighter / assist)
- [ ] 3. Map each clause → an existing effect or defer it
- [ ] 4. Wire catalogue data OR defer honestly
- [ ] 5. Tests + DoD + DEFERRED_CATALOGUE when print coverage changes
```

```bash
npm run typecheck && npm test && npm run lint
```

## Anti-patterns

- Approximating an unwired clause
- A Guard, Block, Dodge, Counter, or Parry face
- Instant, overload, or ritual as the type line
- `[Spend]` / `[Requires]` / `[Forge]` as the card's identity
- Putting trigger logic in UI or networking
- Dropping a clause from `rulesText` because it was not wired
- "Whenever…" for a standing trigger

[examples.md](examples.md) and [reference.md](reference.md) are not print
sources. Do not copy them onto new content.
