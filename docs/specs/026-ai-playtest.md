# 026 — Headless AI playtest slice

Status: **IMPLEMENTED**

A third vertical slice: two seeded AIs play a legal match to completion through
`advance()` only. No UI, no store, no PeerJS, and no edits to the reducer.

Existing `src/server/testing/autoplay.ts` stays test-only. This slice does not
replace it and does not import it.

## Intent

Designers can run local playtests without sitting at the board. Both seats are
policy actors that emit `GameAction` intents. The engine remains the only rules
authority.

## Rules

None. AI choices are **policy**, not rules. Illegal intents are refused by
`reduce()` and never mutate state. Play itself is unchanged; do not fold this
into `docs/RULEBOOK.md`.

## Layout

```text
src/ai/          headless playtest actor — consumes the public `@server` barrel
src/server/      pure rules (unchanged; must not import src/ai)
src/client/      UI / store / networking (unchanged; must not import src/ai)
```

`src/ai` is a sibling of `src/server`, not a reducer module. That keeps CLI I/O
and policy out of the purity boundary, and keeps the engine from depending on
an actor.

## State Changes

None. `GameState` is unchanged. The driver holds its own seeded RNG for
tie-breaks so policy does not consume match entropy.

## Actions

None. The AI only submits existing `GameAction` variants.

## Validation

Candidate intents are proposed from public queries (`legalTargetsFor`,
`canAffordPlay`, pending helpers, …) then **probed** with `advance()`. Only
intents the reducer accepts are considered legal. The AI does not copy
command-handler legality.

## Resolution

The driver loop:

1. If `status !== "in-progress"`, stop.
2. Decide the actor: pending `controllerId` / reaction `priorityPlayerId`, else
   `activePlayerId`.
3. Collect probed-legal intents for that actor.
4. Choose with a hybrid policy (not rules):
   - **Eval** — living creatures, remaining life, shields, pile, hand, board
     attachments. Terminal win/loss dominate.
   - **1-ply lookahead** (`fast`) — simulate each intent, pick the best eval.
     `ROLL_DICE` simulations fork RNG so search does not peek at the match's
     real next roll.
   - **Alpha-beta minimax** — small / pending / reaction trees (`standard`
     depth 2, `strong` depth 3).
   - **UCB1 MCTS** — wide action windows; greedy-prior rollouts, most-visited
     child.
5. `advance(state, chosen)` on the real match (never the search fork).
6. Repeat until a winner, `maxTurns`, or a stall.

`chooseAction` defaults to `standard` (human-playable). `runPlaytestMatch`
defaults to `fast` so CI stays cheap. CLI `--strength` selects the preset.

## Networking

None. This slice never talks to PeerJS.

## Persistence

None.

## UI

None in this slice, by design. A later `match-ui` change can call
`chooseAction(state, legal, rng)` (`standard` / `strong`) for a human vs AI
seat.

## Acceptance Criteria

- [x] `src/ai` imports only the public `@server` barrel (not `@server/*`,
      `@client/*`, or `src/server` internals).
- [x] `src/server` and `src/client` do not import `src/ai`.
- [x] Reducer, resolution, and MatchBoard are untouched.
- [x] Two builtin loadouts can play a seeded match to a decided `winner` or a
      reported stall.
- [x] The same seed and loadouts reproduce the same winner, turn count, and
      action log.
- [x] `npm run playtest:ai` runs a match without opening the UI.

## Tests

- [x] `src/ai/playtestAi.test.ts` — seeded finish, determinism, isolation of
      policy from rules.
- [x] `src/ai/search.test.ts` — eval, 1-ply prefers attacks, standard picks
      ROLL_DICE on the opener.
- [x] `src/architecture/ai-slice.test.ts` — import boundary.
