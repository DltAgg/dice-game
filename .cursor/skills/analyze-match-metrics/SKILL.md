---
name: analyze-match-metrics
description: >-
  Analyze Dice Skirmish match-metrics JSON or Markdown exports for pace,
  stall, lethality, and think time. Use when the user pastes a Copy agent prompt, attaches
  Download JSON, mentions the Metrics tab, games going past 10 turns, or asks
  why matches feel slow or unfun. Do not use when they also have playtest notes
  or “felt like the wrong archetype” — that is post-playtest (skill
  review-playtest).
---

# Analyze match metrics

Export field names are telemetry. They are not print and they are not the rules. How the match plays is `docs/RULEBOOK.md`. Do not brief a new pile cost, forge, or Overcharge from a counter in the export.

Read `docs/specs/014-match-metrics.md` if you need collector semantics.

The export is an **observer**. It does not change `GameState`. Do not invent
reducer behavior that is not in the numbers. Do not propose a second rules
engine in the UI. This skill does not define content. Do not brief authors to
add attribute-pile fuel, an energy resource, or a face deck. Current content
model: `docs/specs/030-offensive-control.md`.

## Goal

Read the export for pace and for how the tag fighter was actually played:
sequence shape, Meter, Tag, Assist, Chain answers, and who took the damage.
Schema 2 is that sample. Schema 1 still mentions forge, Overcharge, and unpaid
attacks. Describe those leftover numbers. Do not turn them into a request for
pile-cost cards.

## Input

**Copy agent prompt** is instructions only. The dump is **Download JSON**
(or Markdown). A file path or attachment is enough; do not expect JSON
inlined in the prompt.

Dedupe is already done (`matchId`, richer sample wins). Guest think times
include network delay; prefer `recordedAs: "host" | "local" | "local-ai"`.
Ignore leftover `energy*` keys on old recordings.

Pace is **per match**, not a 11–20 band (`src/client/metrics/pace.ts`):

| Flag | Number / rule |
|---|---|
| Baseline (red flag) | `totalTurns > 10` |
| Overtime | `max(0, turns − 10)` |
| Idle turn | no sequence hit, Tag, Assist, card, Meter change, damage, or Chain |
| Stall turn | 0 HP damage and 0 sequence hits (Tag or a card can still be setup) |
| Late idle | idle after turns 1–2 |
| Drag score | overtime + late idle |
| Verdict | `on-pace` / `empty-early` / `dragging` / `grinding` / `long-active` |
| Slow think | ≥ 15s between observations |
| Low lethality | mean HP damage / turn < 2 |

## How to read the dump

1. **Baseline:** `summary.pctOverBaseline`, `medianTurns`. Past 10 is a red flag.
2. **Why it ran long:** per-match `dragScore`, `paceVerdict`, `overtimeTurns`,
   `idleTurnCount` vs stall. Dragging = empty overtime. Grinding = setup/stall
   without a close. Long-active = hits happened, still too many turns. A
   sequence hit counts as combat. Tag, Assist, or a card with no hit is setup.
3. **Sequence:** schema 2 `fighting` on each match, and the export section
   “Sequence, Meter, Tag, Assist”. Starters, extenders, finishers, and
   `endSequences`. Finishers should close the turn. Ending with no finisher is
   a choice. Whiffs are Ryu’s grappler check.
4. **Meter:** `meterGained` versus `meterSpent`, and `INSUFFICIENT_METER` in
   `rejectionCounts`. Unspent Meter and rejected spends are different problems.
   Light, medium, and heavy hits are why the pool moved.
5. **Bench and Chain:** Tags and Assists per match, `fighterActivity` for who
   hit and who was hit, and Counter / Parry / Brace / Shift against
   `reaction-priority-opened`. Many `PASS_PRIORITY` with tiny think is window
   spam. EX plays are an offensive replace, not a defensive answer.
6. **Close:** `meanDamagePerTurn`, first KO, deaths-by-turn, `pctNeverDefeat`.
   First KO on turns 1–3 is early for three Fighters. After turn 10, or never,
   the close is not arriving.
7. **Seat / lists / clock:** `firstPlayerWinRate`, deck pairs, `medianThinkMs`
   / `p90ThinkMs`. High think + low idle = reading or reactions. Low think +
   high idle = turns are not becoming hits.
8. **Schema 1 leftovers:** forge, absorb, ritual, and unpaid-attack counters.
   Describe them only as old data. Do not brief a pile, a forge line, or Shield.

## Answer shape

```markdown
## Verdict
One paragraph: whether the sample shows the tag fighter being played, and why
(sequence bailed / Meter unspent / bench unused / chains passed / close late)
— plus dragging / grinding / long-active.

## Evidence
Bullets with numbers from the export (cite drag, sequence roles, Meter spent
of gained, Tags and Assists, Chain answers, and first KO).

## Experiments to try
1. One rules or UX change the numbers support. Name which chart should move.
2. What is still missing if the sample is schema 1, guest-only, or tiny.
```

Do not change `src/server` from this skill. If a rules experiment is agreed,
hand off to `engine-developer`. Match-board chrome stays with `match-ui`.
If the diagnosis is “this list played like another archetype,” or the user
also has **playtest notes**, hand the full debrief to **post-playtest**
(skill `review-playtest`) — it updates `docs/MECHANIC_ARCHETYPES.md` and
briefs `card-designer`. Metrics-only dumps stay in this skill.
