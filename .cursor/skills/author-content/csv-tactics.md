# CSV worksheets

Spreadsheets are notes. There is no ingest. If the user supplies a sheet,
confirm the columns before authoring. Keep the user's cell text verbatim in
the record. Old sheets that mean pile `playCost`, Instant/Ritual, or
"Forge 1 Synthetic …" are the previous game. Translate each row into
[`docs/GAME_STATE.md`](../../../docs/GAME_STATE.md) or stop and ask. Print
comes from [`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md). If the supplied
words are outside that glossary, the card is not finished.

## Classify each row

| The row is trying to… | Author as |
|---|---|
| `[Block N]`, `[Counter]`, `[Parry]`, or redirect | Response — [tactics.md](tactics.md) |
| Change a roll, die, moveset, target, or Tag | Modify with that `modifySubject` |
| Define a move on a die | Named face — [faces.md](faces.md) |
| Define who a Fighter is | Fighter `baseDie`, Techniques, Assist — [creatures.md](creatures.md) |
| Give a Fighter a personal deck | Do not. One shared deck. `fighterRestriction` if it is a play check |
| Dodge, or a miss | Do not. Dodge is not current print. Stop and ask |

Uniqueness still applies ([design-craft.md](design-craft.md)). Do not
batch-author forge stickers or `[Spend]` / `[Generate]` rows.

## Process

1. List every row with layer, `type` or face name, and deferred gaps.
2. Get alignment, unless the user already said to implement the batch.
3. Author one JSON file per row.
4. Update `docs/DEFERRED_CATALOGUE.md` for clauses the engine cannot model.
5. Run DoD. The batch is not done if any new print disagrees with the glossary.

If a column is only a pile cost, drop it. Meter appears only when the row
is an exceptional mode.
