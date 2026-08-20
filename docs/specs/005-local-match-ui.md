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
| Actions: roll, then **actions** for absorb / attack / play / forge / activate ritual (any order), retain, resolve search, skip to actions from roll, end turn | Reaction chain UI |
| Forge prompts for a face-pool card (or installed copy) | Auto-picked faces |
| Pending decision prompts (chooser + waiting banner), including `replace-synthetic-face` (Reforge), `choose-equipment`, and `choose-attribute-tokens` | Second legality engine in React |
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

## UI — two-phase turn (playtest 2026-08-17)

Engine: `TurnPhase` is `roll` | `actions` only (`OPEN_DESIGN.md` DECIDED). Match-ui
must not keep an Absorb phase chrome or gate absorb clicks on `phase === "absorption"`.

| Surface | Behavior |
|---|---|
| Phase bar | **Roll \| Actions** only. Highlight `state.phase`. From roll, skip/advance enters actions (or `ROLL_DICE` auto-enters actions). Last phase left only via **End turn**. Do not show or dispatch a middle Absorb step. |
| Symbol pool | During **actions**, the unabsorbed pool is both **absorb-target** and **`[Requires]` spend**. Clicking a pool pip can select it for absorb onto a creature or ritual. Effect-generated (`available`) and die (`rolled`) pips are the same pool — labels should not imply “rolled = absorb only, available = spend only”. |
| Absorb UX | Creature / ritual absorb click targets are legal whenever `phase === "actions"` (and `canAct`). After a mid-turn generate-symbol, those new pips must be absorbable without changing phase. |
| Instinct | Optional bonus basic copy is “during this turn’s actions”, not “during absorption”. Same `optional-bonus-attack` pending. |
| Lobby / help | Any three-step “Roll → Absorb → Act” copy becomes Roll → Actions. |

Do not reimplement absorb legality in React. Query `usableSymbols` / dispatch
`ABSORB_SYMBOL` / `ABSORB_SYMBOL_TO_RITUAL`; let `advance()` reject.

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
