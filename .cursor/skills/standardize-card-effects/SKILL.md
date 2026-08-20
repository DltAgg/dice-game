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

## Gold-standard print shape

### Voice (holder, not original owner)

Write every clause as if the player **holding this card on their field** is
reading it. **you** / **your** = that holder. **opponent** / **opposing** /
**enemy** = the holder’s opponent. If the card is handed, forged, or equipped
onto the other side of the table, the new holder is now “you”; do not keep the
sender’s perspective. When one player chooses a target and another must
discard, strip, or pay, name both actors in the English — never leave “who
selects / who acts” ambiguous.

### Faces / overloads

```text
On roll: <clause>.
On absorb: <clause>.
```

### Standing triggers (equipment, creature passives, continuous rituals)

Use the same **On …:** prefix as the hook name (readable English after the colon).
Do **not** use “Whenever…”, “When you…”, or “When this creature…”.

| Hook | Print prefix |
|---|---|
| `on-deal-damage` | `On deal damage:` |
| `on-toxin-damage` | `On toxin damage:` |
| `on-roll-symbol` | `On roll <Symbol>:` / `On opponent roll <Symbol>:` |
| `on-absorb` | `On absorb:` / `On absorb <Symbol>:` / `On absorb Natural:` / `On absorb <Symbol>, once per turn:` |
| `on-attack` | `On attack:` / `On basic attack:` / `On special attack:` / `On attack, another ally:` |
| `on-take-damage` | `On take damage:` (add `, once per turn` before the colon when needed) |
| `on-discard` | `On discard:` |
| `attack-damage-bonus` | `On basic attack:` / `On attack:` (+N damage) |

Gate lines stay above the timing line (`Can only equip…`, `Can only overload…`).
Qualifiers use a comma before the colon (`On take damage, once per turn:`), never parentheses.

## Hook map (where effects live)

| Print cue | Catalogue field | Fires when |
|---|---|---|
| `On roll:` | Face `onRoll[]` or Overload `onRoll[]` | Die shows that face after `ROLL_DICE` |
| `On absorb:` | Face `onAbsorb[]` or Overload `onAbsorb[]` | Symbol from that face is absorbed |
| `On deal damage:` | `on-deal-damage` | Bearer deals **HP** damage |
| `On toxin damage:` | `on-toxin-damage` | Toxin tick deals HP |
| `On roll <Symbol>:` | `on-roll-symbol` + `symbol` | Matching roll (filter `rollingPlayer`) |
| `On absorb <Symbol>:` | `on-absorb` (+ filters) | Matching absorb |
| `On attack:` / `On basic attack:` / … | `on-attack` | Attack declared |
| `On take damage:` | `on-take-damage` | Incoming damage |
| `On discard:` | `on-discard` | Hand discard |
| `On change position:` | `on-change-position` | Ally moved via `setCreaturePosition` |

Shared hook implementation: `src/game/reducer/triggers.ts` · spec
`docs/specs/010-trigger-hooks.md`.

**Banned forever:** enemy push / forced move of opponent creatures. Do not
author `type: "push"` or swap/reposition targeting enemies.

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
- Equipment / passives / continuous rituals: `On deal damage:` / `On absorb:` /
  `On attack:` / … (same prefixes as hooks — never “Whenever…”)
- Instant / ritual activate: one-shot `effect` / `ritual.effects` (not standing hooks)
- Reaction: may use `On …:` for the window cue (e.g. `On prevent damage:`)

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
| Swap with frontline ally | `swap-positions` + `choose-allied-frontline` |
| Reposition ally 1 space | `reposition-creature` |
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
- Print that still says “Whenever…” / “When you…” for standing triggers —
  rewrite to `On …:` to match the hook

## More detail

- Concrete before/after examples: [examples.md](examples.md)
- Hook reference & deferred cues: [reference.md](reference.md)
