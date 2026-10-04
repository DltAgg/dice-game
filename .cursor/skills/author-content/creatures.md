# Fighters

File: `src/server/content/creatures/<creature-id>.json` (id constant in
`creatures.ts`)
Types: `src/server/model/creatures.ts`, `fighterTechniques.ts`
Schema: `src/server/content/schema/creature.schema.json`

Print says **Fighter**. The JSON type stays a creature definition. Do not
rename the file layout.

## Identity

| Piece | Field | Notes |
|---|---|---|
| HP | `life` | Damage is state, not a second max |
| Base die | `baseDie` | Face ids. Length is `facesPerDie`. The match copies this onto the current die. The player does not build it in the deck |
| Simple Actions | on each face's `primaryEffects` | Own die only. Not a pile-cost attack |
| Techniques | `techniques` | `FighterTechniqueDefinition`. Primary face on this Fighter's die. Secondary is a named face, a face type, a sequence role, or a strike class (`hitStrength` and/or `hitType`, such as a light kick) on **another of your dice**. The Technique itself has both `hitStrength` and `hitType`. Ordered, not a set |
| Assist | `assistName`, `assistRulesText`, `assistEffects` | Fighter-owned. Not a card. May be offensive, defensive, utility, or meter-enhanced. Uses the chain |
| Exceptional Assist | `exceptionalAssistMeter` | Omit to use the shared Assist meter knob. Not a cost for merely having an Assist |
| Passive | `passiveRulesText`, optional `standingAbilities` | Optional. Data-driven hooks only when the engine already models the clause |

A KOed Fighter cannot become Active and cannot Tag. They still roll, and
they can still Assist, until a later rule says otherwise. Do not author a
bonus die, reroll, or card for the KO.

`archetype` is a label a card's `archetypeRestriction` can match. It does
not ban deck construction.

## Schema leftovers

The creature schema still requires `attacks` (at least one) and may still
describe pile costs and a legendary win. Do not design that array as the
Fighter. If validation still requires it, keep the smallest legal attack
with no `[Requires]` / `[Spend]`, and put the real moves on faces and
`techniques`. Do not set `legendary`.

`requiredTechniques` on an attack is the old toolkit gate (`strike`,
`guard`, …). New moves use `FighterTechniqueDefinition`, not that gate, and
do not require a Guard face.

## Shape

```json
{
  "id": "creature-magnus",
  "name": "Magnus",
  "life": 20,
  "passiveRulesText": "",
  "assistName": "Clinch",
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
change adds or that already exist. Fill `techniques` only when both inputs
exist.

## Do not author

- ATK/DEF or any other generic stat block
- A personal deck, hand, or die-construction list
- An Assist card
- A Tag face "so they can tag"
- Shield as a starting resource
- The same Technique copied onto every Fighter with the name changed
