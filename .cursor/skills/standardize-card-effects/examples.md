# Worked print

These shapes match [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md). Do not
copy an older sheet.

| Print | Effect |
|---|---|
| `[Strike 2].` | `damage` amount 2, or `assist-hit` amount 2 when it is an Assist |
| `[Block 2].` | `reduce-damage` amount 2. Does not cancel the hit |
| `[Counter].` | `negate-card`. Does not end the sequence |
| `[Parry].` | `grant-attack-prevent`, and the card ends the sequence |
| Replace | Modify subject `die` |

Timing stays a prefix: `On roll:`, `On attack:`. Never “Whenever…”.
User-supplied print stays verbatim. If it is outside the glossary, do not
finish the card.
