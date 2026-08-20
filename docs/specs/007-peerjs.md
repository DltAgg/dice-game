# 007 — PeerJS host authority (Milestone 5)

Status: **IMPLEMENTED**

Online matches over PeerJS. The **room owner / host process** alone runs
`advance()`; seated clients send intent-shaped `GameAction`s and every peer
renders authoritative state. Spectators receive the same broadcasts and cannot
act. Hotseat local play remains available.

## Intent

```text
Seated client UI → submit-action → Host (advance) → state broadcast → all UIs
Spectator UI → (no GameAction) → receives state + room snapshots
```

Lobby (before `createMatch`):

```text
Join hello (clientId) → spectator
→ claim-seat (loadout) / release-seat
→ room owner startMatch → createMatch from seated loadouts → state to all
```

Reconnect (page reload or dropped DataConnection):

```text
hello (new PeerJS id, same clientId) → Host rebinds that identity’s seat
→ welcome(room, state?) → resync-request if the match has started
```

A different `clientId` joining a live room is a **spectator**, not a stolen P2.

## Rules

- Only `reduce()` / `advance()` changes game state (ARCHITECTURE).
- Host owns RNG, validation, and the live `GameState`.
- Client never applies a local reduce for remote play except by replacing state
  with what the host sent.
- Two seats: **P1** and **P2**. Either may be empty (“open seat”).
- Joining peers default to **Spectator**. They may `claim-seat` if that seat is
  open, sending a `WireLoadout`. A seated player may `release-seat` back to
  spectator so someone else can take it (swap via spectator — you cannot claim
  the other seat while occupying one).
- The room owner still creates the PeerJS room and runs `advance()` when the
  match starts, **even if that person is a spectator**. Hosting does not force
  P1.
- Host overrides `action.playerId` by the sender’s **bound seat**. Spectators
  (including a spectating host) never call `advance()` as an actor; the host
  rejects their `submit-action` with protocol error `NOT_SEATED` (not a
  `GameError` — the reducer is not invoked).
- Match start: both seats filled, each with a loadout that passes
  `validateLoadout`. Spectators do not need loadouts. The room owner clicks
  Start.
- After the match starts, seats are locked (no claim/release). Disconnect keeps
  the seat reserved for that `clientId` so they can rejoin.
- Before the match starts, disconnect **opens** the seat.
- Room codes are short `nanoid` strings and are not `matchId` or `playerId`.
- Reconnect rebinds by **clientId** (tab `sessionStorage`), not “whoever is the
  only guest.” Same `clientId` from a new PeerJS id replaces that identity’s
  stale connection only.

## Spectators

- Receive the same authoritative `GameState` broadcasts as seated players.
- Match UI shows both public tables **and both hands** so playtest notes are
  possible. They cannot roll, play, absorb, or resolve pending decisions
  (`localPlayerId === null` seat-gates every control).
- Metrics collector on the host still records via `onAdvance` (spec `014`)
  while the host spectates. `recordedAs` stays `"host"`; `localPlayerId` may be
  null.

## State Changes

No new `GameState` fields. Lobby seat map lives in the match store / sessions
(`RoomSnapshot` on the wire).

## Actions

No new game actions. Wire messages wrap existing `GameAction`. Lobby uses
`hello`, `claim-seat`, `release-seat`, `room`, `welcome`, `seat-rejected`.

## Validation

Host rejects actions that fail `advance`, or whose sender is not the bound seat.
Spectator intents are rejected **before** `advance`. Illegal loadouts on
`claim-seat` are `seat-rejected` (reason from `validateLoadout`). Rejects of
game actions return `GameError` plus the current authoritative state.

## Resolution

Host: `advance(state, action)` then broadcast `{ type: "state", state }` to
**every** connected peer.

## Networking

Requires host authority. Clients and spectators are not a source of dice rolls,
damage, or draws.

- Host PeerJS id **is** the room code so clients can dial it after a reload.
- Client PeerJS ids are ephemeral; reconnect is by room code + `clientId`.
- `hello` carries `clientId` only (no loadout). Loadout travels on `claim-seat`.
- After `welcome` with a live `GameState`, the client automatically sends
  `resync-request`.
