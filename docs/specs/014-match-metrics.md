# 014 — Match metrics collector and dashboard

Not the source. The previous text of this file described a game that is not current play. That text is removed so it cannot be used as a source.

The source is [`docs/GAME_STATE.md`](../GAME_STATE.md). How a match plays is [`docs/RULEBOOK.md`](../RULEBOOK.md). Print is [`docs/KEYWORDS.md`](../KEYWORDS.md).

This file stays only as the accepted inventory row. It does not add a rule.

The metrics collector stays an observer. It does not call `reduce()`.

## What the observer records

Schema 2 is the tag-fighter sample. Schema 1 recordings remain readable. They still count forge, absorb, and ritual, and those counters are leftover.

On each accepted action the observer reads the new log events and the catalogue definitions those events name. It records:

- Sequence shape: face hits, Techniques, and Assist hits, split into starter, extender, and finisher, plus hit strength and the declared name.
- How the sequence stopped: a finisher, or an end-sequence action.
- Meter gained and spent, per seat and per turn.
- Tag switches, Assist declarations, rerolls, skipped rerolls, starter whiffs, and KO replacements.
- Chain answers: Counter, Parry, Brace, Shift, EX, and other Modify subjects, plus negates and priority passes.
- Which Fighter took the action and which Fighter took the damage.
- Rejected attempts by error, including `INSUFFICIENT_METER`.

Pace still flags matches past 10 turns. A turn with a sequence hit is combat even when the old attack action was never used. A turn with Tag, Assist, or a card and no hit is setup. An empty roll-and-pass is idle.
