# Fighters

File: `src/server/content/creatures/<creature-id>.json` (id constant in
`creatures.ts`)
Types: `src/server/model/creatures.ts`, `fighterTechniques.ts`
Schema: `src/server/content/schema/creature.schema.json`

The source is [`docs/GAME_STATE.md`](../../../docs/GAME_STATE.md). Print is
[`docs/KEYWORDS.md`](../../../docs/KEYWORDS.md). Read it before Assist or
Technique text. User-supplied print stays verbatim. If those words are
outside the glossary, the card is not finished, and the supplied words stay
intact.

Print says **Fighter**. The JSON type stays a creature definition. Do not
rename the file layout.

## Identity

| Piece | Field | Notes |
|---|---|---|
| Life | `life` | Defeated when damage reaches life |
| Base die | `baseDie` | Face ids. The match copies this onto the current die. The player does not build it in the deck |
| Face actions | on each face | Any of your Fighters, Active, Reserve, or defeated |
| Techniques | `techniques` | Active Fighter only. Primary is that Fighter's showing face. Secondary is another of your rolled dice: any punch, any kick, a single strength, or one strength and one strike. The Technique has `hitStrength` and `hitType`. Strength sets Meter, not damage. Print the requirement as `X + Y: [Strike N]`. Do not prefix it with `On attack:` |
| Assist | `assistName`, `assistRulesText`, `assistEffects` | Not the Active Fighter. May be defeated. Not a card. Once per turn. `[Redirect N]` is the next hit or Technique Strike in this Chain, up to N, then it ends |
| Assist Meter | `exceptionalAssistMeter` | Omit it and the Assist spends 0. A number greater than 0 is spent |
| Passive | `passiveRulesText`, optional `standingAbilities` | Optional. Data-driven hooks only when the engine already models the clause |

A defeated Fighter stays defeated and can still Assist. Defeating the Active
Fighter opens a choice of a living Reserve when no decision is already
pending. That choice spends no Tag and no Meter.

`archetype` is a label. It does not ban deck construction. Defeating a
Fighter marked legendary does not by itself end the match. Do not set
`legendary` as a win condition.

## Schema leftovers

The creature schema still requires `attacks` (at least one). Do not design
that array as the Fighter. If validation still requires it, keep the
smallest legal attack with empty `rulesText` and no `[Requires]` / `[Spend]`.
Put the real moves on faces and `techniques`.

## Shape

```json
{
  "id": "creature-magnus",
  "name": "Magnus",
  "life": 20,
  "passiveRulesText": "",
  "assistName": "Wall",
  "assistRulesText": "",
  "attacks": [
    {
      "id": "attack-magnus-placeholder",
      "name": "Placeholder",
      "kind": "basic",
      "range": false,
      "rulesText": ""
    }
  ]
}
```

That attack exists because the schema requires one. It is not the moveset.
Put real moves on faces and `techniques`. Fill `baseDie` with face ids this
change adds or that already exist.

## Do not author

- A personal deck, hand, or die-construction list
- An Assist card, or an Assist that negates a card
- A Tag face
- Shield as a starting resource
- The same Technique copied onto every Fighter with the name changed
