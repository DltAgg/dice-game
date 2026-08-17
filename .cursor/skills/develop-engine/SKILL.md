---
name: develop-engine
description: >-
  Extend the pure game engine: EffectDefinition vocabulary, reducer actions,
  resolution, phases, purity, and tests. Use when implementing new rules
  behavior, wiring deferred catalogue clauses, changing reduce()/advance(),
  RNG, or anything under src/game outside of simple catalogue data edits.
---

# Develop the game engine

## Principles

1. **One advance path** — `reduce(state, action, rng)` / `advance(state, action)`.
2. **Pure** — see `.cursor/rules/engine-purity.mdc` and `src/architecture/engine-purity.test.ts`.
3. **Effects are data** — extend `src/game/model/effects.ts`, never attach functions.
4. **Intent actions** — players declare choices (`PLAY_CARD`, `ATTACK`, …); amounts and legality are derived by the host/engine.
5. **Failures** — return `GameError` + original state; do not throw for illegal moves.

## Typical change: new effect kind

1. Add a member to `EffectDefinition` (and `TargetSelector` if needed) in `effects.ts`.
2. Implement resolution in `src/game/reducer/resolution.ts` (and call sites).
3. Add focused tests under `src/game/reducer/*.test.ts`.
4. Wire the concrete card/creature/face that needed it in `src/game/content/*`.
5. Remove or shrink the matching row in `docs/DEFERRED_CATALOGUE.md`.
6. Run DoD: `npm run typecheck && npm test && npm run lint`.

Do **not** add unreachable effect kinds “for later.”

## Layout cheat sheet

| Area | Path |
|---|---|
| Actions | `src/game/reducer/actions.ts` |
| Reducer | `src/game/reducer/reduce.ts` |
| Effect stack | `src/game/reducer/resolution.ts` |
| Zones / cards helpers | `src/game/reducer/zones.ts` |
| Setup | `src/game/setup/createMatch.ts` |
| Queries | `src/game/rules/*` |
| Scenario helpers | `src/game/testing/*` |

## Networking boundary

Host (`src/networking/hostSession.ts`) calls `advance()` and broadcasts state.
Clients send intent-shaped `GameAction` only; host overrides `playerId` by seat.
Never put rules in `networking/` or the UI.

## Phases

`TURN_PHASE_ORDER`: `roll` → `actions`.
`END_TURN` is an action, not a phase. Symbol generation happens inside `ROLL_DICE`,
which then enters `actions`. Absorb (creature + ritual) and `[Requires]` spend
share the unabsorbed pool throughout actions (`rolled` die pips and `available`
effect-generated symbols). There is no leftover-rolled flip. The actions phase
is one window for absorb, attacks, plays, forges, and ready rituals (any order).
Ready rituals may activate during actions; not during roll.

## When content-only is enough

If print text maps onto existing effects, use
[author-content](../author-content/SKILL.md) and skip engine changes.
