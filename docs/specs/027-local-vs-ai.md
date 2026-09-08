# 027 — Local Play vs AI

Status: **IMPLEMENTED**

A local match on one machine: one human seat, one headless AI seat. UI and
store only. Play rules are unchanged.

## Intent

Lobby offers **Play vs AI** beside **Local hotseat**. The human plays their
bound seat; `src/ai` (`chooseAction`, `legalActions`, spec `026`) fills the
other seat by emitting `GameAction` intents. The store still calls
`advance()` via `dispatchHotseat` / `drainEmptyReactionPriority`.

## Rules

None. AI choices are policy, not rules. Do not fold this into
`docs/RULEBOOK.md`.

## State Changes

None on `GameState`. The match store holds:

- `localPlayerId` — the human seat (hotseat remains `null`)
- `aiPlayerId` — the AI seat
- `aiStrength` — `fast` | `standard` | `strong` (lobby default `standard`)
- `aiRng` — policy RNG snapshot, derived from `seed ^ 0x9e3779b9`, never
  `GameState.rng`

## Actions

None. The AI only submits existing `GameAction` variants.

## Validation

Candidate intents come from `legalActions` (probed with `advance()`). Illegal
intents are refused by the reducer and leave state unchanged.

## Resolution

After match start and after every successful human `dispatch`:

1. If `status !== "in-progress"`, stop.
2. If `actingPlayerId` is not the AI seat, stop (human holds the turn,
   pending, or reaction).
3. `legalActions` → `chooseAction` → `dispatchHotseat`.
4. Repeat until the human must act, the match finishes, or a safety cap
   (80 steps).

## Networking

None. Mode stays `local`. Online host/join is unchanged.

## Persistence

None. Loadouts are the same saved/builtin decks as hotseat.

## UI

- Lobby: **Play vs AI** — human seat (P1 default), Human / AI deck dropdowns,
  optional strength, **Start vs AI**.
- Seat-gate: `localPlayerId` set → only that seat may act (same as online).
  Hotseat (`localPlayerId === null`, not online) still acts for both.
- Hand dock shows the human seat only (`localPlayerId !== null`).
- Auto-roll / auto-pass use `canAct`; they do not fire for the AI seat.

## Acceptance Criteria

- [x] `startVsAi` sets `localPlayerId` to the human seat; `startLocal` still
      sets `null`.
- [x] After a human dispatch, the AI fills while it is the acting seat.
- [x] If the AI sits P1, it acts after match start (human need not click).
- [x] Hotseat and online host/join still work.
- [x] `src/server` does not import `src/ai`. Client may import `@ai`.
- [x] `MatchBoard.tsx` / `Lobby.tsx` stay under the module budget.

## Tests

- [x] `src/client/store/matchStore.test.ts` — `startVsAi` binding, human then
      AI fill, hotseat unbound.
- [x] `src/client/ui/match/seatGate.test.ts` — vs-AI cannot act for the AI seat.
- [x] `src/architecture/ai-slice.test.ts` — server isolation; client may import
      `@ai`.
