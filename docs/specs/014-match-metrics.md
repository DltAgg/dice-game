# 014 — Match metrics collector and dashboard

Status: **IMPLEMENTED**

Playtests feel slow; matches often run past 10 turns. This spec adds an
**observer** that records wall-clock and rules-derived telemetry outside the
engine, persists it across refresh, and surfaces charts plus an agent-ready
export. It does not change game rules.

## Intent

```text
Match store / host session
  → observe(prev, next, action?, clock)
  → MatchRecording (IndexedDB, localStorage fallback)
  → Metrics dashboard + JSON / Markdown export
```

Identify *why* matches drag: overtime past a 10-turn baseline, idle vs setup
stalls, low lethality, reaction windows, pending-decision dwell, or human
think time — without a second rules engine.

## Rules

None. The collector never calls `reduce()` / `advance()` and never mutates
`GameState`. It only reads post-reduce snapshots and the append-only `log`.

Turn length and pace (playtest, not bible). Computed **per match** from that
match’s own turns — there is no 11–20 default band.

| Flag | How it is computed | Why |
|---|---|---|
| Baseline | `totalTurns > 10` | Crossing 10 is a red flag |
| Overtime | `max(0, turns − 10)` | How far past the baseline |
| Idle turn | No attack, damage, absorb, play, forge, ritual, heal/prevent, pending decision, reaction, or chain | Player took no meaningful action or decision |
| Stall turn | 0 HP damage and 0 attacks | No combat progress (setup still counts as stall) |
| Setup turn | Stall but not idle | Arming: absorb/play/forge without swinging |
| Late idle | Idle after turns 1–2 | Opening arming is expected |
| Drag score | `overtime + lateIdleTurns` | Correlates extra length with empty turns |
| Verdict | `on-pace` / `empty-early` / `dragging` / `grinding` / `long-active` | Why this match felt slow |

A 12-turn fight with no empty turns scores drag 2 (`long-active`). A 12-turn
pass-fest scores much higher (`dragging`). These numbers live in
`src/metrics/thresholds.ts` and `src/metrics/pace.ts`.

## State Changes

None in `GameState`.

## Actions

No new `GameAction`. Host `onAdvance` is an adapter callback, not a rules
action: it reports `{ prev, next, action, ok, error }` after `advance()`.

## Validation

N/A for play. Persistence refuses unknown `schemaVersion`. Corrupt IndexedDB /
localStorage blobs are skipped, not thrown into the match loop.

## Resolution

N/A.

## Networking

Does **not** require host authority and does **not** travel on the PeerJS
wire. Each browser records locally:

| Mode | What is recorded |
|---|---|
| `local` | Every accepted/rejected action + think time |
| `host` | Same, via `onAdvance` (complete action types) |
| `client` | State ticks + log-delta events (action type may be null) |

Aggregates **dedupe by `matchId`**, keeping the recording with more action
samples (usually the host). Think times on the guest include network delay;
the export labels `recordedAs`.

## Persistence

Layer: `src/metrics/` (adapter, like `src/decks/`).

- **Primary:** IndexedDB database `dice-skirmish-metrics`, store `recordings`,
  key `recordingId`.
- **Fallback:** `localStorage` key `dice-skirmish.metrics.v1` when IndexedDB is
  missing or fails (private mode, quota).
- **Write cadence:** after every observation (including rejects). In-progress
  matches survive refresh; a new `matchId` **abandons** the previous
  in-progress recording on this browser.
- **Ids:** `nanoid` at this boundary only.
- **Cap:** 200 recordings; oldest by `updatedAt` pruned on write.
- **Schema:** `METRICS_SCHEMA_VERSION = 1`. Unknown versions are ignored.

A recording stores: identity (match/seed/mode/decks), wall-clock span, per-turn
summaries (damage, attacks, cards, energy, HP, zones, pending/reaction counts),
per-action samples (think time, action type when known, pending kind, chain
depth, event types), event-type histograms from `state.log`, and **hand-card
spend split**: `totalCardsPlayed` / `cardPlayCounts` from `card-played`
(`PLAY_CARD`, effect region) vs `totalCardsForged` / `cardForgeCounts` from
unique `face-forged.cardInstanceId` (`FORGE_CARD`, one tactic even if it
installs several faces). `forge-faces` effect installs leave
`cardInstanceId` null and are not “cards played to forge.” Older recordings
without forge fields fall back to counting accepted `FORGE_CARD` actions.

It does **not** persist full `GameState` (too large, duplicates the engine log).

## UI

App shell **Metrics** tab (felt/stone language, not a generic SaaS dashboard
on the match board).

Must provide:

- KPI row: match count, mean/median turns, % past 10-turn baseline, median
  drag score, idle vs stall rates, median duration, think time, **hand cards
  play / forge**
- Histograms: turns per match (marker at 10), pace verdict mix, wall-clock
- Lethality: HP damage per turn; idle vs setup vs combat per turn
- Mix charts: action types, event types, pending-decision kinds, energy-pass
  cause (overshoot vs voluntary), **play vs forge** (effect region vs
  `FORGE_CARD`), cards played (effect), cards played to forge, **scatter of
  effect/turn vs forge/turn** with Pearson r
- Think-time by action type (p50 / p90)
- Insights list derived from the same thresholds
- Match table → detail (turn timeline, HP remaining, action samples)
- Export: download JSON, download Markdown briefing, copy agent prompt
  (preamble + compact JSON)

The match board stays a play surface. Optional: no live charts on
`MatchBoard`.

## Export (agent prompt)

JSON object:

- `schemaVersion`, `exportedAt`, `promptPreamble`
- `summary` (aggregates + threshold hits)
- `insights` (id, severity, title, detail, evidence)
- `matches` (compact per-match rows; full action samples included unless
  truncated with `truncated: true`)
- `aggregates` (histograms, mixes, percentiles)

Markdown briefing is the same facts in prose tables so it pastes into a chat.

Skill: `.cursor/skills/analyze-match-metrics/` — use when the user pastes an
export or asks why matches run long.

## Acceptance Criteria

- [x] Spec written; collector is outside `src/game`
- [x] Refresh mid-match does not drop the in-progress recording (same `matchId`)
- [x] Finished matches remain after later matches start
- [x] Dashboard shows turn-length distribution with a 10-turn baseline and per-match drag / verdict
- [x] Export JSON + Markdown + copyable agent prompt
- [x] Engine purity guard still green; `src/game` must not import `@/metrics`
- [x] `npm run typecheck && npm test && npm run lint`

## Tests

- [x] `applyObservation` opens, continues, finishes, and abandons recordings
- [x] Insights flag overtime past 10, drag, stall / idle, and low-lethality matches
- [x] Observer splits `PLAY_CARD` (effect) from `FORGE_CARD` (one count per tactic)
- [x] Export round-trips schema version and preamble
- [x] Memory repository CRUD + prune cap
