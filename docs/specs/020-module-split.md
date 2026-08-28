# 020 — Module split (reducer + match UI)

Status: **DONE** (2026-08-28)

Carve oversized files into digestible modules. Guideline: prefer ≤ ~400 lines
for new/split files; tests may be larger. No rules in UI.

## Intent

Reduce agent token cost and make ownership obvious. Behavior unchanged.

## Reducer (server) — Command pattern

[`reduce.ts`](../../src/server/reducer/reduce.ts) stays a **facade**:
pending-decision gate, `createDraft`, dispatch, write RNG snapshot.

| Module | Commands / helpers |
|---|---|
| `commands/rollDice.ts` | `ROLL_DICE`, face/overload on-roll fire |
| `commands/absorb.ts` | `ABSORB_SYMBOL` |
| `commands/attack.ts` | `ATTACK` |
| `commands/playCard.ts` | `PLAY_CARD` (effect / equip / overload / ritual place) |
| `commands/forge.ts` | `FORGE_CARD`, `ACTIVATE_FACE`, install helpers |
| `commands/ritual.ts` | `ACTIVATE_RITUAL`, exhaust reset |
| `commands/turn.ts` | `ADVANCE_PHASE`, `END_TURN`, finish-turn cleanup |
| `commands/priority.ts` | `PASS_PRIORITY`, chain drain, conduct link |
| `pending/resolvers.ts` | All `RESOLVE_*` handlers (search, discard, choose-*, forge-faces, …) |
| `payments.ts` | Header / forge / requires / spend / wildcards |

`AstExecutor` owns effect drain (`018`). `resolution.ts` keeps shared
mutators (`dealDamage`, shield/toxin, victory, prompt helpers) used by
opcodes and commands.

## Match UI (client)

[`MatchBoard.tsx`](../../src/client/ui/match/MatchBoard.tsx) splits into:

```text
src/client/ui/match/
  MatchBoard.tsx          shell + Zustand wiring + intent bar
  board/                  Battlefield, AttributePile, RitualTile, CreatureTile,
                          dice/faces, HandStrip, ZoneDocks, PhaseBar, arrows
  intents/                hint copy, play/forge/absorb/attack helpers
  modals/                 one pending-decision modal per file
  tooltips/               inspect hovers, anchored tooltip hooks
```

[`DeckBuilder.tsx`](../../src/client/ui/decks/DeckBuilder.tsx): rows, search,
preview extracted.

[`matchStore.ts`](../../src/client/store/matchStore.ts):

- `localMatchEngine.ts` — hotseat `createMatch` / `advance`
- `onlineSessionController.ts` — PeerJS host/client lifecycle
- `matchStore.ts` — thin Zustand facade

UI calls engine queries; it does not invent legality. Rejected actions still
come from `advance()`.

## Rules

File splits are mechanical. Do not change timing, copy, or CSS behavior
except where a default export must be re-exported from the shell.

## State Changes

None.

## Actions

None.

## Validation

Typecheck + existing UI-adjacent tests (`seatGate`, `autoPassPriority`,
`routes`).

## Resolution

N/A.

## Networking

`onlineSessionController` still the only client that constructs
`HostSession` / `ClientSession`.

## Persistence

Unchanged.

## UI

Same screens, same controls. Verify lobby → match → pending modals still
open after the split.

## Acceptance Criteria

- [x] `reduce.ts` facade is far smaller than 2579 lines; families live in
      `commands/` + `pending/`.
- [ ] `MatchBoard.tsx` is a shell; modals/board/intents live beside it.
- [ ] `matchStore.ts` does not inline PeerJS + local reduce + metrics in one
      blob.
- [ ] No rules implemented in `src/client`.

## Tests

- [ ] Full `npm test`.
- [ ] `src/client/app/routes.test.ts`, `seatGate.test.ts`,
      `autoPassPriority.test.ts`.
