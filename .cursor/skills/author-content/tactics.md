# Response and Modify cards

File: `src/server/content/cards/<card-id>.json` (id constant in `cards.ts`)
Model: [design.md](design.md)
Types: `src/server/model/cards.ts` (`CardType`, `ModifySubject`, `CardLifecycle`)
Schema: `src/server/content/schema/card.schema.json`

The source is [`docs/GAME_STATE.md`](../../../docs/GAME_STATE.md). Read
[`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md) before `rulesText`.

**Audit live JSON first.** `type` is `"response"` or `"modify"`. Do not set
`instant`, `reaction`, `overload`, or `ritual`.

The schema may still require `forge`. Satisfy it with the smallest object
the validator accepts (`faces` + `target`). Do not print a forge as the
card's purpose. A moveset Modify attaches in the equipment zone after it
resolves. That is not a card type. Do not add an overload or ritual region
on a new card.

## Shape

```json
{
  "id": "card-brace",
  "name": "Brace",
  "type": "response",
  "subtypes": [],
  "lifecycle": "one-shot",
  "rulesText": "[Block 2].",
  "forge": { "faces": 1, "target": "own-die" }
}
```

```json
{
  "id": "card-open-palm",
  "name": "Open Palm",
  "type": "modify",
  "subtypes": [],
  "lifecycle": "one-shot",
  "modifySubject": "roll",
  "rulesText": "Change which face that die is showing.",
  "exceptionalMeterCost": 2,
  "forge": { "faces": 1, "target": "own-die" }
}
```

`fighterRestriction` is a creature definition id. It checks play, not deck
construction. Omit it on a generic card. A moveset card for one Fighter sets
it and uses `modifySubject: "moveset"`.

`exceptionalMeterCost` is the exceptional mode. Omit it when the card has no
Meter cost. When that mode is the only way to play, the card shows that
Meter, and `rulesText` does not repeat “Spend N Meter”. Do not set
`meterCost` as generic mana, and do not set `seizesOffense`.

Set `lifecycle` explicitly: `"one-shot"` or `"persistent"`. A one-shot card
leaves the hand for the graveyard when it is played. A moveset stays in hand
until its link resolves, then moves to the equipment zone.

## Which behavior

| Print intent | Fields |
|---|---|
| `[Block N]`, `[Counter]`, `[Parry]`, redirect | `type: "response"` plus the effect the engine already has |
| Change the showing face | `type: "modify"`, `modifySubject: "roll"` |
| Replace a die slot for the rest of the match | `type: "modify"`, `modifySubject: "die"` |
| Add a Technique and attach | `type: "modify"`, `modifySubject: "moveset"` |
| Redirect a target that already exists | `type: "modify"`, `modifySubject: "target"` |
| Cause or alter a Tag | `type: "modify"`, `modifySubject: "tag"` |

`[Counter]` negates the previous chain card and does not end the sequence.
`[Parry]` negates the waiting hit and ends the sequence. `[Block N]` lowers
the next damage and does not cancel the hit. Dodge is not current print.

Wire `effect.effects` only when every clause maps to `src/server/model/effects.ts`.
Otherwise keep `rulesText` accurate and add a row to `docs/DEFERRED_CATALOGUE.md`.
User-supplied print stays verbatim. If it is outside the glossary, the card
is not finished.

Print is the holder's voice. Empty `rulesText` is not a design.

## Do not author

- A Counter, Tag, or Assist type line
- `[Spend]` / `[Requires]` / `[Forge]` as the card's identity
- A persistent card that is secretly a Ritual
- Open Manual’s Technique, or a replacement for Anchor’s print
