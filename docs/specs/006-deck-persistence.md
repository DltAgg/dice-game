# 006 — Deck validation and local persistence (Milestone 4)

Status: **IMPLEMENTED**

Players build and save loadouts locally, validate them against rules config, and
start hotseat matches from those loadouts. No PeerJS; catalogue depth remains
deferred ([`docs/DEFERRED_CATALOGUE.md`](../DEFERRED_CATALOGUE.md)).

## Intent

```text
DeckBuilder UI → DeckRepository (localStorage) → validateLoadout (pure) → createMatch
```

## Rules

Tactics deck (DECIDED, M4 — see `docs/OPEN_DESIGN.md`):

| Rule | Value |
|---|---|
| Minimum size | 50 |
| Maximum size | 60 |
| Max copies of one card id | 4 |

Face deck (bible §12): up to 12 faces, at most 3 per attribute.
Squad: exactly `creaturesPerPlayer` known creature definitions.

## State Changes

None in `GameState`. Persistence lives outside the engine as saved loadouts.

## Actions

No new game actions. Match setup accepts loadouts already validated by
`validateLoadout`.

## Validation

`validateLoadout` refuses unknown ids, illegal squad size, tactics outside
50–60, a fifth copy of any card, and illegal face decks.

## Resolution

N/A — setup-time only.

## Networking

Does not require host authority. PeerJS remains M5.

## Persistence

`DeckRepository` over `localStorage` with `schemaVersion`. Ids via nanoid at
the persistence boundary. Unknown schema versions are refused.

## UI

- App shell **Decks** tab: name, squad, tactics list, face list, live legality
- New match picks P1/P2 saved loadouts (default: Prototype)

## Acceptance Criteria

- [x] Spec written; M3 marked implemented
- [x] Config + OPEN_DESIGN reflect 50–60 / 4 copies; prototype deck is legal
- [x] `validateLoadout` pure + tested; `createMatch` uses it
- [x] `DeckRepository` round-trips; memory fake covers unit tests
- [x] Deck builder can save a legal loadout and start a hotseat match from two saved decks
- [x] Engine purity guard still green; typecheck / test / lint green

## Tests

- [x] `validateLoadout` refusal paths
- [x] Memory repository CRUD
- [x] Prototype loadout validates and opens a match
