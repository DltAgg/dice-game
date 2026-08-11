# 007 — PeerJS host authority (Milestone 5)

Status: **IMPLEMENTED**

Online two-player matches over PeerJS. The host alone runs `advance()`; the
client sends intent-shaped `GameAction`s and renders authoritative state.
Hotseat local play remains available.

## Intent

```text
Client UI → submit-action → Host (advance) → state broadcast → both UIs
```

## Rules

- Only `reduce()` / `advance()` changes game state (ARCHITECTURE).
- Host owns RNG, validation, and the live `GameState`.
- Client never applies a local reduce for remote play except by replacing state
  with what the host sent.
- Host binds each peer to a seat (`p1` host, `p2` guest) and **overrides**
  `action.playerId` to that seat.
- Room codes are short `nanoid` strings and are not `matchId` or `playerId`.

## State Changes

No new `GameState` fields. Networking state lives in the match store / sessions.

## Actions

No new game actions. Wire messages wrap existing `GameAction`.

## Validation

Host rejects actions that fail `advance`, or whose sender is not the bound seat
/ not the active player path the reducer already enforces. Rejects return
`GameError` plus the current authoritative state.

## Resolution

Host: `advance(state, action)` then broadcast `{ type: "state", state }`.

## Networking

Requires host authority. Client is not a source of dice rolls, damage, or draws.

## Persistence

Does not persist matches. Deck loadouts still come from local `DeckRepository`.

## UI

- Lobby: Local hotseat | Host room | Join room (code + deck)
- Online match: room code, connection status, only bound seat may act
- Resync: client may request current host state after reconnect

## Acceptance Criteria

- [x] Spec written; README / ARCHITECTURE updated
- [x] Host creates room; client joins; shared state advances
- [x] Illegal actions surface host `GameError`
- [x] Resync restores host state
- [x] Hotseat still works; purity / typecheck / test / lint green

## Tests

- [x] Protocol parse rejects malformed messages
- [x] Fake-transport host/client seat bind + advance + reject
- [ ] Manual: two browser tabs host + join

## Manual smoke

1. `npm run dev` in two tabs.
2. Tab A: **Play** → Host room (pick a deck) → copy room code from the match header.
3. Tab B: **Play** → Join room with code (pick a deck).
4. Play a few turns; confirm only the active seat can act.
5. On the guest tab, click **Resync** after a brief disconnect or to re-pull host state.
