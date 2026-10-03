# 029 — Fighter combat core (named faces, techniques, Meter ops)

Status: **IMPLEMENTED** (engine + Grappler proving catalogue, 2026-09-29)

Offensive sequence, face availability, and the Act loop are spec
[`030-offensive-control.md`](./030-offensive-control.md) (revised 2026-10-02).
This spec’s named faces and ordered techniques still stand. Face consumption
in the rules below is withdrawn by that revision.

Combat-core foundations for Tag Skirmish / future fighters: **named typed
faces**, **Primary / Secondary face effects**, **simple single-face actions**,
**two-face Fighter techniques**, and **generic Meter** queries/ops.

Does **not** invent cards, combos, footsies, full Tag/Assist redesign, frames,
stun, or Meter spend/gain for these new actions. Related: specs `018`, `020`,
`028`, [`RULEBOOK.md`](../RULEBOOK.md), [`KEYWORDS.md`](../KEYWORDS.md),
[`OPEN_DESIGN.md`](../OPEN_DESIGN.md).

Keep engine types named `Creature*`. Print/UI say **Fighter**.

## Naming collision (strangler)

| Name in code | Meaning | Spec |
|---|---|---|
| `Technique` | Face **category** for Tag Skirmish toolkit faces (`strike`, `guard`, `heavy`, …). Gates native `ATTACK` via `requiredTechniques`. | `028` |
| `FaceType` | Named-action **type** on a die face (`attack`, `grab`, `guard`, `movement`, `tag`, …). Extensible; **no** inherent gameplay meaning. | **this** |
| `FighterTechniqueDefinition` | A **two-face Fighter move** (primary face id + secondary face id **or** face type + base effects). | **this** |

Do **not** rename `Technique` → `FaceType`. Additive fields only. Legacy faces
without `faceType` / `primaryEffects` are **not** usable by the new actions.

## Intent

1. Each die face may be a **named** action with optional `faceType`,
   `primaryEffects`, and `secondaryEffects` (data-driven; shapes may differ).
2. **Simple action (`USE_FACE`):** the acting player’s living **Active** Fighter
   uses the showing face on **their own** bound die and resolves that face’s
   **Primary** effects.
3. **Fighter technique (`USE_TECHNIQUE`):** a named technique on that Fighter
   requires (a) the Fighter’s own die showing the technique’s **primary face**,
   and (b) **another** die showing a face that matches the technique’s
   **secondary** requirement (`faceId` **or** `faceType`). Resolve base
   technique effects, then apply the secondary face’s **Secondary** effects
   (including local damage modifiers — see ASSUMED).
4. **Meter** remains a generic `PlayerState.meter` resource with public
   query/clamp/grant/spend/set. How face and technique actions gain or spend
   Meter is **open** (spec `030`). The engine fields `meterCost` / `meterGain`
   are not that rule.

## Rules

Bible is silent. Rows below are `ASSUMED` where noted; otherwise this brief.

1. **Face types.** Closed starter set, string-extensible in schema/code:
   `attack` | `grab` | `guard` | `movement` | `tag`. Types have **no** fixed
   damage or legality of their own.
2. **Primary / Secondary.** Optional `EffectDefinition[]` on
   `FaceCardDefinition`. Empty / omit = not usable for that role.
3. **Actor (`ASSUMED`).** Living Active Fighter of the acting player (reuse
   `activeCreatureId` / `isActiveFighter`).
4. **Own die.** Primary face is always the showing face on
   `dieForCreature(actor)`.
5. **Secondary die (`ASSUMED` in engine, `OPEN` in spec `030`).** The engine
   query uses any **other** die owned by the acting player that is rolled
   (`rolledSlotIndex !== null`): `secondaryDiceFor`. Dice ownership is not a
   finalized rule.
6. **Damage target (`ASSUMED`).** Reuse effect JSON selectors; proving content
   uses `declared-target` and commands pass opponent Active (same as gated
   Tag Skirmish attacks).
7. **Consumption.** Withdrawn (spec `030`, 2026-10-02). A used face stays
   available. Repetition is limited by the offensive sequence and the
   Fighter’s action rules, not by spending the face. The engine flag
   `consumeDiceOnFaceActions` / `face-action:<dieId>` is leftover from the
   2026-09-30 slice and is not the design.
