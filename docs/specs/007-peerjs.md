# 007 — PeerJS host authority (Milestone 5)

Status: **IMPLEMENTED**

Online two-player matches over PeerJS. The host alone runs `advance()`; the
client sends intent-shaped `GameAction`s and renders authoritative state.
Hotseat local play remains available.

## Intent

```text
Client UI → submit-action → Host (advance) → state broadcast → both UIs
```

Reconnect (page reload or dropped DataConnection):

```text
Guest hello (new PeerJS id) → Host rebinds p2, replaces stale guest conn
→ welcome(state) → guest auto resync-request → authoritative GameState
```

## Rules

- Only `reduce()` / `advance()` changes game state (ARCHITECTURE).
- Host owns RNG, validation, and the live `GameState`.
- Client never applies a local reduce for remote play except by replacing state
  with what the host sent.
- Host binds each peer to a seat (`p1` host, `p2` guest) and **overrides**
  `action.playerId` to that seat.
- Room codes are short `nanoid` strings and are not `matchId` or `playerId`.
- There is a single guest seat. A later `hello` for the live room **replaces**
  the existing guest connection (reconnect after refresh issues a new PeerJS
  id). It is not refused as a duplicate join. Guest loadout is used only when
  the match is first created.

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

- Host PeerJS id **is** the room code so the guest can dial it after a reload.
- Guest PeerJS id is ephemeral; reconnect is by room code, not by peer id.
- After `welcome`, the guest automatically sends `resync-request`.
- Host refresh: recreate a Peer with the same room-code id (retry
  `unavailable-id`), restore last in-tab `GameState` snapshot, wait for guest
  `hello`. Unload does **not** send `room-closed` so a still-mounted guest retries.
- Explicit **Leave** still sends `room-closed`.

## Persistence

Does not persist matches to a backend or `localStorage`. Deck loadouts still
come from local `DeckRepository`.

Tab `sessionStorage` holds a reconnect **hint** (role, room code, deck id, and
on the host the last `GameState` JSON) so a refresh of **that tab** can resume
the same PeerJS room. A new tab, another device, or a dead PeerJS broker cannot
recover the match.

## UI

- Lobby: Local hotseat | Host room | Join room (code + deck)
- Online match: room code, connection status, only bound seat may act
- Refresh: this tab auto-resumes host (same room code) or re-joins as guest
- Manual: **Resume room** / **Rejoin** / Join with the same code if auto-resume
  missed
- Resync: client also exposes a **Resync** button; `resync-request` already
  runs after every `welcome`

## Acceptance Criteria

- [x] Spec written; README / ARCHITECTURE updated
- [x] Host creates room; client joins; shared state advances
- [x] Illegal actions surface host `GameError`
- [x] Resync restores host state
- [x] Guest reload (new peer id, same room code) rebinds p2 and restores host state
- [x] Stale guest connection is replaced rather than ignored as a duplicate
- [x] Hotseat still works; purity / typecheck / test / lint green

## Tests

- [x] Protocol parse rejects malformed messages
- [x] Fake-transport host/client seat bind + advance + reject
- [x] Fake-transport: disconnect + new peer hello → p2 + state resync (loadout ignored)
- [x] Fake-transport: second hello while old guest still linked → replace, not ignore
- [x] Fake-transport: host `restoredState` + new guest hello keeps match id / phase
- [ ] Manual: two browser tabs host + join + guest refresh + host refresh

## Manual smoke

1. `npm run dev` in two tabs.
2. Tab A: **Play** → Host room (pick a deck) → copy room code from the match header.
3. Tab B: **Play** → Join room with code (pick a deck).
4. Play a few turns; confirm only the active seat can act.
5. Guest tab: refresh the page. Same tab should rejoin the room, sit as p2, and
   show the host's current board (or Join / **Rejoin** with that code).
6. Optional: host tab refresh — room code stays, guest reconnects, board matches
   the pre-refresh match (this tab only).
7. On the guest tab, **Resync** still re-pulls host state.
