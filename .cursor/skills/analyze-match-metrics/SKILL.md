---
name: analyze-match-metrics
description: >-
  Analyze Dice Skirmish match-metrics JSON or Markdown exports to diagnose
  long games, stall/idle turns, drag score, low lethality, reaction-window
  friction, and think time. Use when the user pastes a metrics export, mentions
  the Metrics tab, games going past 10 turns, drag score, or asks why matches
  feel slow. Do not use when they also have playtest notes or “felt like the
  wrong archetype” — that is post-playtest (skill review-playtest).
---

# Analyze match metrics

Read `docs/specs/014-match-metrics.md` if you need collector semantics.

The export is an **observer**. It does not change `GameState`. Do not invent
reducer behavior that is not in the numbers. Do not propose a second rules
engine in the UI.

## Input

Prefer the JSON from **Copy agent prompt** / **Download JSON**. Markdown
briefing is enough for a first pass.

Dedupe is already done (`matchId`, richer sample wins). Guest think times
include network delay; prefer `recordedAs: "host" | "local"`.

Pace is **per match**, not a 11–20 band (`src/client/metrics/pace.ts`):

| Flag | Number / rule |
|---|---|
| Baseline (red flag) | `totalTurns > 10` |
| Overtime | `max(0, turns − 10)` |
| Idle turn | no attack, damage, absorb, play, forge, ritual, heal/prevent, pending, reaction, or chain |
| Stall turn | 0 HP damage and 0 attacks (setup can still stall) |
| Late idle | idle after turns 1–2 (arming window) |
| Drag score | overtime + late idle |
| Verdict | `on-pace` / `empty-early` / `dragging` / `grinding` / `long-active` |
| Slow think | ≥ 15s between observations |
| Low lethality | mean HP damage / turn < 2 |

## How to read the dump

1. **Baseline:** `summary.pctOverBaseline`, `medianTurns`. Past 10 is a red flag.
2. **Why it ran long:** per-match `dragScore`, `paceVerdict`, `overtimeTurns`,
   `idleTurnCount` vs stall. Dragging = empty overtime. Grinding = setup/stall
   without a close. Long-active = combat happened, still too many turns.
3. **Close:** `meanDamagePerTurn`, stall-turn rate, turn kinds, HP at end,
   `medianFirstDefeatTurn`, `medianFirstDamageTurn`, `medianFirstAttackTurn`,
   deaths-by-turn, `pctNeverDefeat`. First death on turns 1–3 is too early for
   a three-creature skirmish; after turn 10 (or never) the close is not arriving.
4. **Seat / lists:** `firstPlayerWinRate`, `p1WinRate`, deck-pair mix.
5. **Clock vs rules:** `medianThinkMs` / `p90ThinkMs` vs idle. High think +
   low idle = UX / reading / reactions. Low think + high idle = the rules are
   not converting turns into play.
6. **Friction:** `reaction-priority-opened`, pending mix, reject rate.
7. **Hand spend:** `playVsForgeMix` / `totalCardsPlayed` vs `totalCardsForged`.
   Effect-region plays are not the same as tactics spent to install faces.
   `playForgeCorrelation` is Pearson r of effect/turn vs forge/turn across
   matches (negative = hand split between playing and forging). The
   dashboard stacked chart is mean effect vs forge **by turn number**.

## Answer shape

```markdown
## Verdict
One paragraph: over baseline because dragging / grinding / long-active / think time.

## Evidence
Bullets with numbers from the export (cite drag, idle, overtime per match).

## Experiments to try
1. Concrete rules or UX change (cite a spec / bible section if you know it).
2. What to measure next (which chart should move).

## Missing data
Only if the sample is too small or guest-only.
```

Do not change `src/server` from this skill. If a rules experiment is agreed,
hand off to `engine-developer`. Match-board chrome stays with `match-ui`.
If the diagnosis is “this list played like another archetype,” or the user
also has **playtest notes**, hand the full debrief to **post-playtest**
(skill `review-playtest`) — it updates `docs/MECHANIC_ARCHETYPES.md` and
briefs `card-designer`. Metrics-only pace dumps stay in this skill.
