---
name: standardize-card-effects
description: >-
  Standardize card/face print text into timing hooks and wire data-driven
  effects or standing triggers. Use when normalizing On roll / On absorb lines,
  simplifying catalogue rulesText, creating or extending triggers (onRoll,
  onAbsorb, on-deal-damage, on-toxin-damage, on-roll-symbol, on-absorb gear),
  authoring faces like Revelation / Instinct / Primordial Fury, or when the
  user asks to standardize, normalize, or trigger-ify card text while creating
  or editing cards.
---

# Standardize card texts & triggers

Turn free-form print into **timing-prefixed English** + **data effects** on the
right hook. Use for **new cards** and for **refactoring** existing catalogue
entries. Never invent silent approximations.

Companion skills: [author-content](../author-content/SKILL.md) (catalogue shape),
[develop-engine](../develop-engine/SKILL.md) (new `EffectDefinition` / hooks).

## Gold-standard print shape (faces)

Named synthetics use two lines (exactly this grammar when both regions exist):

```text
On roll: <clause>.
On absorb: <clause>.
```

Canonical examples in `src/game/content/faces.ts`:

| Face | Pattern |
|---|---|
| **Revelation** | Peek/bottom on roll; conditional heal on absorb |
| **Instinct** | Reposition on roll; conditional basic attack on absorb |
| **Primordial Fury** | Conditional Energy on roll; next basic +1 on absorb |

Prefer this over prose that mixes timings (“when rolled or absorbed…”).

## Hook map (where effects live)

| Print cue | Catalogue field | Fires when |
|---|---|---|
| On roll / whenever this face is rolled | Face `onRoll[]` or Overload `onRoll[]` | Die shows that face after `ROLL_DICE` |
| On absorb | Face `onAbsorb[]` or Overload `onAbsorb[]` | Symbol from that face is absorbed |
| Whenever this creature deals damage | Equipment `abilities: [{ type: "on-deal-damage", effects }]` | Bearer deals **HP** damage (not fully prevented / Shield-only) |
| Whenever toxin deals damage | `on-toxin-damage` | Toxin tick deals HP |
| When you roll [Symbol] (equipment) | `on-roll-symbol` + `symbol` | Owner rolls a die showing that symbol |
| When this creature absorbs [Symbol] | `on-absorb` (+ optional `symbols` filter) | Bearer absorbs matching symbol |

Shared hook implementation: `src/game/reducer/triggers.ts` · spec
`docs/specs/010-trigger-hooks.md`.

## Workflow (new or existing card)

Copy and track:

```text
Standardize Progress:
- [ ] 1. Capture print authority
- [ ] 2. Split into timing clauses
- [ ] 3. Map each clause → existing effect / target
- [ ] 4. Wire catalogue data OR defer honestly
- [ ] 5. Grow vocabulary only if a concrete clause needs it
- [ ] 6. Tests + DoD + DEFERRED_CATALOGUE update
```

### 1. Capture print authority

Source of truth: Figma / `002`–`004` / user CSV / existing `rulesText`.
Do not “improve” flavor by changing meaning. You **may** rewrite into the
standard timing lines if meaning is preserved.

### 2. Split into timing clauses

Rewrite `rulesText` (and face print) into discrete lines:

- Face / overload: `On roll:` / `On absorb:`
- Equipment: keep readable English, but implement via the matching ability type
- Instant / ritual: one-shot `effect` / `ritual.effects` (not standing hooks)
- Reaction: hand or ritual-reaction; chain window rules from `008` / `009`

If a clause needs a timing the engine lacks → keep print accurate, leave the
structured array empty, row in `docs/DEFERRED_CATALOGUE.md`.

### 3. Map to existing vocabulary

Prefer members already in `src/game/model/effects.ts` and selectors already in
`TargetSelector`. Examples:

| Print fragment | Prefer |
|---|---|
| Deal N / heal N | `damage` / `heal` + target |
| Gain Energy | `gain-energy` |
| Generate [Attr] | `generate-symbol` |
| Draw / discard | `draw-cards` / `discard-cards` |
| Next attack +N | `next-attack-bonus` |
| Apply toxin | `apply-toxin` |
| Strip shields | `remove-shield` |
| Auto-pick damaged ally | `{ kind: "most-damaged-ally" }` |
| Player picks enemy | `{ kind: "choose-enemy" }` |

Conditional “if …” clauses often need **new** effect fields or hooks — do not
stuff them into an unconditional effect.

### 4. Wire or defer

**Fully modellable:** set `rulesText` to standardized English **and** fill
`onRoll` / `onAbsorb` / equipment abilities / etc.

**Partial:** standardize `rulesText`; wire only complete clauses; leave other
arrays empty or omit abilities; document gaps in `DEFERRED_CATALOGUE.md`.

**Print-only (like many CSV synthetics today):** standardized `rulesText` +
empty `onRoll` / `onAbsorb` via `namedSynthetic(...)`.

### 5. Grow vocabulary (only when needed)

If a concrete card needs a new effect or hook:

1. Spec or extend the relevant `docs/specs/01N-*.md` (or OPEN_DESIGN if undecided)
2. Add to `effects.ts` / ability union / `triggers.ts`
3. Implement resolution + tests
4. Then wire the card

Never add unreachable stubs “for later.”

### 6. Verify

```bash
npm run typecheck && npm test && npm run lint
```

Focused: `src/game/reducer/triggers.test.ts`, face/overload/equipment tests as
touched. Update `002`/`004` tables when print changes.

## Authoring templates

### Face (standardized text; wire when ready)

```ts
namedSynthetic(
  EXAMPLE_FACE,
  "Example Face",
  "wild",
  "On roll: gain 1 Energy.\n" +
    "On absorb: this creature's next attack deals +1 damage.",
);
// When wiring:
// onRoll: [{ type: "gain-energy", amount: 1 }],
// onAbsorb: [{ type: "next-attack-bonus", amount: 1 }],
```

### Overload with roll + absorb

```ts
overload: {
  faceSymbols: ["toxin"], // optional gate
  onRoll: [/* … */],
  onAbsorb: [{ type: "heal", amount: 1, target: { kind: "most-damaged-ally" } }],
},
```

### Equipment standing trigger

```ts
equipment: {
  mayTargetOpponent: false,
  abilities: [
    {
      type: "on-deal-damage",
      effects: [{ type: "apply-toxin", amount: 1, target: { kind: "declared-target" } }],
    },
  ],
},
```

## Simplification heuristics

1. **One timing per line** — never bury absorb inside a roll sentence.
2. **Reuse hooks** — prefer `on-absorb` / `onRoll` over a new reducer branch.
3. **Auto vs choose** — use `most-*-*` selectors when print does not ask the
   player to pick; otherwise `choose-ally` / `choose-enemy`.
4. **Ritual Instant vs Reaction** — both leave to GY after activate; Reaction
   only changes *when* it can fire (`008`). Continuous stays / exhausts.
5. **Same meaning, shorter text** — OK; new mechanics — not OK without design.

## Anti-patterns

- Approximating (Barrier → shields) without OPEN_DESIGN
- Putting trigger logic in UI / networking
- Wiring `onRoll` while absorb clause is silently dropped from `rulesText`
- Growing `EffectDefinition` without a concrete card + tests

## More detail

- Concrete before/after examples: [examples.md](examples.md)
- Hook reference & deferred cues: [reference.md](reference.md)
