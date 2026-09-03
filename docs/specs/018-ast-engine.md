# 018 — AST engine (validator, compiler, executor)

Status: **DONE** (2026-08-28)

Replace the 60-member `EffectDefinition` switch with a composable data AST
plus OOP services. Play stays identical: existing tests are the contract.

Related: [`012-deferred-vocabulary.md`](./012-deferred-vocabulary.md),
[`010-trigger-hooks.md`](./010-trigger-hooks.md),
[`docs/KEYWORDS.md`](../KEYWORDS.md).

## Intent

Authors express cards as JSON trees (spec `019`). The engine **validates**,
**compiles** to a typed IR, and **executes** that IR. New cards that only
compose existing opcodes + value/condition/duration nodes do not require new
TypeScript fields on a giant union. A genuinely new verb still adds one
opcode handler class + tests (Open/Closed).

`reduce()` / `advance()` remain the only mutators. They are a facade over
command handlers + `AstExecutor.drain()`.

Effects remain **data**. Catalogue JSON and `GameState` never carry functions,
classes, or closures.

## Rules

### Pipeline

```text
JSON document → AstValidator → AstCompiler → EffectNode IR → AstExecutor
```

`AstCompiler.compileLegacy(effect: EffectDefinition)` maps today’s union onto
the same IR so catalogues and tests migrate incrementally (strangler).

At execute time, if a node still has legacy `type` (old union), the executor
compiles it first.

### OOP (SOLID)

| Type | Role |
|---|---|
| `AstValidator` | Schema + semantic checks; returns issues, does not mutate |
| `AstCompiler` | JSON / legacy → `EffectNode` / `TriggerNode` |
| `OpcodeRegistry` | Maps `op` → `IOpcodeHandler` (Strategy) |
| `IOpcodeHandler` | One opcode; `execute(ctx, node) → ExecuteResult` |
| `AstExecutor` | Stack drain, target resolution, prompt pause |
| `ExecutionContext` | Wraps `Draft` + source/controller/declared targets |
| `ReduceFacade` | `reduce` / `advance` — Command router, not effect logic |

No methods on `GameState` / `PendingEffect` / catalogue objects.

### ValueExpr

Amounts are expressions, not only literals.

| `kind` | Meaning |
|---|---|
| `literal` | `{ value: number }` |
| `min` / `max` | `{ of: ValueExpr[] }` |
| `count` | `{ query: CountQuery }` (e.g. toxin on target) |
| `remaining` | Result of a prior strip / consume in this effect |
| `playCostPaid` | Header pile cost actually paid — **DEFERRED** until a proving card (do not implement silently) |

Evaluator is a method on the executor/context, used by handlers.

### Duration

| `kind` | Maps onto today’s bags (adapter; bags stay until a later collapse) |
|---|---|
| `immediate` | Apply now |
| `end-of-turn` | `attackBonusThisTurn`, `ignoreShieldThisTurn`, `bladeRainArmed`, … |
| `until-consumed` | `nextAttackBonus`, `preventDrawArmed`, `arm-requirement-wildcard`, next-incoming, next-face-twice, `playCostDiscountThisTurn` |
| `until-owners-next-turn` | `toxinReceiveCapRemaining` |
| `while-attached` | Standing passives (`attack-damage-bonus`, `play-cost-discount`, `ignore-shield`) |

Print “until EOT” is `modify` + `end-of-turn`, not a new `arm-*` opcode.

### ConditionExpr

Atoms from today’s `EffectCondition`, plus combinators:

- `all` / `any` / `not`
- `source-position`, `any-enemy-has-toxin`, `any-ally-attacked-this-turn`,
  `has-other-symbol`, `has-adjacent-ally`, `controller-has-frontline`,
  `source-is-frontline`

`branch` opcode: `{ op: "branch", when, then, else? }`. Legacy `conditional`
compiles to `branch`.

### Effect opcodes (closed set)

Generic (prefer these in new JSON):

