# 028 — 3v3 tag-fighter prototype

Status: **IMPLEMENTED** (engine + Tag Skirmish catalogue, 2026-09-28)

Engine tests keep `DEFAULT_RULES_CONFIG` (2 dice). Live prototype uses
`TAG_FIGHTER_RULES` + loadout `deck-tag-skirmish`.

Prototype intent (user-directed). Knobs are `ASSUMED` playtest values in
[`OPEN_DESIGN.md`](../OPEN_DESIGN.md), **not** bible. When a later slice ships
engine behavior, fold player wording into [`RULEBOOK.md`](../RULEBOOK.md) and
print into [`KEYWORDS.md`](../KEYWORDS.md) in that same change.

Keep `Creature*` types internally. Call them **Fighters** in print/UI.
Do **not** rewrite `resolution.ts` or `MatchBoard`. No mana dice, no
hard-coded fighter ids in combat, no temporary face replacement.

Related: [`ARCHITECTURE.md`](../ARCHITECTURE.md), specs `007`, `008`, `018`,
`020`. Holder voice: `you` / `opponent`.

## Intent

Two players, three persistent fighters each. One **Active**, two **Reserve**.
Each fighter is bound to exactly one custom d6. Faces are **techniques**
(combat toolkit), not mana. Native attacks gate on the **showing technique**
on **that fighter’s** die. **Meter** pays Tag-cancel and Assist when the
matching technique is not showing. First player whose three fighters are all
dead loses.

## Rules

Bible is silent; rows below that are not this brief are `ASSUMED`.

1. **Squad.** `creaturesPerPlayer: 3`. Fighters persist for the match.
   `hp <= 0` = existing `defeated` (`damage >= life`). Dead fighters stay in
   `creatureIds`; they cannot attack, tag in, or assist.
2. **Active / Reserve.** `PlayerState.activeCreatureId` is authority. Setup:
   `creatureIds[0]` Active, `[1]` and `[2]` Reserve. **TAG** swaps Active with
   a living Reserve. Player-facing names: Active / Reserve. Reuse
   `BattlefieldPosition` only as a later sync (`frontline` = Active, `back` =
   Reserve, `frontlineSlots: 1`); combat legality in this prototype reads
   `activeCreatureId`, not leftover 2-frontline targeting.
3. **Dice bind.** `dicePerPlayer: 3`. `StartingDiceLayout` becomes
   `readonly DieFaceLayout[]` with `length === dicePerPlayer`.
   `player.dieIds[i]` is bound to `player.creatureIds[i]` (index, not
   `DieState.attachedToCreatureId`, which stays absorb leftover). Query
   `dieForCreature`; do not hard-code instance ids.
4. **Techniques.** New type `Technique`: `strike` | `guard` | `heavy` |
   `special` | `tag` | `assist` | `signature` | `combo` | `dodge` | `counter`.
   `FaceCardDefinition.symbol` stays `Attribute | shield` for absorb. Add
   optional `technique?: Technique`. Prototype technique faces set `technique`
   **and** a matching `symbol` if the schema still requires one. Identity
   naturals omit `technique`.
5. **Roll.** Shared `ROLL_DICE` still rolls **all** of both seats’ dice
   (Reserve dice must show Assist / etc.). No mana dice.
6. **Attack.** Attacker must be the acting player’s **living Active**.
   `AttackDefinition.requiredTechniques?: readonly Technique[]` (AND): the
   showing face on **that fighter’s** die must have each listed `technique`.
   Prototype attacks list one. Unrolled die (`rolledSlotIndex === null`) is
   illegal. Repurpose `ATTACK_NOT_FUELLED` (not pile). Printed pile
   `[Requires]` / `[Spend]` stay unenforced. **Target (`ASSUMED`):**
   opponent’s living Active only. Reserve is never a legal attack target
   (Range does not hit the bench in this prototype).
7. **Meter.** `PlayerState.meter` integer, `0..meterCap`. Spend: Tag-cancel,
   Assist, later cards. Grant (`ASSUMED`): after attack Strike HP actually
   lost (`fromAttack`), add `meterPerDamageDealt * hpLost` to the dealer,
   clamp to cap. Meter is a **resource**, not a Mark token (KEYWORDS later).
