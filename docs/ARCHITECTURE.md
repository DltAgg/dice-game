# Architecture

```text
UI  →  Zustand  →  Game Commands  →  Pure Game Reducer  →  GameState
```

One rule holds the whole thing together: **a game can only advance through
`reduce()`**. Nothing else — not the store, not the host, not a debug tool —
may change game state.

That single constraint is what makes these four things the same code path:

```text
Local match     action → reduce → state
Host match      action → reduce → state → broadcast
Replay          action log → reduce → state
Test            state + action + rng → reduce → expected state
```

## Layout

```text
src/
├── game/                  the only rules authority
│   ├── model/             types: state, dice, creatures, symbols, effects, events, errors
│   ├── rng/               injectable seeded generator with a serializable snapshot
│   ├── content/           face, creature, and card definitions as data
│   ├── rules/             pure predicates and queries over GameState
│   ├── reducer/           actions, the reducer, effect resolution
│   ├── setup/             deterministic match construction
│   └── testing/           scenario helpers and an autoplay driver (test-only)
│
├── store/                 Zustand match + deck stores
├── decks/                 DeckRepository (localStorage) + loadout helpers
├── metrics/               match telemetry observer (IndexedDB / localStorage)
├── networking/            PeerJS host/client adapters (no rules)
├── ui/                    React: match board, lobby, deck builder, catalogues, metrics
├── app/                   Vite entry / shell
└── architecture/          the purity guard
```

`networking/` wraps `advance()` on the host and ships JSON state to the guest.
None of it holds rules.

## Why the engine is pure

`src/game` may not import React, Zustand, PeerJS or nanoid, and may not touch
`window`, `document`, `localStorage`, `fetch`, `Date.now` or `Math.random`.
This is checked two ways:

- `src/architecture/engine-purity.test.ts` scans every engine source file and
  fails the build. It runs under `npm run test`, which is already part of the
  Definition of Done.
- `eslint.config.js` carries the same restrictions for editor feedback.

Vitest also runs in the `node` environment, so a stray DOM call in the engine
fails rather than silently working.

## Determinism

Randomness enters through the injected `RNG` only. Its cursor lives in
`GameState.rng`, and `reduce()` writes the post-action cursor back, so a match
replays exactly from its seed and action log. `advance(state, action)` is the
convenience wrapper that derives the generator from the state it is advancing;
prefer it everywhere outside tests that specifically exercise injection.

Instance ids are counter-derived from `GameState.nextInstanceSeq` rather than
generated, so two peers replaying the same log produce byte-identical state.
Id *generation* belongs to the persistence and networking layers, which is
where nanoid will live.

## Errors

`reduce()` returns a `ReduceResult`. On failure it carries a `GameError` and
**the original state object**, so callers and tests can detect a rejected
action by reference identity. Exceptions are reserved for engine bugs and
malformed content, never for illegal player moves.

## Effects are data

Card and ability effects are a discriminated union, never functions. GameState
has to survive JSON, travel over PeerJS and be replayed from a log, none of
which works if a definition carries executable code.

## Commands

Actions describe intent. There is no `DEAL_DAMAGE` action carrying an amount,
because the amount is the host's to derive. Every action names its actor so the
host can check the sender against the claim.

## Turn phases

Playtest (2026-08-17, `OPEN_DESIGN.md` DECIDED): `TURN_PHASE_ORDER` is
`roll` → `actions`. `ROLL_DICE` enters `actions`. There is no dedicated
absorb phase. Absorb, `[Requires]` spend, attack, play, forge, and ready-ritual
activate share `actions`. `END_TURN` is an action, not a phase. `ADVANCE_PHASE`
from roll goes to actions; the last phase is left only via `END_TURN`.
