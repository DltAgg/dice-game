---
name: match-ui
description: >-
  Work on hotseat/online match UI, lobby, deck builder, and catalogues. Use when
  editing MatchBoard, Lobby, deck UI, Zustand match/deck stores, or PeerJS
  session wiring from the UI side.
---

# Match UI & stores

## Boundaries

- **Slice:** extract under `board/` / `modals/` / `intents/` instead of growing
  `MatchBoard.tsx`. See `scope-and-modules.mdc` and `module-budget.test.ts`.
- UI dispatches `GameAction` intents via `useMatchStore.dispatch`.
- **Never** reimplement rules in React. Display `GameState`; let `advance()` decide.
- Online: `mode` is `local` | `host` | `client`. Host/client sessions live in
  `src/client/networking/`; store routes dispatch. Seat-gate controls with `localPlayerId`.
- Online hand dock shows **local** seat only; hotseat still follows `activePlayerId`.

## Key files

| Area | Path |
|---|---|
| Shell tabs | `src/client/app/App.tsx` |
| Lobby | `src/client/ui/match/Lobby.tsx` |
| Board | `src/client/ui/match/MatchBoard.tsx` |
| Metrics dashboard | `src/client/ui/metrics/MetricsDashboard.tsx` |
| Living rulebook | `src/client/ui/rulebook/RulebookPage.tsx` (renders `docs/RULEBOOK.md` + player sections of `docs/KEYWORDS.md`; do not reimplement rules) |
| Match store | `src/client/store/matchStore.ts` |
| Deck store | `src/client/store/deckStore.ts` |
| Deck repo | `src/client/decks/` |
| Networking | `src/client/networking/` |

## QoL already in the board

- Auto-roll on entering `roll` for the active seat.
- Phase bar on the pile strip: skip ahead / end turn; disabled when `!canAct`.

## Specs

- `docs/specs/005-local-match-ui.md`
- `docs/specs/006-deck-persistence.md`
- `docs/specs/007-peerjs.md`
- Metrics tab → `docs/specs/014-match-metrics.md` — observer only; do not put
  rules in the dashboard. Collector lives in `src/client/metrics/`.

## Verify

`npm run typecheck && npm test && npm run lint`, then `npm run dev` smoke.