8. **TAG.** `{ type: "TAG", playerId, reserveCreatureId }`. If Active die
   **shows** `tag`, cost 0; else spend `tagCancelMeterCost`. Switch
   `activeCreatureId`. Reset `comboCount`. Dead / non-reserve / foreign id →
   illegal. **KO (`ASSUMED`):** when Active becomes `defeated` and a living
   Reserve exists, promote the lowest-index living Reserve (no meter, reset
   combo). If none, `checkVictory`.
9. **ASSIST.** `{ type: "ASSIST", playerId, reserveCreatureId }`. Named
   creature must be a living Reserve of the actor. Legal if that fighter’s
   die **shows** `assist` **or** the player spends `assistMeterCost` (free
   technique wins; do not also spend). Run
   `CreatureDefinition.assistEffects` (data-driven `EffectDefinition[]`;
   omit / empty → `CARD_HAS_NO_EFFECT`). **Once per named reserve per turn**
   (`spentOncePerTurnKeys` `assist:<creatureId>`, `ASSUMED`).
10. **Combo.** `PlayerState.comboCount` starts 0. Increment when Active
    successfully **declares ATTACK**. Reset on TAG, KO-promote, and
    `END_TURN` if `comboResetsOnEndTurn` (default true). Cards/attacks may
    read it later; prototype only tracks.
11. **Victory.** `checkVictory`: if a player has all three fighters
    `defeated`, that player loses and the opponent wins. Simultaneous wipe
    (`ASSUMED`): active player loses. No deck-out. Plug into existing
    `checkVictory` (today a no-op); extract a helper — do not grow
    `resolution.ts`.
12. **Attacks per combat.** `attacksPerCreaturePerCombat: 2` (was 1). Still
    cleared on `END_TURN` with `attacksUsedThisCombat`.
13. **Cards.** Existing `CardType` unchanged. Optional
    `fighterRestriction?: CreatureDefinitionId` (legal to play only if that
    id is in your squad and living). Optional
    `archetypeRestriction?: string` (legal if any living squad fighter’s
    `CreatureDefinition.archetype` matches). Content buckets (JSON later):
    universal / fighter-locked / archetype-locked / technique faces.
    `playCost` remains unused fuel data.
14. **Forge.** Reuse `FORGE_CARD`. In-match evolution is forge onto the bound
    die. Technique faces + forge cards are catalogue later. No temp overwrite
    opcode.
15. **Print.** `[Tag]`, `[Assist]`; technique names are face names. Keywords
    file in the engine slice, not this spec.

## State Changes

| Field | Change |
|---|---|
| `GameRulesConfig` | New knobs below; `dicePerPlayer` 3; `openingHandSize` 4; `deckMinCards` 10; `deckMaxCards` 24; `attacksPerCreaturePerCombat` 2 |
| `StartingDiceLayout` | `readonly DieFaceLayout[]` |
| `Technique` | New union (model) |
| `FaceCardDefinition.technique?` | Optional |
| `AttackDefinition.requiredTechniques?` | Optional AND list |
| `CreatureDefinition.assistEffects?` / `archetype?` | Optional |
| `CardDefinition.fighterRestriction?` / `archetypeRestriction?` | Optional |
| `PlayerState` | `activeCreatureId`, `meter`, `comboCount` |
| `GameError` | `INSUFFICIENT_METER` (reuse `ATTACK_NOT_FUELLED`, `CREATURE_DEFEATED`, `INVALID_TARGET`, `ALREADY_USED`) |
| Log | `tag-switched`, `assist-declared`, `meter-changed`, `combo-changed` |
| `GameState.winner` / `status` | Wipe via `checkVictory` |

Defaults (`ASSUMED`): `dicePerPlayer: 3`, `meterCap: 8`,
`meterPerDamageDealt: 1`, `tagCancelMeterCost: 2`, `assistMeterCost: 1`,
`openingHandSize: 4`, `deckMinCards: 10`, `deckMaxCards: 24`,
`attacksPerCreaturePerCombat: 2`, `comboResetsOnEndTurn: true`.
`isStartingDiceLayout` must use `dicePerPlayer`, not a hardcoded 2.

## Actions

