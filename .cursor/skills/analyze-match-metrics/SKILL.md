---
name: analyze-match-metrics
description: >-
  Analyze Dice Skirmish match-metrics JSON or Markdown exports to diagnose
  whether the pile-only game is playable and fun: locked attacks (no matching
  showing face), long games, stall/idle, drag, low lethality, forge vs play vs
  Overcharge, reaction friction, think time. Use when the user pastes a Copy
  agent prompt, attaches Download JSON, mentions the Metrics tab, games going
  past 10 turns, or asks why matches feel slow or unfun. Do not use when they
  also have playtest notes or “felt like the wrong archetype” — that is
  post-playtest (skill review-playtest).
---

# Analyze match metrics

Read `docs/specs/014-match-metrics.md` if you need collector semantics.

The export is an **observer**. It does not change `GameState`. Do not invent
reducer behavior that is not in the numbers. Do not propose a second rules
engine in the UI. Do not propose bringing **energy** back. Cards, rituals, and
synthetic forge still pay the attribute pile (spec `016`). Creature attacks
use `[Unlock]` from showing faces (spec `028`) — they do not spend the pile.

## Goal

Make the game **playable and fun** after the energy + attribute split became
pile-only. Slow / unfun is the default complaint. Pace flags are how you
describe the dump, not the product goal.

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
3. **Can they swing?** 0 attacks is not “chose setup.” Check rejected
   `ATTACK` / `ATTACK_NOT_UNLOCKED` (showing faces vs `unlock`, spec `028` —
   not leftover pile vs `discards`). `INSUFFICIENT_SYMBOLS` is often rituals
   or card play, not attacks. 1-pip leftovers still pay a 1-cost card or
   Overcharge (0 pile) but not a 2-token play. `turn.absorbs` counts
   `symbol-absorbed` **and** `symbols-consumed` — not spare pile.
4. **Close:** `meanDamagePerTurn`, stall-turn rate, turn kinds, HP at end,
   `medianFirstDefeatTurn`, `medianFirstDamageTurn`, `medianFirstAttackTurn`,
   deaths-by-turn, `pctNeverDefeat`. First death on turns 1–3 is too early for
   a three-creature skirmish; after turn 10 (or never) the close is not arriving.
   Split locked-attack (`ATTACK_NOT_UNLOCKED` / no matching showing face) from
   cannot-kill (prevent/Shield) from not converting setup.
5. **Forge as a line:** `playVsForgeMix` / Overcharge vs `FORGE_CARD`.
   Overcharge is 0 pile and juices every copy of a face; synthetic forge pays
   `playCost`. Say whether a player would pick forge.
6. **Seat / lists:** `firstPlayerWinRate`, `p1WinRate`, deck-pair mix.
7. **Clock vs rules:** `medianThinkMs` / `p90ThinkMs` vs idle. High think +
   low idle = UX / reading / reactions. Low think + high idle = the rules are
   not converting turns into play. Many `PASS_PRIORITY` with tiny think is
   window spam, not reading time.

## Answer shape

```markdown
## Verdict
One paragraph: playable/fun or not, and why (locked attacks / grinding close /
forge not a line / think time) — plus dragging / grinding / long-active.

## Evidence
Bullets with numbers from the export (cite drag, idle, overtime, attacks per
seat, play vs forge vs Overcharge per match).

## Experiments to try
1. Concrete rules or UX change that makes matches fun to play (cite a spec /
   bible section if you know it). Prefer unlocking a basic off a normal
   showing-face pair over adding attack rewards.
2. What to measure next (which chart should move).

## Missing data
Only if the sample is too small, guest-only, or unlock/attack-legal is absent.
```

Do not change `src/server` from this skill. If a rules experiment is agreed,
hand off to `engine-developer`. Match-board chrome stays with `match-ui`.
If the diagnosis is “this list played like another archetype,” or the user
also has **playtest notes**, hand the full debrief to **post-playtest**
(skill `review-playtest`) — it updates `docs/MECHANIC_ARCHETYPES.md` and
briefs `card-designer`. Metrics-only dumps stay in this skill.
