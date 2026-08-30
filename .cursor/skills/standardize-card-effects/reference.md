# Reference — hooks, effects, deferral

## Standing hooks (`010`)

| Hook | Catalogue | Module |
|---|---|---|
| on-deal-damage | `EquipmentAbility` | `triggers.fireOnDealDamage` |
| on-toxin-damage | `EquipmentAbility` | `triggers.fireOnToxinDamage` |
| on-roll-symbol | `EquipmentAbility` | `triggers.fireOnRollSymbol` |
| on-absorb (gear) | `EquipmentAbility` | `triggers.fireOnAbsorbEquipment` |
| on-absorb (face) | `FaceCardDefinition.onAbsorb` | attribute bank path → `queueAbsorbTriggers` (spec `016`) |
| on-absorb (overload) | `OverloadRegion.onAbsorb` | same — fires when pip banks into owner pile |
| on-roll (face) | `FaceCardDefinition.onRoll` | `ROLL_DICE` in `reduce.ts` |
| on-roll (overload) | `OverloadRegion.onRoll` | after face onRoll for showing face |

## Effect union (grow carefully)

See `src/server/model/effects.ts`. Current members include: `damage`, `heal`,
`grant-shield`, `generate-symbol`, `draw-cards`, `discard-cards`, `search-deck`,
`search-graveyard`, `destroy-equipment`, `apply-toxin`,
`remove-shield`, `next-attack-bonus`, `negate-card`, `grant-damage-prevent`,
`prevent-attack-reflect`, `arm-prevent-draw`.

## Common deferred cues (do not fake)

From `docs/DEFERRED_CATALOGUE.md` — if print needs these, standardize text and
park until vocabulary exists:

- Peek / dig / bottom deck
- Symbol conversion / treat-as
- Conditional “if attacked / if frontline / if adjacent”
- Multi-target damage split
- Face copy / echo
- Prevent + reflect (Judgement-style is partially in `009` — check before deferring)
- Forge-from-effect

Do **not** design or restore **enemy push** (forced move of opposing creatures).
Ally **swap** / **reposition** are legal — prefer:

| Print cue | Wire |
|---|---|
| Swap with a frontline ally | `swap-positions` + `choose-allied-frontline` |
| This creature may move 1 position | `reposition-creature` + `source-creature` |
| An allied creature may reposition | `reposition-creature` + `choose-ally` |
| On change position: … | `on-change-position` StandingTrigger |

Optional “may” without a decline action → OPEN_DESIGN ASSUMED (choose when
legal; whiff when none).

## Ritual timing reminder

| Subtypes | After activate |
|---|---|
| `instant` or `reaction` (no `continuous`) | → graveyard |
| `continuous` | stay, exhausted |

Reaction vs Instant = window legality, not field permanence.

## Files checklist

| Task | Path |
|---|---|
| Face catalogue | `src/server/content/faces/*.json` |
| Tactic catalogue | `src/server/content/cards/*.json` |
| Effects / targets | `src/server/model/effects.ts` |
| Equipment abilities | `src/server/model/cards.ts` |
| Hooks | `src/server/reducer/triggers.ts` |
| Hook tests | `src/server/reducer/triggers.test.ts` |
| Spec | `docs/specs/010-trigger-hooks.md` |
| Backlog | `docs/DEFERRED_CATALOGUE.md` |