| `op` | Replaces |
|---|---|
| `damage` / `heal` | `damage`, `heal` |
| `mark` | `apply-toxin`, `grant-shield`, `add-corruption-marker`, `add-pestilence-counter` via `token` |
| `strip` | `remove-shield`, `destroy-equipment`, `destroy-ritual`, `destroy-overload`, strip-corrupted-face (named until fully decomposed) |
| `drain-life` | Life transfer (`[Drain N]`) — damage source, heal dest for HP lost |
| `draw` / `discard` / `search` / `mill` | matching members |
| `forge` | `forge-faces` |
| `reposition` / `swap` | movers |
| `negate` | `negate-card`, `negate-ritual` (`scope`) |
| `silence` | `[Silence]` an opposing creature, field ritual, or die slot until the start of your next turn (spec `022`) |
| `bounce` | `[Bounce]` an opposing ritual, equipment, or overload to its owner’s hand (spec `023`) |
| `desynthesize` | `[Desynthesize]` a synthetic attribute face on any die to that attribute’s natural (spec `024`). Not `replace-synthetic-face` |
| `modify` | all `arm-*`, `next-attack-bonus`, `grant-next-attack-bonus`, `grant-attack-prevent`, `grant-extra-attack` |
| `generate-symbol` / `convert-symbols` | same |
| `sequence` | implicit lists + `then` |
| `branch` | `conditional` |
| `prompt` | opens a `PendingDecision` kind then resumes |

Named one-offs (keep until a second card needs composition):  
`prevent-attack-reflect`, `replace-synthetic-face`, `retain-die`,
`replay-graveyard-tactic`, `copy-pool-symbol`, `look-top-deck`,
`peek-deck-optional-bottom`, `dark-pact`, `mind-control`, `extermination`,
`reapply-die-modifiers`, `copy-other-die-face`, `optional-reroll-die`,
`remove-toxin-deal-damage`, `lock-corrupted-face-resource`,
`spread-corruption-marker`, `suppress-opposing-natural-inherent`,
`strip-corrupted-face-unusable-symbol`, `arm-wildcard-from-synthetic-pool`,
`copy-appeared-synthetic-onroll`, `optional-overcharge`,
`optional-bonus-basic-attack`.

**Mark/Strip tokens (`X`):** `toxin`, `shield`, `corruption`, `pestilence`.
New tokens add an `X` argument + GameState field, not a new opcode. Stun
stays DEFERRED (no apply opcode).

### Triggers

One form:

```text
{ when: { event, filters }, effects?: EffectNode[], modifiers?: ModifyNode[] }
```

Events: `on-roll`, `on-absorb`, `on-deal-damage`, `on-toxin-damage`,
`on-turn-start`, `on-roll-symbol`, `on-attack`, `on-take-damage`,
`on-discard`, `on-change-position`.

Passives (`attack-damage-bonus`, `play-cost-discount`, `ignore-shield`) are
`modifiers` with `duration: while-attached`, not fake events.

Face `onRoll` / `onAbsorb` compile to `when.event: on-roll | on-absorb`.

`on-take-damage.reduceBy` (`[Reduce N]`) remains a modifier applied inside `dealDamage`.

### Targeting

`TargetSelector` is unchanged as IR (`kind` union). Choose-* still opens
today’s `PendingDecision` types. Auto multi-creature kinds (`allied-frontline`,
`enemy-frontline`, `ally-all`, `enemy-all`) apply to every living match with
no prompt.

### Stack drain

Unchanged: `GameState.resolutionStack`, `config.maxResolutionSteps`, pause on
`pendingDecision`. Illegal moves still return original state.

## State Changes

No required field additions in this ship. Opcode `modify` writes the existing
arm bags / creature fields so replay and tests stay byte-stable. A later spec
may collapse bags into `timedModifiers`.

`PendingEffect.effect` may be `EffectDefinition | EffectNode` during
migration; both are JSON data.

## Actions

None new. Pending resolve actions unchanged.

## Validation

Validator rejects unknown `op`, malformed ValueExpr, missing required fields,
`choose-*` on `on-turn-start` (same restriction as today), and functions.

## Resolution

`drainResolution` delegates to `AstExecutor`. Handlers share `dealDamage`,
zone helpers, and prompt openers. Behavior must match the pre-AST switch.

## Networking

IR on the stack must JSON-serialize (PeerJS). No class instances in state.

## Persistence

None beyond catalogue JSON (`019`).

## UI

No new player-facing timing. Print still uses KEYWORDS: `[Mark N X]`,
`[Strip N X]`, `[Empower]`, prefixes (`On roll:`).

## Acceptance Criteria

- [ ] Validator, compiler, executor, registry exist under `src/server/ast/`.
- [ ] Every legacy `EffectDefinition` member has a compile mapping + handler.
- [ ] Existing reducer tests pass without changing expected play.
- [ ] New generic card needs no new union member if it composes existing ops.
- [ ] `src/server` stays pure.

## Tests

- [ ] Compiler round-trip: each legacy `type` → IR → execute equals old switch
      (covered by existing package tests + focused `ast/*.test.ts`).
- [ ] Validator: unknown op, missing target, bad duration.
- [ ] ValueExpr `literal` / `min` evaluation.
- [ ] `branch` with combinators `all` / `not`.
