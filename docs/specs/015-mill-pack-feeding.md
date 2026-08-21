# 015 — Mill and pack feeding

Status: **IMPLEMENTED** (2026-08-21)

Darkness mill and Wild pack feeding so each attribute’s exclusive verb has
engine vocabulary. Assumptions: ally-only token share; mill is deck→GY, not
hand discard. Design: bible §29 · `OPEN_DESIGN.md` (2026-08-21) ·
`.cursor/skills/author-content/design.md`.

## Intent

- **Mill:** put the top N cards of a player’s tactics deck into that player’s
  graveyard.
- **Pack feeding:** move or copy absorbed **attribute tokens** from one allied
  creature to another.

## Rules

### Mill (`mill-cards`)

- Target player: `controller` or `opponent`.
- Take the front of that player’s `deck` (top-first), move each card to that
  player’s `graveyard`, up to `amount`.
- A short or empty deck mills what remains (including nothing). Legal whiff.
- This is **not** discard-from-hand. It does **not** fire `on-discard`.
- No deck-out loss; no reshuffle (same as draws).

### Pack feeding (`transfer-attribute-tokens` / `copy-attribute-tokens`)

- Both creatures must be living **allies** of the controller. Enemy targets
  whiff (no token steal unless a future card prints it).
- Source and destination must differ. Source with 0 tokens is a legal whiff.
- `amount` pips. Homogeneous piles and “take all remaining” are deterministic
  (`discardTokensInAttributeOrder`). Mixed leftover piles open
  `choose-attribute-tokens` with `mode: "transfer" | "copy"` and a
  `destinationCreatureId`.
- **Transfer** removes the pips from the source and adds them to the dest.
- **Copy** adds the pips to the dest; the source keeps them.
- Creature choices reuse `choose-creature` (from, then to). Filters:
  `ally-with-tokens`, `ally-other`, `adjacent-ally` (`creatureIds` ±1, living).

## State Changes

No new `GameState` fields. Tokens stay on `CreatureState.attributeTokens`.
Pending: `choose-attribute-tokens.mode` / `destinationCreatureId`.

## Actions

No new actions. Existing `RESOLVE_CHOOSE_CREATURE` and
`RESOLVE_CHOOSE_ATTRIBUTE_TOKENS`.

## Events

- `cards-milled` — player and instance ids that left the deck.
- `attribute-tokens-moved` — from / to / pile / `copy` flag.

## UI

MatchBoard: existing creature picker (new filter hints) and token-pick modal
titled move/copy vs discard. Prompt line uses the pending `mode`.

## Proving cards

| Id | Verb |
|---|---|
| `card-bury-the-name` | mill 3 opponent |
| `card-grave-whisper` | on-absorb Darkness mill 1 opponent |
| `card-share-the-kill` | transfer 1 token ally→ally |
| `card-den-share` | on-absorb Wild copy 1 onto another ally |
| `face-synthetic-pack-share` | on-absorb copy 1 onto adjacent ally |

`card-dark-pact` remains the named-from-deck mill.

## Acceptance Criteria

- [x] Mill opponent / self / empty deck
- [x] Transfer, copy, mixed-pile choice, enemy dest refused
- [x] Rulebook player-facing mill + pack feeding
- [x] Tests in `mill.test.ts` / `packFeeding.test.ts`

## Tests

- [x] `src/game/reducer/mill.test.ts`
- [x] `src/game/reducer/packFeeding.test.ts`