- Host refresh: recreate a Peer with the same room-code id (retry
  `unavailable-id`), restore last in-tab `GameState` + persisted seat map, wait
  for `hello`s to rebind by `clientId`. Unload does **not** send `room-closed`
  so still-mounted clients retry.
- Explicit **Leave** still sends `room-closed` to every remote peer.

## Persistence

Does not persist matches to a backend or `localStorage`. Deck loadouts still
come from local `DeckRepository`.

`claim-seat.loadout` (`WireLoadout`) is structural JSON — the host runs
`validateLoadout` / `createMatch`, not a second rules engine in the parser:

```json
{
  "squad": ["creature-…"],
  "deck": ["card-…"],
  "faceDeck": ["face-synthetic-crush"],
  "startingDice": [
    ["face-synthetic-crush", "face-natural-martial", "face-natural-wild", "face-natural-arcane", "face-natural-luminar", "face-untyped-shield"],
    ["face-natural-martial", "face-natural-wild", "face-natural-arcane", "face-natural-luminar", "face-untyped-shield", "face-untyped-shield"]
  ]
}
```

Messages without a two×six `startingDice` array fail `parseWireMessage` on
`claim-seat`. Illegal layouts are rejected at claim / match create, same as an
illegal squad.

Tab `sessionStorage` holds a reconnect **hint** (role, room code, `clientId`,
claimed seat, optional deck id, and on the host the last `GameState` JSON plus
persisted seats). A new tab, another device, or a dead PeerJS broker cannot
recover the match.

## UI

- Lobby: Local hotseat | Host room | Join room (code; no loadout required)
- In-room: two open/claimed seats, spectator list, claim / leave-seat, room
  owner **Start match** when both seats are ready
- Online match: room code, connection status, only the bound seat may act;
  spectators see both hands and cannot act
- Refresh: this tab auto-resumes host (same room code) or re-joins with the
  same `clientId`
- Manual: **Resume room** / **Rejoin** / Join with the same code if auto-resume
  missed
- Resync: client also exposes a **Resync** button; `resync-request` already
  runs after every `welcome` that includes state

## Acceptance Criteria

- [x] Spec written; README / ARCHITECTURE updated
- [x] Host creates a room without taking P1; clients join as spectators
- [x] P1/P2 claim and release; match starts only with two legal seated loadouts
- [x] Shared state advances; spectators receive broadcasts and cannot act
- [x] Host-as-spectator still runs `advance()` for seated intents; metrics
      `onAdvance` still records
- [x] Illegal actions surface host `GameError`; spectator intents are
      `NOT_SEATED`
- [x] Resync restores host state
- [x] Reload (new peer id, same `clientId`) rebinds that seat and restores host
      state
- [x] A different `clientId` does not steal a seated player’s connection
- [x] Same `clientId` from a new peer replaces only that identity’s stale conn
- [x] Hotseat still works; purity / typecheck / test / lint green

## Tests

- [x] Protocol parse rejects malformed messages; hello requires `clientId`
- [x] Fake-transport host/client seat bind + advance + reject
- [x] Fake-transport: three peers, two seats + spectator
- [x] Fake-transport: seat claim / release; second claim of a taken seat rejected
- [x] Fake-transport: spectator `submit-action` rejected; `advance` not called
- [x] Fake-transport: host-as-spectator still advances a seated player’s intent
- [x] Fake-transport: disconnect + new peer hello with same `clientId` → seat +
      state resync (loadout ignored)
- [x] Fake-transport: different `clientId` while old occupant still linked →
      spectator, not steal
- [x] Fake-transport: host `restoredState` + `restoredRoom` + known `clientId`
      hello keeps match id / phase
- [ ] Manual: three browser tabs host (spectate) + two seated players + refresh

## Manual smoke

1. `npm run dev` in three tabs.
2. Tab A: **Play** → Host room (no deck required) → copy room code. Stay
   spectator.
3. Tabs B and C: **Play** → Join with code → claim P1 / P2 with legal loadouts.
4. Tab A: **Start match**. Confirm only the active seat can act; Tab A sees
   both hands and cannot roll/play. Metrics still record on the host.
5. A seated tab: refresh. Same tab should rejoin, keep that seat, and show the
   host's current board.
6. Optional: host tab refresh — room code stays, players reconnect by
   `clientId`, board matches the pre-refresh match (this tab only).
7. On a client tab, **Resync** still re-pulls host state.
