# 029 — Lane combat targeting

Status: **SHIPPED** (2026-09-12)

Creature **attacks** target by **column (lane)**, not “the frontline as a
whole protects the back.” Card and face effects that name creatures are
**not** attacks and still ignore this geometry unless print says otherwise.

Related: [`028-showing-face-combat.md`](./028-showing-face-combat.md)
(`[Unlock]` on declare), [`RULEBOOK.md`](../RULEBOOK.md) §3,
[`OPEN_DESIGN.md`](../OPEN_DESIGN.md) (DECIDED 2026-09-12 + ASSUMED swap /
Range). Bible §6’s frontline diagram is the board shape; attack facing is
this user decision.

No new print keyword. Breach is a targeting rule, like the old frontline
wall — do not mint `[Breach]`.

## Intent

The two non-legendaries occupy **stable columns 0 and 1**. They only attack
the enemy **in front of them**. The **legendary** may attack **either**
column. When a column has no living enemy frontliner, that column is a
**breach**: an attacker who can choose that column may attack the **enemy
legendary** even if the other enemy frontliner is still alive. Defeating a
creature does **not** compact lanes.

## Rules

User **DECIDED** 2026-09-12. Player wording is [`RULEBOOK.md`](../RULEBOOK.md)
§3.

1. **State.** `CreatureState.lane` is `0 | 1 | null`. `null` = not occupying
   a numbered frontline seat (legendary at setup / legendary in the back).
2. **Setup** (`buildCreatures`). First non-legendary in squad order →
   `lane: 0` + `frontline`; second → `lane: 1` + `frontline`; legendary →
   `lane: null` + `back`. Do not assign lanes by squad index for the
   legendary (same as today’s position rule).
3. **Who blocks a lane?** The living enemy with `position === "frontline"`
   and that `lane`. A defeated creature does **not** block, but **keeps**
   its `lane` so seats do not compact.
4. **Non-legendary, non-Range attack.** If a living enemy frontliner shares
   the attacker’s `lane`, that is the **only** legal attack target. If that
   lane has no living frontliner (**breach**), the attacker may target the
   **enemy legendary** only — still not the other lane’s frontliner.
5. **Legendary** (definition flag, not “is in the back”). May target
   **either** living enemy frontliner. May target the enemy legendary iff
   **at least one** enemy frontline lane is breached. Cannot snipe the
   legendary through two occupied lanes.
6. **Range** (`attack.range === true`). Ignores lane/breach — any living
   enemy is legal. No live catalogue attack is Range today. **ASSUMED** in
   OPEN_DESIGN (same privilege the flag used vs the old frontline wall).
7. **Friendly / defeated / unknown** stay `INVALID_TARGET` /
   `CREATURE_DEFEATED` / `UNKNOWN_ENTITY`.
8. **Not attacks.** `choose-enemy`, `enemy-all`, and other card/face
   creature selectors ignore lanes unless print says otherwise.
9. **Swap / `[Reposition]` (ASSUMED).** Non-legendaries keep `lane` for
   life. Entering frontline with `lane: null` takes the seat’s lane (swap
   partner, or first empty 0 then 1). Legendary leaving frontline →
   `lane: null`. A non-legendary with `lane: null` (swap onto the
   legendary’s unnumbered seat) has no facing column: they may target the
   enemy legendary only if at least one enemy frontline lane is empty;
   they may not pick a living enemy frontliner.

## State Changes

- `CreatureState.lane: 0 | 1 | null` (required on every instance).
- No new `GameState` bag. `swapCreaturePositions` / `setCreaturePosition`
  still move `position`; they also apply the ASSUMED lane seat trade.

## Actions

No new `GameAction`. `ATTACK` targeting legality changes.

## Validation

`targetingError` / `canTargetCreature` / `legalTargetsFor` use lane combat
(spec this document), not a whole-frontline wall. Split-damage pending with
`attackerId` set uses the same query (`legalSplitDamageTargets`). When
`attackerId` is null, any living creature remains legal.

## Resolution

Unchanged declare path (`commands/attack.ts`). Targeting is a query.

## Networking

Host authority unchanged. Clients still send `ATTACK` intents only. Host
rejects illegal lane targets with `INVALID_TARGET`.

## Persistence

None.

## UI

Do **not** reimplement lane math in React. Query `@server`:

- `legalTargetsFor(state, attackerId, attack)` — armed attack clicks
- `frontlineLaneSlots(state, playerId): readonly [CreatureState | null, CreatureState | null]`
  — living occupant of column 0 and column 1, else `null`
- `legalSplitDamageTargets(state, pending)` — replace the client copy in
  `legalChoices.ts`
- Optional: `backRowCreatures(state, playerId)` — living `position === "back"`

MatchBoard / Battlefield must render two **fixed** frontline seats from
`frontlineLaneSlots` (empty cell if `null`). Do **not** `justify-center`
only living creatures. Do not pack left when a seat is empty.

## Acceptance Criteria

- [x] Setup `[BODY_A, BODY_B, LEGEND]` → lanes `0, 1, null`
- [x] Legendary-first squad still places legendary `back` + `null`, bodies `0` then `1`
- [x] Lane 0 frontliner cannot attack the enemy lane 1 frontliner
- [x] Legendary can attack either enemy frontliner
- [x] Legendary cannot attack the enemy legendary while both lanes are occupied
- [x] Same-lane breach opens the enemy legendary; the other-lane frontliner still cannot
- [x] Both frontliners defeated → melee can hit the legendary
- [x] Defeating lane 0 does not move lane 1’s `lane` to 0
- [x] Range may hit the legendary through occupied lanes
- [x] `enemy-all` / `choose-enemy` still ignore lanes
- [x] `docs/RULEBOOK.md` §3 rewritten
- [x] Split-damage legality lives in `@server` (`legalSplitDamageTargets`)

## Tests

- [x] `src/server/setup/createMatch.test.ts` — setup lanes
- [x] `src/server/rules/targeting.test.ts` — matrix, Range, slots, split, swap seats
- [x] `src/server/reducer/combat.test.ts` — declare path, cross-lane refuse, breach
- [x] `src/server/reducer/allTargets.test.ts` — `enemy-all` still hits back

## File budget

New `src/server/rules/lanes.ts` (geometry queries) and
`src/server/reducer/creaturePositions.ts` (`setCreaturePosition` /
`swapCreaturePositions` extracted from frozen `zones.ts`). Do not grow
`resolution.ts` or frozen `zones.ts` / `resolvers.ts`.
