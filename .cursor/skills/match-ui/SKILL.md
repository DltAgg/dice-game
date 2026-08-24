---
name: match-ui
description: >-
  Work on hotseat/online match UI, lobby, deck builder, and catalogues. Use when
  editing MatchBoard, Lobby, deck UI, Zustand match/deck stores, or PeerJS
  session wiring from the UI side.
---

# Match UI & stores

## Boundaries

- UI dispatches `GameAction` intents via `useMatchStore.dispatch`.
- **Never** reimplement rules in React. Display `GameState`; let `advance()` decide.
- Online: `mode` is `local` | `host` | `client`. Host/client sessions live in
  `src/networking/`; store routes dispatch. Seat-gate controls with `localPlayerId`.
- Online hand dock shows **local** seat only; hotseat still follows `activePlayerId`.

## Key files

| Area | Path |
|---|---|
| Shell tabs | `src/app/App.tsx` |
| Lobby | `src/ui/match/Lobby.tsx` |
| Board | `src/ui/match/MatchBoard.tsx` |
| Metrics dashboard | `src/ui/metrics/MetricsDashboard.tsx` |
| Living rulebook | `src/ui/rulebook/RulebookPage.tsx` (renders `docs/RULEBOOK.md` + player sections of `docs/KEYWORDS.md`; do not reimplement rules) |
| Match store | `src/store/matchStore.ts` |
| Deck store | `src/store/deckStore.ts` |
| Deck repo | `src/decks/` |
| Networking | `src/networking/` |

## QoL already in the board

- Auto-roll on entering `roll` for the active seat.
- Phase bar on the energy strip: skip ahead / end turn; disabled when `!canAct`.

## Specs

- `docs/specs/005-local-match-ui.md`
- `docs/specs/006-deck-persistence.md`
- `docs/specs/007-peerjs.md`
- Metrics tab → `docs/specs/014-match-metrics.md` — observer only; do not put
  rules in the dashboard. Collector lives in `src/metrics/`.

## Verify

`npm run typecheck && npm test && npm run lint`, then `npm run dev` smoke.
