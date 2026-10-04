# Response and Modify cards

File: `src/server/content/cards/<card-id>.json` (id constant in `cards.ts`)
Model: [design.md](design.md)
Types: `src/server/model/cards.ts` (`CardType`, `ModifySubject`, `CardLifecycle`)
Schema: `src/server/content/schema/card.schema.json`

**Audit live JSON first.** `type` is `"response"` or `"modify"`. Do not set
`instant`, `reaction`, `equipment`, `overload`, or `ritual`.

The schema may still require `forge` and may still accept equipment,
overload, and ritual regions. Those are leftover zones. Satisfy `forge` with
the smallest object the validator accepts (`faces` + `target`) and do not
print a natural or synthetic install as the card's purpose. Do not add a
play region of equipment, overload, or ritual on a new card.

## Shape

```json
{
  "id": "card-standing-block",
  "name": "Standing Block",
  "type": "response",
  "subtypes": [],
  "lifecycle": "one-shot",
  "rulesText": "Block.",
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
  "forge": { "faces": 1, "target": "own-die" }
}
```

`fighterRestriction` is a creature definition id. It checks play ("that
Fighter is on your team and living"), not deck construction. Omit it on a
generic card. A moveset card for one Fighter sets it and uses
`modifySubject: "moveset"`.

`exceptionalMeterCost` is the optional exceptional mode. Omit it when the
normal mode is the whole card. Do not set `meterCost` as generic mana, and
do not set `seizesOffense`.

`lifecycle` omitted is derived by the engine (equipment, overload, and
continuous rituals stay; everything else is one-shot). Set it explicitly on
new cards: `"one-shot"` or `"persistent"`. One-shot discards unless
`afterResolveZone` is set.

## Which behavior

| Print intent | Fields |
|---|---|
| Block, dodge, counter, prevent, redirect | `type: "response"` plus the effect the engine already has |
| Change the showing face, including a reroll | `type: "modify"`, `modifySubject: "roll"` |
| Rewrite a die slot for the rest of the match | `type: "modify"`, `modifySubject: "die"` |
| Change what a Fighter can do with current inputs | `type: "modify"`, `modifySubject: "moveset"` |
| Redirect a target that already exists | `type: "modify"`, `modifySubject: "target"` |
| Cause or alter a Tag | `type: "modify"`, `modifySubject: "tag"` |

Wire `effect.effects` only when every clause maps to `src/server/model/effects.ts`.
Otherwise keep `rulesText` accurate and add a row to `docs/DEFERRED_CATALOGUE.md`.

Print is the holder's voice. Empty `rulesText` is not a design.

## Do not author

- A Counter, Tag, or Assist type line
- `[Spend]` / `[Requires]` pile costs, or `playCost` as live fuel
- `[Forge 1 Synthetic …]` as the card's identity
- `[Overcharge]` reprinted on the card
- A persistent card that is secretly an Equipment or Ritual type