```text
{ type: "TAG",    playerId, reserveCreatureId }
{ type: "ASSIST", playerId, reserveCreatureId }
```

Intent only. Engine derives cost, switch, and effects. Host overrides
`playerId` by seat (`007`).

## Validation

Both: `actions` phase, acting player, no blocking `pendingDecision` (except
as today’s other actions), match in progress, named id is that player’s
living Reserve.

**TAG:** showing `tag` on Active die **or** `meter >= tagCancelMeterCost`.

**ASSIST:** showing `assist` on **that reserve’s** die **or**
`meter >= assistMeterCost`; `assistEffects` present; not already spent this
turn.

**ATTACK (delta):** attacker === `activeCreatureId`; showing techniques
satisfy `requiredTechniques`; target === opponent `activeCreatureId`.

Illegal → `GameError` + **original** state.

## Resolution

New command modules `commands/tag.ts` and `commands/assist.ts`; `reduce.ts`
stays a facade. `attack.ts` gains Active + technique gates (keep file under
budget or extract).

**TAG:** pay meter if needed → set `activeCreatureId` → `comboCount = 0` →
emit `tag-switched`. No reaction window (`ASSUMED`, like `FORGE_CARD`).

**ASSIST:** pay if needed → spend once-per-turn key → queue `assistEffects`
on the resolution stack (controller = actor, `sourceCreatureId` = reserve) →
`drainResolution`. Reaction window `ASSUMED` **no** (silent like forge)
until a proving assist needs chain.

**Meter grant** lives next to `dealDamage` HP apply, not a client action.

**Victory** after defeat / KO-promote: `checkVictory`.

Do not grow frozen files; `module-budget.test.ts` is DoD.

## Networking

Host authority. Clients send `TAG` / `ASSIST` intents only. New variants are
JSON. `match-ui` / PeerJS: no rules on the adapter (`007`).

## Persistence

Loadouts: three d6 layouts; tactics **10–24** (existing 40–50 lists fail
max until rebuilt — min 10 is not the problem). Saved-deck schema follows
`StartingDiceLayout` length. Builtin loadouts later (`deck-designer`).
`openingHandSize: 4` may break tests that assume 5 — prefer 4 (see
OPEN_DESIGN).

## UI

Instructions for **match-ui** (do not implement in slice 1):

- Show 3 fighters / 3 dice; bind die i to fighter i; mark Active vs Reserve.
- Meter and combo on the player strip.
- TAG / ASSIST controls (legal via engine queries, not a second rules copy).
- Attacks only from Active; hide/disable Reserve attack declares.
- Dead fighters stay visible, not actionable.
- Match end when `status === "finished"` (wipe).
- Do not rewrite `MatchBoard` in one shot — extract panels.

## Acceptance Criteria

- [ ] Spec + OPEN_DESIGN `ASSUMED` knobs only (this slice)
- [ ] Later: 3 dice bound by index; `StartingDiceLayout` length = `dicePerPlayer`
- [ ] Later: TAG free on showing Tag, else meter; switches Active; resets combo
- [ ] Later: ASSIST from Reserve (showing Assist or meter) runs `assistEffects`
- [ ] Later: ATTACK only Active; technique gate; target opponent Active
- [ ] Later: `checkVictory` wipe (3 `defeated`) sets `winner`
- [ ] Later: RULEBOOK + KEYWORDS (`[Tag]`, `[Assist]`, techniques); meter as resource
- [ ] No `resolution.ts` / MatchBoard rewrite; no mana dice

## Tests

Later engine slice (not this file):

- [ ] Setup: 3 dice, bind i, Active = squad[0], meter 0, combo 0
- [ ] TAG: free vs paid; refuse dead / Active / poor meter
- [ ] KO-promote; wipe victory; simultaneous wipe
- [ ] ASSIST: technique vs meter; empty effects refuse; once-per-reserve
- [ ] ATTACK: technique gate; refuse Reserve attacker / Reserve target
- [ ] Combo increment on Active attack; reset TAG / END_TURN
- [ ] Meter grant on Strike HP; clamp to cap
- [ ] `validateLoadout` 10–24 / 3 layouts; `isStartingDiceLayout` uses config
- [ ] `module-budget.test.ts` + purity
