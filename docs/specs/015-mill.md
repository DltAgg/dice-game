# 015 — Mill

Status: **IMPLEMENTED** (2026-08-21)

Darkness mill vocabulary. Assumptions: mill is deck→GY, not hand discard.
Design: bible §29 · `OPEN_DESIGN.md` (2026-08-21) ·
`.cursor/skills/author-content/design.md`.

## Intent

- **Mill:** put the top N cards of a player's tactics deck into that player's
  graveyard.

## Rules

### Mill (`mill-cards`)

- Target player: `controller` or `opponent`.
- Take the front of that player's `deck` (top-first), move each card to that
  player's `graveyard`, up to `amount`.
- A short or empty deck mills what remains (including nothing). Legal whiff.
- This is **not** discard-from-hand. It does **not** fire `on-discard`.
- No deck-out loss; no reshuffle (same as draws).

## State Changes

No new `GameState` fields.

## Actions

No new actions.

## Events

- `cards-milled` — player and instance ids that left the deck.

## UI

Mill effects use existing resolution; no dedicated modal.

## Proving cards

| Id | Verb |
|---|---|
| `card-bury-the-name` | mill 3 opponent |
| `card-grave-whisper` | on-absorb Darkness mill 1 opponent |

`card-dark-pact` remains the named-from-deck mill.

## Acceptance Criteria

- [x] Mill opponent / self / empty deck
- [x] Rulebook player-facing mill
- [x] Tests in `mill.test.ts`

## Tests

- [x] `src/server/reducer/mill.test.ts`
