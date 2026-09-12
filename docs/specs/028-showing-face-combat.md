# 028 — Showing-face attack unlocks

Status: **IN PROGRESS** (engine slice shipped; catalogue retune is card-designer). `OPEN_DESIGN.md` **DECIDED** 2026-09-12.

Replaces pile `[Requires]` / `[Spend]` as creature-attack fuel. Cards, rituals,
and synthetic forge still use `attributePool` (spec `016`).

## Intent

Combat must not auction against cards for the same tokens. Legendary HP is the
only win condition, so spending the pile on Strike was always the correct play.
Attacks are now a **dice question**: which of your showing faces unlock which
printed attacks this turn. There is **no second roll** on declare — read the
faces already showing after `ROLL_DICE` / `[Reroll]`.

Bible §24 still applies: combat stays simple; complexity stays on the engine.
This spec changes the **gate**, not the combat minigame.

## Rules

1. **Unlock, not fuel.** Each `AttackDefinition` has required `unlock`
   (`SymbolRequirement` of named attributes only — **no** `any`). Print
   `[Unlock: Mechanical]`, `[Unlock: 2 x Mechanical]`,
   `[Unlock: Mechanical + Luminar]`. Do **not** reprint `[Requires]` /
   `[Spend]` on attacks.
2. **Showing faces.** For the attacking creature’s **owner**, look at each
   owned die’s current `rolledSlotIndex`. If that slot’s face `symbol` is an
   `Attribute`, count **+1** of that attribute. Shield / untyped / missing
   slot / `rolledSlotIndex === null` count nothing. **Faces, not pips:**
   inherent extra pips, forge yield, and Overcharge generate do not add
   extra unlock counts.
3. **Whose dice.** Only the owner’s dice. Opponent showing faces never unlock
   your attacks.
4. **Silence.** A silenced showing slot still displays its attribute and
   still counts (silence skips effects, not the showing face).
5. **Match.** The attack is unlocked when the owner’s showing-attribute
   counts meet every named count in `unlock` (AND). `[Resonance]` wildcards
   do **not** apply. `[Discount]` does not apply.
6. **No pile interaction.** `ATTACK` does not check or burn `attributePool`.
   Tactics `[Requires]` / header `[Spend]`, ritual Active-when / Spend, and
   synthetic forge costs are unchanged.
7. **Once per creature.** `attacksPerCreaturePerCombat` + `[Frenzy]` extras
   still apply. Extra attacks use the **current** showing faces (no reroll).
8. **Reroll.** `[Reroll]` changes that die’s showing face; unlocks recompute.
   `[Stamp]` does not change the showing face, so unlocks stay.
9. **Retain.** A retained showing face still unlocks on later rolls until
   retain is spent (existing retain rules).
10. **Declare window.** Declaring an unlocked attack still opens the attack
    reaction window (spec `008` / `009`). Prevent still answers; negate still
    does not.
11. **Empty unlock.** An attack with an empty / omitted `unlock` cannot be
    declared (`CARD_HAS_NO_EFFECT` is for missing `effect`; use
    `ATTACK_NOT_UNLOCKED` for unmet / empty unlock). Catalogue JSON must
    include a non-empty `unlock`.

Authoring defaults (mechanical port of the live six; card-designer may retune
**numbers and riders**, not this unlock grammar):

| Creature | Attack | `unlock` |
|---|---|---|
| Torque Wright | Crank (basic) | `{ mechanical: 1 }` |
| Torque Wright | Retool (special) | `{ mechanical: 2 }` |
| Dawn Warden | Kindle (basic) | `{ luminar: 1 }` |
| Dawn Warden | Vigil (special) | `{ luminar: 2 }` |
| Lodestar Artificer | Drive Shaft (basic) | `{ mechanical: 1 }` |
| Lodestar Artificer | Overdrive (special) | `{ mechanical: 1, luminar: 1 }` |
| Riftscribe Adept | Rune Lash (basic) | `{ arcane: 1 }` |
| Riftscribe Adept | Ley Surge (special) | `{ arcane: 1, darkness: 1 }` |
| Gravemarrow Shade | Grave Reach (basic) | `{ darkness: 1 }` |
| Gravemarrow Shade | Ebb of Names (special) | `{ darkness: 1, arcane: 1 }` |
| Duskthrone Oracle | Nightward Bolt (basic) | `{ darkness: 1 }` |
| Duskthrone Oracle | Verdict of Dusk (special) | `{ arcane: 1, darkness: 1 }` |

