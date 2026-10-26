---
name: review-playtest
description: >-
  Debrief a Dice Skirmish playtest from notes and optional Metrics exports:
  reconstruct what happened and brief
  card-designer / engine-developer / deck-designer / match-ui. Use after a
  playtest, when a list felt like the wrong archetype, or when the user
  pastes a Metrics dump plus qualitative notes. Do not use to author cards,
  change the reducer, or edit loadouts — those are other specialists. Do not
  use for a metrics-only pace dump with no feel narrative (analyze-match-metrics).
---

# Review a playtest

Used by the **post-playtest** subagent. Parent threads may load this skill
for a single debrief.

This skill is **diagnosis + feel catalogue + briefs**, not implementation.
Live print stays JSON. Rules stay `reduce()`. Lists stay `deck-designer`.

## Input

| Have | Do |
|---|---|
| Player notes (“Control felt like Aggro”, “infinite attacks”) | Treat as feel authority |
| Lists / seats (Tempo, Control, custom) | Read those `loadouts/*.json` and named creatures/cards/faces |
| Metrics JSON or Markdown (Copy agent prompt + Download JSON) | Run [analyze-match-metrics](../analyze-match-metrics/SKILL.md) for pace, stall, and lethality |
| Neither notes nor lists | Ask. Do not guess the archetype from metrics seat labels alone |

Notes win on **feel**. Metrics win on **counts**. If they disagree, say so
(e.g. felt Aggro but `meanDamagePerTurn` is low → refunded attacks / extra
swings, not a Strike-3 closer).

## Classify the owner

| If the leak is… | Owner | Do not |
|---|---|---|
| Printed face, Response, or Modify in the wrong layer (Guard face, Tag type, pile cost) | `card-designer` | Edit JSON here. Do not ask them to restore the pile |
| Missing opcode or hook the current model needs | `engine-developer` | Grow the reducer here |
| Right cards, wrong **list** (copies, which three Fighters, a play-check treated as a ban) | `deck-designer` | Edit `loadouts/` here |
| Players stall on UI (priority, pending, illegible board) + high think / reject rate | `match-ui` | Restyle MatchBoard here |
| Bible-silent **rule** | Propose `OPEN` in `OPEN_DESIGN.md` only if asked | Mark `DECIDED` |

Do not brief a new pile `[Spend]`, forge, or Overcharge. `docs/MECHANIC_ARCHETYPES.md` is not a source.

## Workflow

```text
Playtest Progress:
- [ ] 1. Intake: lists, notes, metrics yes/no
- [ ] 2. Metrics pass if an export exists (analyze-match-metrics answer shape)
- [ ] 3. Feel vs the current layers (design.md), not the pile-era archetype table
- [ ] 4. Name the mechanic and the window in the brief
- [ ] 5. Grep the live JSON that was played
- [ ] 6. Classify owner (table above)
- [ ] 7. Briefs only; do not implement. Do not edit MECHANIC_ARCHETYPES.md
```

## Specialist brief (one concern)

```text
Playtest: YYYY-MM-DD · lists
Print / rule authority: <verbatim notes or rulesText>
Mechanic × window: <what happened, and when>
Live JSON: <ids>
Must not: fake deferred print, or restore pile, forge, or Shield
Suggested slice: <one card | one opcode | one loadout file>
```

Launch **one** owner per brief. If two layers are required, parent uses
`slice-changes` and invokes them separately.

## Answer shape

```markdown
## Verdict
One paragraph: what the session played as vs the intended archetype, and why
(window, not just the keyword).

## Evidence
- Notes (quotes).
- Metrics, if any (paceVerdict, drag, meanDamagePerTurn, playVsForgeMix, match ids).
- Live JSON ids that prove the print.

## Catalogue
Do not update `docs/MECHANIC_ARCHETYPES.md`. It is not a source.

## Suggested changes
1. Owner + one-concern brief (do not implement).
2. What a later playtest should show if the slice worked.

## Missing data
Only if lists, notes, or sample size are insufficient.
```

## Anti-patterns

- Authoring catalogue JSON or reducer branches from this skill
- Deleting `RETARGETED` / `ANTI` rows
- Treating an old pile counter as a reason to restore that pile
- Metrics-only dump with no feel → use `analyze-match-metrics`, not this skill
- “Just implement the plan” across engine + UI + cards
