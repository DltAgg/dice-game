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

Turn free-form print into **timing-prefixed keyword English** plus **data
effects** on the field that already exists. Never invent silent
approximations. New and edited `rulesText` follows
[`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md): reuse `[Mark]`, `[Strip]`,
and `[Modify]`. Do not mint a verb for Block, Dodge, or Counter.

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
| Simple Action on a named face | `primaryEffects` |
| Secondary input of a Technique | `secondaryEffects` |
| Response (block, dodge, counter, prevent, redirect) | card `type: "response"` and `effect.effects` |
| Roll, die, moveset, target, or tag change | card `type: "modify"` and `modifySubject` |
| Fighter passive that the engine already hooks | `standingAbilities` on the Fighter |
| Assist | `assistEffects` on the Fighter |

`onRoll` / `onAbsorb` and equipment, overload, and ritual regions are
leftover hosts. Do not move new print onto them. Leave `onAbsorb` empty on
new faces. Do not describe On absorb as banking an attribute pile.

Timing prefixes that already exist stay prefixes: `On roll:`, `On attack:`,
`On deal damage:`, `On take damage:`, `On start of turn:`. A prefix is
eligibility in that window. It is not a new `TimingCondition`.

## Map to effects that exist

Prefer members already in `src/server/model/effects.ts`.

| Print fragment | Prefer |
|---|---|
| Deal N / `[Strike N]` | `damage` + target |
| `[Heal N]` | `heal` |
| `[Empower N]` | `next-attack-bonus` |
| `[Mark N X]` / `[Strip N X]` | the opcode KEYWORDS already maps (`mark` / `strip` or the current token opcode) |
| `[Draw N]` / `[Discard N]` | `draw-cards` / `discard-cards` |
| Block, dodge, counter, prevent, redirect | a Response, using an effect the engine already resolves — not a new type |
| Change the showing face | Modify `roll` |
| Rewrite a slot for the match | Modify `die` |

`[Prevent]` is an effect on a Response, not a card type and not a die face.
Do not author `[Mark N Shield]` as a resource. Do not author `[Generate]` as
pile fuel.

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

- Approximating an unwired clause (Barrier written as Shield)
- A Guard, Block, Dodge, or Counter face
- Instant, equipment, overload, or ritual as the type line
- `[Spend]` / `[Requires]` as if the pile were live
- Putting trigger logic in UI or networking
- Dropping a clause from `rulesText` because it was not wired
- "Whenever…" for a standing trigger

[examples.md](examples.md) and [reference.md](reference.md) record leftover
catalogue shapes (equipment, overload, synthetic faces). Do not copy them
onto new content.
