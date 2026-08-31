---
name: review-playtest
description: >-
  Debrief a Dice Skirmish playtest from notes and optional Metrics exports:
  reconstruct what happened, update docs/MECHANIC_ARCHETYPES.md, and brief
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
| Metrics JSON or Markdown (Copy agent prompt / Download JSON) | Run [analyze-match-metrics](../analyze-match-metrics/SKILL.md) for pace, stall, lethality, play-vs-forge |
| Neither notes nor lists | Ask. Do not guess the archetype from metrics seat labels alone |

Notes win on **feel**. Metrics win on **counts**. If they disagree, say so
(e.g. felt Aggro but `meanDamagePerTurn` is low → refunded attacks / extra
swings, not a Strike-3 closer).

## Classify the owner

| If the leak is… | Owner | Do not |
|---|---|---|
| Printed attack/card/face in the wrong **window** (MA-01 refund, converter, 1-drop) | `card-designer` | Edit JSON here |
| Spend/generate/attack fuel that JSON cannot express (missing opcode, wrong bank timing) | `engine-developer` | Grow the reducer here |
| Right cards, wrong **list** (copy counts, squad, splash) | `deck-designer` | Edit `loadouts/` here |
| Players stall on UI (priority, pending, illegible board) + high think / reject rate | `match-ui` | Restyle MatchBoard here |
| Bible-silent **rule** | Propose `OPEN` in `OPEN_DESIGN.md` only if asked | Mark `DECIDED` |

Same keyword, different window: `[Generate]` On roll is often `HOME` (MA-02);
`[Generate]` of the attribute an attack just `[Spend]` is Aggro-shaped (MA-01).
Read [`docs/MECHANIC_ARCHETYPES.md`](../../../docs/MECHANIC_ARCHETYPES.md)
before proposing a new id.

## Workflow

```text
Playtest Progress:
- [ ] 1. Intake: lists, notes, metrics yes/no
- [ ] 2. Metrics pass if an export exists (analyze-match-metrics answer shape)
- [ ] 3. Feel vs intended home (design.md archetypes)
- [ ] 4. Mechanic × window → existing MA row or new id
- [ ] 5. Grep live JSON (`generate-symbol` + `discards`, etc.)
- [ ] 6. Classify owner (table above)
- [ ] 7. Update MECHANIC_ARCHETYPES.md (index + entry; never delete RETARGETED/ANTI)
- [ ] 8. Briefs only; do not implement
```

Paste new feel rows from the template at the bottom of
`docs/MECHANIC_ARCHETYPES.md`. Status: `WATCH` | `HOME` | `LEAK` | `RETARGETED` | `ANTI`.

## Specialist brief (one concern)

```text
Playtest: YYYY-MM-DD · lists · MA-id
Print / rule authority: <verbatim notes or rulesText>
Mechanic × window: <e.g. attack follow-up Generate-same as discards>
Live JSON: <ids>
Why not a reskin of an existing HOME row:
Must not: <reintroduce MA-01, steal exclusive verb, fake deferred print>
Suggested slice: <one creature attack | one opcode | one loadout file>
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
MA-id status change (or new row). Path: docs/MECHANIC_ARCHETYPES.md.

## Suggested changes
1. Owner + one-concern brief (do not implement).
2. What a later playtest should show if the slice worked.

## Missing data
Only if lists, notes, or sample size are insufficient.
```

## Anti-patterns

- Authoring catalogue JSON or reducer branches from this skill
- Deleting `RETARGETED` / `ANTI` rows
- Treating On-roll Generate-same as the same leak as attack-spend refund
- Metrics-only dump with no feel → use `analyze-match-metrics`, not this skill
- “Just implement the plan” across engine + UI + cards
