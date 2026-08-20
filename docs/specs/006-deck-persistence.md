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

Opening dice (`startingDice`, DECIDED 2026-08-19): two dice × six `FaceCardId`
slots. Basics (dual-kind naturals + Shield) do not consume the face deck.
Named specials on opening slots must be present in `faceDeck` (XOR ledger).
Config caps: `startingMinShieldsPerDie` (1), `startingMaxSyntheticsPerPlayer`
(2), `startingMaxSyntheticsPerDie` (2), `startingMaxOnRollFacesPerDie` (2),
plus `maxFacesOfSameAttributePerDie`. Echo / Heritage / Plague refused on
opening slots (legal in the face deck for mid-game forge).

## Persistence

`DeckRepository` over `localStorage` with `schemaVersion` **2**. Ids via nanoid
at the persistence boundary. Unknown schema versions are refused. Saves without
`startingDice` are refused — do not silently fill `DEFAULT_BASIC_LAYOUT` for
play. Engine tests may use `legacyStartingLayout()`.

Saved loadout JSON:

```json
{
  "schemaVersion": 2,
  "id": "…",
  "name": "Aggro",
  "squad": ["creature-…"],
  "deck": ["card-…"],
  "faceDeck": ["face-synthetic-crush", "face-synthetic-needle"],
  "startingDice": [
    ["face-synthetic-crush", "face-natural-martial", "face-natural-wild", "face-natural-arcane", "face-natural-luminar", "face-untyped-shield"],
    ["face-synthetic-needle", "face-natural-martial", "face-natural-wild", "face-natural-arcane", "face-natural-luminar", "face-untyped-shield"]
  ]
}
```

## Validation

`validateLoadout` refuses unknown ids, illegal squad size, tactics outside
50–60, a fifth copy of any card, illegal face decks, and illegal
`startingDice`. `createMatch` uses that check (throws only when the check
fails, same as an illegal squad).

## UI

- App shell **Decks** tab: name, squad, **two opening dice** (6 slots each),
  basics + **face-deck special** paint chips, tactics list, face list, leftover
  pool (click to install on the selected slot), live legality; illegal drafts
  may be saved for later editing
- **Play** refuses illegal loadouts (local / host / join / new match)
- New match picks P1/P2 saved loadouts (default: Aggro builtin)

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
- [x] `validateLoadout` includes `startingDice`; leftover pool at `createMatch`
- [x] Deck schema v2; old saves without layouts refused