8. **Phase (`ASSUMED`).** `actions` only; same seat/pending gates as `ATTACK`.
9. **Reaction window.** Not decided (spec `030`). The Defender’s response is
   not “they rolled a defensive face.” Exact card and chain rules are open.
   The engine opens a chain only for faces/techniques that set `sequenceRole`;
   that flag is leftover, not the rule.
10. **Legacy faces.** Missing `faceType` or empty `primaryEffects` → illegal
    for `USE_FACE`. Techniques only match faces that satisfy their secondary
    requirement (typed or specific id).
11. **Secondary damage modify (`ASSUMED`).** While resolving a technique, each
    secondary effect of type `next-attack-bonus` adds its `amount` to every
    `damage` effect in the technique’s **base** `effects` for **this**
    resolution only (does **not** arm `nextAttackBonus` / next `ATTACK`).
    Other secondary effect types are pushed on the resolution stack **after**
    the (possibly modified) base effects.
12. **Ordered roles.** Primary face = own die; secondary = other die. Swapping
    which die is “primary” is impossible for `USE_TECHNIQUE` (primary is always
    the Fighter’s bound die). A technique whose primary requirement is Lariat
    does **not** fire when the own die shows Grab and a secondary die shows
    Lariat.
13. **Meter conflict.** Spec `028` ASSUMED knobs (`meterPerDamageDealt`,
    Tag-cancel / Assist spends, card `meterCost`) remain in the engine for Tag
    Skirmish. This spec forbids Meter change from **new** face/technique
    actions only. User must decide whether `028` Meter economy stays.

## State Changes

| Field | Change |
|---|---|
| `FaceType` | New union + `isFaceType` |
| `FaceCardDefinition.faceType?` | Optional |
| `FaceCardDefinition.primaryEffects?` | Optional `EffectDefinition[]` |
| `FaceCardDefinition.secondaryEffects?` | Optional `EffectDefinition[]` |
| `FighterTechniqueDefinition` | On `CreatureDefinition.techniques?` |
| `GameRulesConfig.consumeDiceOnFaceActions` | Leftover engine flag. Design (spec `030`) does not spend the face. |
| `GameAction` | `USE_FACE`, `USE_TECHNIQUE` |
| Log | `face-used`, `technique-used` |
| `PlayerState.meter` | Unchanged shape; public ops/queries |

No change to `comboCount` from these actions. Whether a face or technique
changes Meter is open (spec `030`). This slice did not define a delta.

## Actions

```text
{ type: "USE_FACE",      playerId, creatureId }
{ type: "USE_TECHNIQUE", playerId, creatureId, techniqueId, secondaryDieId }
```

Intent only. Engine derives showing faces, legality, and effects. Host overrides
`playerId` by seat (`007`).

## Validation

Both: match in progress; `actions` phase; acting player; no blocking pending
(except as today’s other actions); `creatureId` is that player’s living Active;
bound die rolled. The engine still rejects a die already marked
`face-action:<dieId>` when `consumeDiceOnFaceActions` is set. That check is
not the design (spec `030`: the face is not consumed).

**USE_FACE:** showing face has non-empty `primaryEffects`.

**USE_TECHNIQUE:** technique id on that Fighter’s definition; own die shows
`technique.primaryFaceId`; `secondaryDieId` is in `secondaryDiceFor(...)`;
secondary die rolled and (if consume) not spent; showing secondary face matches
`technique.secondary` (`faceId` equality **or** `faceType` equality).

Illegal → `GameError` + **original** state.

## Resolution

**USE_FACE**

1. Validate.
2. The engine may mark the primary die spent (`consumeDiceOnFaceActions`).
   Spec `030` withdraws that spend: the face stays available.
3. Emit `face-used`.
4. Push `primaryEffects` (reverse order) via `pushEffect` with
   `declaredTargetCreatureId = opponent Active`, `fromAttack = false`.
5. `drainResolution` in the current engine when `sequenceRole` is omitted. A
   chain for `sequenceRole` faces is leftover engine behavior. Spec `030` does
   not decide the response mechanic.

**USE_TECHNIQUE**

1. Validate primary + secondary + technique match.
2. The engine may mark the primary and secondary dice spent. Spec `030`
   withdraws that spend.
