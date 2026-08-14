# 005 — Local match UI (Milestone 3)

Status: **IMPLEMENTED**

A hotseat local match driven entirely through Zustand → `advance()` →
`GameState`. No PeerJS, no persistence. Catalogue depth remains deferred
([`docs/DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md)).

## Intent

Prove the architectural stack outside tests:

```text
UI  →  Zustand match store  →  advance(action)  →  GameState
```

Two players share one browser (hotseat). The active player is always the one
who may act; the inactive side is read-only until the turn passes.

## Scope

| In | Out |
|---|---|
| Zustand store owning `GameState` + last reject error | PeerJS / host authority |
| New match (seeded) with prototype squads / decks / face decks | Deck builder |
| Board: creatures, dice faces, symbols, energy, phase, hand | Fancy card art on the board (catalogue remains separate) |
| Actions: roll, absorb, then one **actions** phase for attack / play / forge / activate ritual (any order; rituals also during absorb), retain, resolve search, advance phase, end turn | Reaction chain UI |
| Forge prompts for a face-pool card (or installed copy) | Auto-picked faces |
| Sticky error snackbar | |
| Catalogue still reachable from the app shell | Persistence / resume |

## Acceptance criteria

- [x] `npm run dev` opens a playable hotseat match
- [x] Illegal actions leave state unchanged and surface the `GameError` code
- [x] A match can be played to victory through the UI (manual smoke; reducer autoplay covers rules)
- [x] Engine purity guard still green; store/UI never imported by `src/game`

## Layout

```text
src/store/matchStore.ts     Zustand + advance()
src/ui/match/MatchBoard.tsx hotseat board
src/app/App.tsx             shell (Match | Catalogue)
```
