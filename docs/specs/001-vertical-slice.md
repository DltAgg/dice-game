# 001 — Deterministic local vertical slice

Status: **IMPLEMENTED**

Covers the vertical slice of SPDD §46 and the first milestone of §54: a
two-player match that can be played start to finish through the pure reducer,
with no UI, no store and no networking in the call stack.

## Intent

Two players each field three creatures and two customizable dice. On a turn a
player rolls, then in one **actions** window absorbs symbols onto creatures
(or rituals), spends leftover pips for `[Requires]`, attacks, plays cards /
forges, and passes the turn. Reducing an opponent's squad to zero wins.

## Rules

| Rule | Source |
|---|---|
| Each player fields 3 creatures; eliminating all opposing creatures wins | §4 |
| Each player owns 2 customizable d6 | §5, §9 |
| A die has exactly 6 physical faces | §9 |
| A die holds at most 4 faces of one attribute | §9.1 |
| A face card is either in its owner's pool or backing installed faces | §12 |
| Face card ownership is independent of the die it sits on | §12 |
| A stunned die is not rolled and contributes nothing | §22 |
| A player may hold at most one stunned die | §22 |
| A retained die keeps its result instead of rerolling | §21 |
| Nothing but a retained die survives the turn; symbols expire | §15, §21, decision of 2026-08-07 |
| An absorbed symbol leaves engine resolution for good | §7 |
| The absorbing die sits on the creature until end of turn | §7 |
| At end of turn an absorbed attribute becomes a token; an absorbed Shield grants a shield immediately | §7, decision of 2026-08-11 |
| Engine abilities are paid from the shared symbol pool | §17 |
| Attacks are paid from the attacker's own absorbed tokens | §7, decision of 2026-08-07 |
| An attack may list `requires` (gate) and/or `discards` (`[Spend]`) | pile fuel |
| A shield prevents 1 damage once, stacks, and persists across turns | decision of 2026-08-07 |
| The player chooses the order engine effects resolve in | §17 |
| A creature makes at most one attack per Combat phase | §7 |
| The frontline protects the back row; Range ignores that | §6 |
| Turn flow: roll, then actions (absorb / spend / attack / play / forge), end | §16, playtest 2026-08-17 |
| One shared Energy marker; crossing zero ends the turn | §18, decision of 2026-08-07 |
| First turn 3 Energy; clean pass 5; overshoot pass = overshoot + 2 | decision of 2026-08-14 |

Because fuel appears only at end of turn, a creature can never attack on the
turn it absorbed. Turn 1 is necessarily spent arming.

The one prototype assumption left in this slice is the strict frontline reading.
It is registered in `../OPEN_DESIGN.md` and read from `GameRulesConfig`.

## State Changes

`phase`, `turn`, `activePlayerId`, `status`, `winner`, `energy`, `symbols`,
`dice[*].rolledSlotIndex`, `dice[*].attachedToCreatureId`, `creatures[*].damage`,
`creatures[*].defeated`, `creatures[*].attacksUsedThisCombat`,
`creatures[*].attributeTokens`, `creatures[*].shields`, `resolutionStack`,
`log`, `rng`, `nextInstanceSeq`.

## Actions

`ROLL_DICE`, `ABSORB_SYMBOL`, `ABSORB_SYMBOL_TO_RITUAL`, `ADVANCE_PHASE`,
`ATTACK`, `PLAY_CARD`, `FORGE_CARD`, `ACTIVATE_RITUAL`, `END_TURN`, …. Each names
its actor and describes intent only — no action carries a damage figure, a dice
result or a symbol count.

## Validation

The match must be in progress and the actor must be the active player. Beyond
that each action checks its own phase, ownership, entity existence and defeat
state. Attacks check the attacker's tokens, targeting and the per-combat attack
limit. An illegal action returns a `GameError` and the original state object
unchanged, by reference.

## Resolution

Effects are pushed onto an explicit `resolutionStack` and drained in order, so
an effect that produces another effect joins the same structure instead of
recursing. A cascade longer than `maxResolutionSteps` aborts deterministically
and is logged.

## Networking

Not in this slice. Every action is already host-authoritative in shape: the
reducer derives all outcomes, and the RNG cursor lives in `GameState` so the
host can replay a match from its action log.

## Persistence

None. The engine performs no I/O.

## UI

None in this slice, by design.

## Acceptance Criteria

- [x] A match can be created deterministically from a seed and a squad.
- [x] Rolling produces one symbol per unstunned die and enters actions.
- [x] An absorbed symbol is unavailable to the engine for the rest of the turn.
- [x] An absorbed attribute becomes a token at end of turn; an absorbed Shield grants a shield immediately.
- [x] The absorbing die is freed at end of turn.
- [x] Engine abilities consume pool symbols and can chain, with order mattering.
- [x] Attacks are payable only from the attacker's tokens, never from the pool.
- [x] A plain requirement leaves its fuel intact; a discard burns it.
- [x] A creature cannot attack on the turn it was fuelled.
- [x] Shields prevent damage, are spent doing so, and survive the turn.
- [x] Attacks respect the frontline and honour Range.
- [x] A creature attacks at most once per turn (actions phase).
- [x] Damage defeats a creature and defeat can end the match.
- [x] The Energy marker moves between players on a turn transition.
- [x] An illegal action leaves state untouched.
- [x] The same seed and action sequence reproduce a match exactly.
- [x] A full match runs to a decided victory through `reduce()` alone.

## Tests

- [x] `src/game/rng/rng.test.ts` — determinism, snapshot resume, seed independence.
- [x] `src/game/setup/createMatch.test.ts` — setup invariants and serialization.
- [x] `src/game/reducer/dice.test.ts` — rolling, stun, retention, replay.
- [x] `src/game/reducer/absorption.test.ts` — the tradeoff and what absorbing pays out.
- [x] `src/game/reducer/engine.test.ts` — costs, chaining, ordering, symbol expiry.
- [x] `src/game/reducer/combat.test.ts` — token funding, shields, frontline, Range, victory.
- [x] `src/game/rules/energy.test.ts` — track arithmetic and turn transition.
- [x] `src/game/reducer/invariants.test.ts` — the invariants of SPDD §38.
- [x] `src/game/reducer/match.test.ts` — full matches to victory.
- [x] `src/architecture/engine-purity.test.ts` — the engine imports no outer layer.