3. Emit `technique-used`.
4. Sum `next-attack-bonus` amounts from secondary face `secondaryEffects`.
5. For each technique `effects` entry: if `damage`, add that sum to `amount`;
   else unchanged. Push modified base effects (reverse).
6. Push remaining secondary effects (exclude `next-attack-bonus`) reverse.
7. `drainResolution` in the current engine when `sequenceRole` is omitted.
   Opening a chain from `sequenceRole` is leftover engine behavior, not spec
   `030`. `fromAttack = false`.

## Networking

Host authority (`007`). Clients send intent only.

## Persistence

Catalogue JSON only. No localStorage / deck-builder change required for Grappler
proving data (not added to Tag Skirmish builtin loadout).

## UI

Out of scope for this slice (`match-ui` follow-up):

- Buttons / legality for `USE_FACE` / `USE_TECHNIQUE` using
  `legalFaceActions` / `matchingTechniques`.
- Show face Type and Primary / Secondary print.
- Meter display already exists; no new Meter UX from this slice.

## Data model

```text
FaceCardDefinition += {
  faceType?: FaceType
  primaryEffects?: EffectDefinition[]
  secondaryEffects?: EffectDefinition[]
}

FighterTechniqueDefinition = {
  id: string          // technique-<fighter>-<kebab>
  name: string
  primaryFaceId: FaceCardId
  secondary: { faceId: FaceCardId } | { faceType: FaceType }
  effects: EffectDefinition[]
  rulesText?: string
}

CreatureDefinition += { techniques?: FighterTechniqueDefinition[] }
```

## Queries / Meter (public `@server`)

| API | Role |
|---|---|
| `meterOf(state, playerId)` | Current meter |
| `clampMeter(amount, cap)` | Clamp to `0..cap` |
| `grantMeter` / `spendMeter` / `setMeter` | Draft mutations (clamp to `meterCap`) |
| `legalFaceActions(state, playerId)` | Active fighters that may `USE_FACE` |
| `matchingTechniques(state, playerId, creatureId)` | Legal technique + secondary die pairs |
| `secondaryDiceFor(state, playerId, primaryDieId)` | Candidate secondary dice |

## ASSUMED (also `OPEN_DESIGN.md`)

- Secondary die = any other owned rolled die.
- Actor = living Active; damage target via effect JSON / opponent Active.
- Die consumption is **withdrawn** (spec `030`). The engine flag remains until removed.
- `actions` phase; no reaction window.
- Legacy faces without Type/Primary not usable by new actions.
- `next-attack-bonus` in secondaryEffects = local technique damage bonus.

## NOT DECIDED

- Meter max / generation / spending / gain triggers / costs / Meter abilities
  for face & technique actions (explicitly **not** granted or spent here).
- Whether spec `028` Meter knobs (strike grant, Tag-cancel, Assist cost) stay
  long-term (**conflict** — user decides).
- Full Tag system beyond `faceType: "tag"` as data.
- Assists, combos, footsies, frames, stun, counter-hit, in-match die craft.
- Cards (fighter / team / universal / archetype).
- Whether `USE_FACE` / `USE_TECHNIQUE` should ever open a reaction window.
- Whether secondary dice may include opponent dice or Reserve-only dice.

## Acceptance Criteria

- [x] Spec + model + schema + commands + queries + Meter ops
- [x] Grappler proving Fighter + six named faces + ≥2 techniques
- [x] Focused tests listed below
- [x] RULEBOOK / KEYWORDS / OPEN_DESIGN updated
- [x] Existing Tag Skirmish / ATTACK / TAG / ASSIST tests still pass
- [x] DoD: typecheck, test, lint; `npm run build`

## Tests

- [x] Named typed faces with primary/secondary on Grappler die
- [x] `USE_FACE` Lariat deals Primary 2
- [x] Technique Lariat + Grab-type applies base + Grab Secondary (+damage)
- [x] Lariat + Guard resolves differently (shield / no +damage)
- [x] Specific-face secondary requirement
- [x] Ordered primary role (swap does not fire)
- [x] Illegal: wrong face, unrolled, same die as secondary, non-matching secondary
- [x] Meter query/increase/decrease/clamp; new actions do not change Meter
- [x] Second fixture fighter via overlay uses same code path
