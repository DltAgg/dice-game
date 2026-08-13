# Reference — hooks, effects, deferral

## Standing hooks (`010`)

| Hook | Catalogue | Module |
|---|---|---|
| on-deal-damage | `EquipmentAbility` | `triggers.fireOnDealDamage` |
| on-toxin-damage | `EquipmentAbility` | `triggers.fireOnToxinDamage` |
| on-roll-symbol | `EquipmentAbility` | `triggers.fireOnRollSymbol` |
| on-absorb (gear) | `EquipmentAbility` | `triggers.fireOnAbsorbEquipment` |
| on-absorb (face) | `FaceCardDefinition.onAbsorb` | absorb path in reducer + triggers |
| on-absorb (overload) | `OverloadRegion.onAbsorb` | same |
| on-roll (face) | `FaceCardDefinition.onRoll` | `ROLL_DICE` in `reduce.ts` |
| on-roll (overload) | `OverloadRegion.onRoll` | after face onRoll for showing face |

## Effect union (grow carefully)

See `src/game/model/effects.ts`. Current members include: `damage`, `heal`,
`grant-shield`, `generate-symbol`, `draw-cards`, `discard-cards`, `search-deck`,
`search-graveyard`, `gain-energy`, `destroy-equipment`, `apply-toxin`,
`remove-shield`, `next-attack-bonus`, `negate-tactic`, `grant-damage-prevent`,
`prevent-attack-reflect`, `arm-prevent-draw`.

## Common deferred cues (do not fake)

From `docs/DEFERRED_CATALOGUE.md` — if print needs these, standardize text and
park until vocabulary exists:

- Reposition / push / swap
- Peek / dig / bottom deck
- Symbol conversion / treat-as
- Conditional “if attacked / if frontline / if adjacent”
- Multi-target damage split
- Face copy / echo
- Prevent + reflect (Judgement-style is partially in `009` — check before deferring)
- Forge-from-effect

## Ritual timing reminder

| Subtypes | After activate |
|---|---|
| `instant` or `reaction` (no `continuous`) | → graveyard |
| `continuous` | stay, exhausted |

Reaction vs Instant = window legality, not field permanence.

## Files checklist

| Task | Path |
|---|---|
| Face catalogue | `src/game/content/faces.ts` |
| Tactic catalogue | `src/game/content/cards.ts` |
| Effects / targets | `src/game/model/effects.ts` |
| Equipment abilities | `src/game/model/cards.ts` |
| Hooks | `src/game/reducer/triggers.ts` |
| Hook tests | `src/game/reducer/triggers.test.ts` |
| Spec | `docs/specs/010-trigger-hooks.md` |
| Backlog | `docs/DEFERRED_CATALOGUE.md` |
