---
name: develop-engine
description: >-
  Extend the pure game engine: EffectDefinition vocabulary, reducer actions,
  resolution, phases, purity, and tests. Use when implementing new rules
  behavior, wiring deferred catalogue clauses, changing reduce()/advance(),
  RNG, or anything under src/server outside of simple catalogue data edits.
---

# Develop the game engine

## Principles

1. **One advance path** — `reduce(state, action, rng)` / `advance(state, action)`.
2. **Pure** — see `.cursor/rules/engine-purity.mdc` and `src/architecture/engine-purity.test.ts`.
3. **Small** — `.cursor/rules/scope-and-modules.mdc`. One opcode or one command per change. `module-budget.test.ts` fails DoD if you grow frozen files.
4. **Effects are data** — prefer composing opcodes in JSON (`mark`, `strip`,
   `modify`, `damage`, …). A genuinely new verb adds one `IOpcodeHandler` class
   under `src/server/ast/opcodes/` plus a compile mapping. Do not attach functions
   to `GameState` or catalogue documents.
5. **Intent actions** — players declare choices (`PLAY_CARD`, `ATTACK`, …); amounts and legality are derived by the host/engine.
6. **Failures** — return `GameError` + original state; do not throw for illegal moves.
7. **Proving cards** — print uses holder voice and
   [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md); do not default new proving
   cards to 1-token `playCost` when 2+ is enough (bible §34.5). A new token joins Mark/Strip
   X — do not add Dose-style verbs. New tokens are Mark/Strip arguments, not new opcodes.

## Typical change: new effect kind

Prefer composing existing opcodes + `ValueExpr` + `Duration` in catalogue JSON
(no engine change). If a new verb is required:

1. Add an `IOpcodeHandler` class in `src/server/ast/opcodes/` and register it.
2. Map legacy `EffectDefinition` in `AstCompiler.compileLegacy` if catalogues still use `type`.
3. Add focused tests under `src/server/reducer/*.test.ts` and/or `src/server/ast/`.
4. Wire the proving card JSON. Do not add unreachable opcodes “for later.”
5. Update `docs/RULEBOOK.md` if play changed; `docs/KEYWORDS.md` for new tokens/operators.
6. Run DoD: `npm run typecheck && npm test && npm run lint`.

## Layout cheat sheet

| Area | Path |
|---|---|
| AST / opcodes | `src/server/ast/` |
| Actions | `src/server/reducer/actions.ts` |
| Reducer facade | `src/server/reducer/reduce.ts` |
| Commands | `src/server/reducer/commands/` |
| Effect stack | `src/server/reducer/resolution.ts` |
| Zones / cards helpers | `src/server/reducer/zones.ts` |
| Setup | `src/server/setup/createMatch.ts` |
| Queries | `src/server/rules/*` |
| Scenario helpers | `src/server/testing/*` |

## Networking boundary

Host (`src/client/networking/hostSession.ts`) calls `advance()` and broadcasts state.
Clients send intent-shaped `GameAction` only; host overrides `playerId` by seat.
Never put rules in `src/client/networking/` or the UI.

## Phases

`TURN_PHASE_ORDER`: `roll` → `actions`.
`END_TURN` is an action, not a phase. Symbol generation happens inside `ROLL_DICE`,
which then enters `actions`. Absorb (creature + ritual) and `[Spend]` /
`[Requires]` checks share the unabsorbed pool throughout actions (`rolled`
die pips and `available` effect-generated symbols). There is no leftover-rolled
flip. The actions phase is one window for absorb, attacks, plays, forges, and
ready rituals (any order).
Ready rituals may activate during actions; not during roll.

## When content-only is enough

If print text maps onto existing effects, use
[author-content](../author-content/SKILL.md) and skip engine changes.
