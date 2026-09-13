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

Two players share one browser (hotseat). The turn player conducts **actions**;
the inactive side is read-only then. **Roll** is one `ROLL_DICE` from the turn
player that randomizes **both** seats’ dice (convert Choose one still binds
the die owner via `pendingChooserId`).

Local **Play vs AI** is a sibling lobby mode (spec
[`027-local-vs-ai.md`](./027-local-vs-ai.md)): `localPlayerId` is the human
seat; the other seat is filled by `src/ai`. Hotseat is unchanged
(`localPlayerId: null`).

## Scope

| In | Out |
|---|---|
| Zustand store owning `GameState` + last reject error | PeerJS / host authority |
| New match (seeded) with prototype squads / decks / face decks | Deck builder |
| Board: creatures, dice faces, symbols, attribute pile, phase, hand | Fancy card art on the board (catalogue remains separate) |
| Actions: roll, then **actions** for absorb / attack / play / forge / activate ritual (any order), retain, resolve search, skip to actions from roll, end turn | Reaction chain UI |
| Forge prompts for a face-pool card (or installed copy) | Auto-picked faces |
| Pending decision prompts (chooser + waiting banner), including `choose-equipment` and `choose-attribute-tokens`. `replace-synthetic-face` (Reforge / Cross forge) is **removed** | Second legality engine in React |
| Sticky error snackbar | |
| Catalogue still reachable from the app shell | Persistence / resume |

## Pending decisions

`MatchBoard` renders `state.pendingDecision` with a seat-gated chooser for the
controller and a waiting banner for everyone else. The chooser may complete the
pending even when they are not the turn player (`actingPlayerIdOf` follows
`pendingChooserId`). Resolve via
`useMatchStore.dispatch` only — query `@server` helpers for legal options.
Do not special-case catalogue card ids. HandStrip Play
is enabled when `hasPlayableEffect` and `canAffordPlay` both pass
(`canResolvePlayEffects` was a Reforge play-refusal helper and is **removed**).

`replace-synthetic-face` pending UX is **removed** (no pending type, no
`RESOLVE_REPLACE_SYNTHETIC_FACE`, no `eligiblePoolFacesForReforge`, no chooser
modal).

## UI — two-phase turn

Engine: `TurnPhase` is `roll` | `actions` only. No absorb phase — banking and
Shield absorb happen during **actions** via `ABSORB_SYMBOL`.

| Surface | Behavior |
|---|---|
| Phase bar | **Roll \| Actions** only. Highlight `state.phase`. Auto-`ROLL_DICE` as the turn player rolls **both** seats, then enters actions. Last phase left only via **End turn**. |
| Symbol pool | During **actions**, the unabsorbed pool is for banking and `[Requires]` spend. Clicking a pool pip can select it for absorb (attribute → pile, Shield → creature). Effect-generated (`available`) and die (`rolled`) pips share the same pool. |
| Absorb UX | Banking and Shield absorb are legal whenever `phase === "actions"` (and `canAct`). Mid-turn generated pips must be absorbable without changing phase. |
| Lobby / help | Two-step flow: Roll → Actions. |

Do not reimplement absorb legality in React. Dispatch `ABSORB_SYMBOL`; let
`advance()` reject.

## Acceptance criteria

- [x] `npm run dev` opens a playable hotseat match
- [x] Illegal actions leave state unchanged and surface the `GameError` code
- [x] A match can be played to victory through the UI (manual smoke; reducer autoplay covers rules)
- [x] Engine purity guard still green; store/UI never imported by `src/server`
- [x] `replace-synthetic-face` pending **removed**
- [x] Stay-on-slot UI: pestilence uses catalogue `pestilenceSpreadAt`; remaining forge-lock and cannot-replace shown; forge / forge-faces omit locked slots; Activate peel stays

## Layout

```text
src/store/matchStore.ts     Zustand + advance()
src/ui/match/MatchBoard.tsx hotseat board
src/app/App.tsx             shell (Match | Catalogue)
```

Frontline is two fixed columns from `frontlineLaneSlots`; empty seats stay empty (spec `029`).
