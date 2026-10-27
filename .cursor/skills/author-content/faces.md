# Named faces (dice)

File: `src/server/content/faces/<face-id>.json` (id constant in `faces.ts`)
Types: `src/server/model/dice.ts` (`FaceCardDefinition`), `faceTypes.ts`
Schema: `src/server/content/schema/face.schema.json` and `faceId` in
`defs.schema.json`

The source is [`docs/GAME_STATE.md`](../../../docs/GAME_STATE.md). Print is
[`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md). Read it before `rulesText`.
User-supplied print stays verbatim. If those words are outside the glossary, the card is not finished, and the supplied words stay intact.

A face answers: what input is on this die right now? It is not a mana pip
and not a deckbuilding part. The face deck is not current online play.

## What to print

| Field | Role |
|---|---|
| `name` | The move the player reads |
| `faceType` | Label only. No inherent damage. Use an offensive tool the enum already allows |
| `hitStrength` | `light`, `medium`, or `heavy`. Strength sets Meter, not damage |
| `hitType` | `kick` or `punch` |
| `primaryEffects` | When this face is the hit, and when it is the first face of a Technique |
| `secondaryEffects` | When this face is the other face of a Technique |
| `sequenceRole` | `starter`, `extender`, or `finisher` |
| `rulesText` | Holder voice. Damage is `[Strike N]` |

`onRoll` stays an empty array unless a shipped timing prefix needs it.
`onAbsorb` stays empty. `maxOverloads: 0` and `forgeRestriction: null` on a
new face. Those fields are not the design.

Do not set a face to guard, dodge, counter, parry, tag, or assist. Tag and
Assist are not faces. Generic defense is a Response ([design.md](design.md)).

## Id prefix

`faceId` may still require `face-natural-`, `face-synthetic-`, or
`face-untyped-`. That token is not a kind. Do not author
`face-synthetic-<attribute>` or `face-untyped-shield`.

Two dice showing the same name are two instances. One instance cannot be
both the primary and the secondary of the same Technique.

## Shape

```json
{
  "id": "face-natural-jab",
  "name": "Jab",
  "faceType": "attack",
  "rulesText": "[Strike 1].",
  "hitStrength": "light",
  "hitType": "punch",
  "sequenceRole": "starter",
  "primaryEffects": [],
  "onRoll": [],
  "onAbsorb": [],
  "maxOverloads": 0,
  "forgeRestriction": null
}
```

The id prefix is only there while the schema requires it. Fill
`primaryEffects` from `effects.ts` when the clause is modelled. Leave them
empty and defer the print when it is not. Do not invent a damage number the
effect list cannot express. `[Strike N]` is the damage.

`meterCost` / `meterGain` on a face are the sequence hit's Meter, not a cost
to roll.

## Do not author

- Guard, Block, Dodge, Counter, Parry, or a generic reduction face
- Natural vs synthetic as a design choice
- Shield as a resource face
- A face the player swaps in from a face deck during online play
- A die spent by declaring the face
