# 025 — Face roll physics

Status: **IMPLEMENTED** (2026-09-04)

Inherent extra pips, `[Convert roll]`, While showing stances, and dice-geometry
On-roll conditions. On absorb on faces is retired as a design axis (auto-bank
made it fire with On roll). `[Generate]` on tactics is unchanged.

Related: [`RULEBOOK.md`](../RULEBOOK.md) §§5–7, §11;
[`KEYWORDS.md`](../KEYWORDS.md); [`016-attribute-pile-up.md`](./016-attribute-pile-up.md);
[`021-overcharge.md`](./021-overcharge.md); [`004-face-cards.md`](./004-face-cards.md).

Named specials (Tempo Mechanical + Luminar, Control Arcane + Darkness) all use
this physics. Catalogue tables: [`004-face-cards.md`](./004-face-cards.md).

## Intent

Named specials pay for forge + 1/6 (or 2/6) odds by producing **more than 1 pip
by themselves**. Convert trades that whole die’s roll (including Overcharge and
forge yield) for a stronger On-roll payoff. While showing is a stance, not a
second On-roll trigger. Geometry is a condition on the controller’s dice.

## Rules

Bible is silent on these axes. User **DECIDED** 2026-09-04. Player wording is
[`RULEBOOK.md`](../RULEBOOK.md) and [`KEYWORDS.md`](../KEYWORDS.md).

1. **Inherent pips.** After `ROLL_DICE`, `[Reroll]`, or retain-keep, a showing
   face produces `inherentPipsOf(face)` — `face.pips`, or `{ [face.symbol]: 1 }`
   when omitted — as rolled symbols with `sourceDieId` set. Dual-pip is two
   keys on that same map (`{ mechanical: 1, luminar: 1 }`), not a second field.
   Not a `generate-symbol` opcode; they bank via `bankRolledSymbols` after On
   roll (unless convert). Forge yield and Overcharge still apply **on top**
   via today’s helpers.
2. **Shield / untyped.** Still 1 Shield pip (omit `pips`, or `{ shield: N }`).
   Attribute keys on Shield `pips` are illegal.
3. **Silence.** Extra inherent pips still generate (silenced faces still
   generate pips). On roll / overloads / yield / Overcharge stay skipped.
4. **Stamp.** `[Stamp]` / `refireShownFaceRollEffects` does **not** mint a
   second copy of inherent `pips`. Yield / Overcharge generate still apply
   unless convert skips them.
5. **`[Convert roll]`** (`convertRoll: true`). When the slot is not silenced
   (so the payoff can fire): do **not** bank any attribute pips **this die**
   produced this roll (inherent pips, forge yield, Overcharge).
   Skip `applyForgeYieldGenerate` / `applyOverchargeGenerate` for that die
   (those use `createSymbol` and would auto-bank). Fire `onRoll` as the
   payoff. Not optional, not a prompt. The **other** die banks normally.
   Convert faces are attribute specials (no Shield leftover). `[Reroll]`
   applies convert to the **new** roll of that die only. Stamp on a converting
   face: skip yield/Overcharge generate; re-fire the convert `onRoll`.
6. **While showing.** Continuous query from currently showing faces
   (`rolledSlotIndex`). Not a `StandingTrigger`. Holder voice: modifiers apply
   to the **die owner**. Two copies stack. Silenced slots skip.
   - `pierce` → `attackIgnoreShieldAmount`
   - `empower` → attack damage bonus (every attack while showing, not
     `nextAttackBonus` consume-once)
   - `play-discount` / `forge-discount` → discount queries (stack with
     this-turn arms; stance is not consumed)
   - `reduce` → incoming hits to the controller’s living creatures, before
     Prevent/Shield, same math as `[Reduce N]`
   Persists until the die shows something else. Retain keeps it. Opponent’s
   turn: Reduce still applies; Pierce / Empower / Discount simply do nothing
   useful on their turn.
7. **Dice geometry** (`ConditionExpr`). Evaluated with controller + source die
   from `pushEffect(..., dieId, slotIndex)`. Both dice are rolled (pips
   created, showing slots known) **before** On roll fires.
   - `other-die-same-attribute` — the other die has a known showing face whose
     `symbol` equals this face’s attribute. Unrolled other die → false.
   - `this-die-attribute-count` + `atLeast` — count slots on **this** die
     whose face `symbol` equals this face’s attribute.
   - `both-showing-synthetic` — both showing faces have `kind === "synthetic"`.
   Legacy `has-other-symbol` stays (pool / appeared). Do not reuse it for
   geometry.
8. **Opening cap.** A face counts toward `startingMaxOnRollFacesPerDie` if it
   has non-empty `onRoll`, `convertRoll`, or non-empty `whileShowing`. Extra
   pips alone do not count. Opening basics are **only** `BASIC_FACE_CARDS`
   (eight identity naturals + Shield). Named naturals consume the face deck.

## State Changes

No new `GameState` bags. Rolled pips remain `SymbolInstance`s with
`sourceDieId`. Convert forfeits those instances (`consumed`) instead of
banking them. While showing is derived from `DieState.rolledSlotIndex` +
catalogue `whileShowing`.

## Actions

None. Existing `ROLL_DICE`, `RESOLVE_OPTIONAL_REROLL`, `[Stamp]`
(`reapply-die-modifiers`).

## Validation

Catalogue: `pips` is a `SymbolTokens` map (same bag as pile tokens, plus
Shield). Omitted = one pip of `face.symbol`. Attribute faces may not put
`shield` in the map; untyped may only put `shield`. `convertRoll` not true
on untyped; `whileShowing` is a closed modifier union.

## Resolution

Helpers in `shownFace.ts`, `commands/rollPips.ts`, `rollBank.ts`,
`rules/whileShowing.ts`, `reducer/conditions.ts`. Call sites:
`rollDice.ts`, `reroll.ts`, `refireShownFaceRollEffects`. Do not grow
`resolution.ts` / `triggers.ts`.

## Networking

No new `GameAction`. Host already forwards existing intents.

## Persistence

None.

## UI

**match-ui** (not this slice):

- Surface **While showing** modifiers on showing dice (pierce / empower /
  discount / reduce totals for the die owner).
- A **convert cue** when the showing face has `[Convert roll]` (pips from
  that die this roll are not banked).
- Do not show On-absorb as a live face axis on these proving faces.

## Acceptance Criteria

- [x] Identity natural still banks 1 pip.
- [x] Cogtooth showing banks 2 Mechanical with no `generate-symbol` opcode.
- [x] Dawnwright banks 1 Mechanical + 1 Luminar from the same die.
- [x] Convert Sigil Flare: pile does not gain Arcane from showing / extra /
      yield / Overcharge; Strike 2 still queues; other die still banks.
- [x] Halo Lamp while showing: attack pierce 1; gone after the die shows
      something else.
- [x] Cogtooth while showing: next synthetic forge cheaper by 1.
- [x] Gear Train: other die same attribute → Double armed.
- [x] Stamp does not double inherent pips.
- [x] Opening cap counts whileShowing / convertRoll; Dawnwright is not an
      opening basic.
- [x] Silence: converting payoff does not fire; pips still generate.

## Tests

- [x] `src/server/reducer/faceRollPhysics.test.ts`
- [x] Geometry unit tests on `evaluateCondition`
- [x] Loadout / schema tests for opening basics, Shield attribute-pips reject