Single-attribute **specials** need **both** dice showing that attribute.
Dual-color **specials** need one showing face of each named attribute.
Dual-attribute **basics** name **one** of the creature’s attributes.

## State Changes

No new `GameState` bags. Unlock is derived from existing die showing slots +
catalogue `unlock`. Remove `requires` / `discards` from `AttackDefinition`.

## Actions

No new `GameAction`. `ATTACK` legality changes.

## Validation

`ATTACK` is legal when today’s checks pass **except** pile fuel:

- actions phase, living owned attacker, attack not already used, effect
  present, targeting legal (frontline / Range);
- **and** `attackIsUnlocked(state, ownerId, attack)` is true.

Failure: `ATTACK_NOT_UNLOCKED` (replace `ATTACK_NOT_FUELLED` at this call
site; remove or stop using `ATTACK_NOT_FUELLED` for attacks).

## Resolution

On declare: do **not** `payPileSpend` / consume wildcards for the attack.
Still emit `attack-declared`, increment `attacksUsedThisCombat`, push the
attack chain link, `fireOnAttack`, open the reaction window.

## Networking

Host authority unchanged. Clients still send `ATTACK` intents only.

## Persistence

None.

## UI

Do **not** reimplement unlock math in React. Query `@server`:

- `showingAttributeCounts(state, playerId)`
- `attackIsUnlocked(state, playerId, attack)`
- `formatAttackFuel` → `[Unlock: …]` (not Requires/Spend)

Match board: locked attacks visible but not armed; show why (need which
showing attributes). Catalogue / inspect / creature frame render `[Unlock]`.
Metrics agent preamble: “unpaid attacks” now means no matching showing face,
not leftover pile vs discards.

## Catalogue retune (card-designer)

- [x] Control unlocked basics must not be Aggro (MA-01 / MA-04). Strike 1, **no**
  Insight / Mill / Draw / Drain riders on basics.
- [x] Tempo/Aggro basics may keep higher Strike. Dawn Warden Heal moved off
  Kindle onto Vigil.
- [x] Specials keep identity riders; Unlock is the tax.
- [x] `docs/specs/003-creature-cards.md` and `docs/MECHANIC_ARCHETYPES.md` (MA-04
  RETARGETED; MA-19 showing-face unlock).

## Acceptance Criteria

- [x] `ATTACK` does not burn or gate on `attributePool`
- [x] Basic unlocks when one owned die shows the named attribute
- [x] `{ mechanical: 2 }` needs two showing Mechanical faces
- [x] Dual-color special needs both named attributes showing
- [x] Shield showing does not unlock an attribute attack
- [x] Opponent showing faces do not unlock your attacks
- [x] Silenced showing slot still counts
- [x] `[Reroll]` can open or close unlocks; `[Stamp]` does not
- [x] Resonance wildcards do not unlock
- [x] Frenzy extra attack uses current showing faces
- [x] Reaction window / Prevent unchanged
- [x] Live six creatures have `unlock`; no attack `requires` / `discards`
- [x] `docs/RULEBOOK.md` §13 (and pile sentences that say attacks spend)
- [x] `docs/KEYWORDS.md` `[Unlock]`
- [x] DoD: `npm run typecheck && npm test && npm run lint`

## Tests

- [x] `src/server/rules/attackUnlock.test.ts` (counts, shield, opponent, silence, empty)
- [x] `src/server/reducer/combat.test.ts` rewritten for unlocks (not pile)
- [x] `attributePileUp.test.ts` attack pile cases removed or replaced
- [x] Fixtures / `kit.ts` / `builders.ts` / autoplay `fight` use unlocks
- [x] `creatureText.test.ts` prints `[Unlock: …]`
- [x] Schema: `unlock` required; `requires` / `discards` forbidden on attacks

## File budget

New module `src/server/rules/attackUnlock.ts` (counts + `attackIsUnlocked`).
Do not grow `tokens.ts`, `commands/attack.ts`, or `MatchBoard.tsx` past the
module-budget freeze — extract instead.
