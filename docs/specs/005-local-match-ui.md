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
| Pending decision prompts (chooser + waiting banner), including `replace-synthetic-face` (Reforge) | Second legality engine in React |
| Sticky error snackbar | |
| Catalogue still reachable from the app shell | Persistence / resume |

## Pending decisions

`MatchBoard` renders `state.pendingDecision` with a seat-gated chooser for the
controller and a waiting banner for everyone else. Resolve via
`useMatchStore.dispatch` only — query `src/game` helpers for legal options
(e.g. `legalSlotsForReplaceSyntheticFace` / `eligiblePoolFacesForReplace` for
Reforge). Do not special-case catalogue card ids.

Notable Reforge UX (`replace-synthetic-face`):

1. Pick an owned matching die slot to uninstall.
2. Pick a **different** matching face from the controller's pool.
3. Dispatch `RESOLVE_REPLACE_SYNTHETIC_FACE` (engine handles uninstall / install;
   no forge-draw).

## Acceptance criteria

- [x] `npm run dev` opens a playable hotseat match
- [x] Illegal actions leave state unchanged and surface the `GameError` code
- [x] A match can be played to victory through the UI (manual smoke; reducer autoplay covers rules)
- [x] Engine purity guard still green; store/UI never imported by `src/game`
- [x] `replace-synthetic-face` pending has chooser + waiting UI
- [x] Stay-on-slot UI: pestilence uses catalogue `pestilenceSpreadAt`; remaining forge-lock and cannot-replace shown; forge / forge-faces / Reforge omit locked slots; Activate peel stays

## Layout

```text
src/store/matchStore.ts     Zustand + advance()
src/ui/match/MatchBoard.tsx hotseat board
src/app/App.tsx             shell (Match | Catalogue)
```
