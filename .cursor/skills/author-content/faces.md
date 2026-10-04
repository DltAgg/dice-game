# Named faces (dice)

File: `src/server/content/faces/<face-id>.json` (id constant in `faces.ts`)
Types: `src/server/model/dice.ts` (`FaceCardDefinition`), `faceTypes.ts`
Schema: `src/server/content/schema/face.schema.json` and `faceId` in
`defs.schema.json`

A face answers: what input is on this die right now? It is not a mana pip
and not a deckbuilding part.

## What to print

| Field | Role |
|---|---|
| `name` | The move the player reads (Jab, Lariat) |
| `faceType` | Label only. No inherent damage. Use `attack`, `grab`, `movement`, or another offensive tool the enum already allows |
| `primaryEffects` | Simple Action: resolved from the Fighter's own die |
| `secondaryEffects` | Applied when this face is the secondary input of a Technique |
| `sequenceRole` | `starter` / `extender` / `finisher` when this Simple Action joins the offensive sequence. Omit when it resolves immediately |
| `rulesText` | Holder voice. Empty when the name and effects are the whole print |

`onRoll` stays an empty array unless a shipped timing keyword needs it.
`onAbsorb` stays empty. New faces do not bank a pile and do not yield pips.
`maxOverloads: 0` and `forgeRestriction: null` unless you are editing an
old face that already uses those fields.

Do not set `technique` to `guard`, `dodge`, `counter`, `tag`, or `assist`
on a new face. Those enum values are leftover. Tag and Assist are not faces.
Generic defense is a Response card ([design.md](design.md)).

## Id prefix

`faceId` may still require `face-natural-`, `face-synthetic-`, or
`face-untyped-`. That token is not a kind. Name the move after the prefix
(`face-natural-jab` only while the pattern demands a prefix). Do not author
`face-synthetic-<attribute>` or `face-untyped-shield`.

Two dice showing Jab are two instances. One instance cannot be both the
primary and the secondary of the same Technique.

## Shape

```json
{
  "id": "face-natural-jab",
  "name": "Jab",
  "faceType": "attack",
  "rulesText": "",
  "primaryEffects": [],
  "onRoll": [],
  "onAbsorb": [],
  "maxOverloads": 0,
  "forgeRestriction": null
}
```

Fill `primaryEffects` from `effects.ts` when the clause is modelled. Leave
them empty and defer the print when it is not. Do not invent a damage
number the effect list cannot express.

`meterCost` / `meterGain` on a face are exceptional sequence properties, not
a cost to roll.

## Do not author

- Guard, Block, Dodge, Counter, or a generic damage-reduction face
- Natural vs synthetic as a design choice
- Shield as an untyped resource face
- A face the player swaps in from a face deck
- Action points or "this face is consumed for the turn"
