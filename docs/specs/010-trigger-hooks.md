# 010 — Standing trigger hooks (shared events + catalogue filters)

Status: **IMPLEMENTED** (Phase B + shared-event extensions)

Shared engine hooks so catalogue equipment, creature passives, continuous
rituals, overloads, and faces fire standing triggers without one-off reducer
branches.

**Design principle:** one system event → rich context ids → relation filters on
ability data. Do **not** add coupled types such as `on-ally-attack` or
`on-opponent-roll-symbol`. See `.cursor/skills/implement-hooks/SKILL.md`.

Design cites: bible §7 (absorb), §14 (roll / onRoll), equipment & overload
regions in `OPEN_DESIGN`; deferred catalogue §1 / §5.

## Intent

When the game performs a natural rules event (attack declared, HP damage,
die shows a symbol, symbol absorbed, discard, position change), eligible hosts
may queue data-driven effects. Print clauses stay as catalogue data; the
reducer only knows the hook kinds and passes instance ids for filtering.

## Hosts

| Host | Eligible when |
|---|---|
| Equipment abilities | Attached; bearer alive |
| Creature `standingAbilities` | Creature alive |
| Continuous ritual `standingAbilities` | Zone `ritual`, orientation `ready` |
| Face / overload `onRoll` / `onAbsorb` | Showing face rolled / absorbed |

## Rules

1. **On-deal-damage (equipment).** After a creature **deals HP damage**, fire
   each `on-deal-damage` on that creature's gear. `sourceCreatureId` = bearer;
   `declaredTargetCreatureId` = damaged creature.
2. **On-toxin-damage (equipment).** Toxin tick HP → gear on controller's
   creatures; bearer is source.
3. **On-roll-symbol.** During `ROLL_DICE`, for each showing symbol `S`, fire
   matching `on-roll-symbol` abilities whose `rollingPlayer` filter matches
   (`controller` = **bearer's** owner for equipment, creature owner for
   passives, ritual owner for rituals; `opponent` / `any` likewise). Default
   `controller`.
4. **On-absorb.** When a creature absorbs symbol `S`, fire `on-absorb`
   abilities whose `absorberRelation` matches (`self` default, `ally`,
   `ally-other`, `any`) and optional `symbols` filter. Face/overload
   `onAbsorb` still fire for the showing face (`sourceCreatureId` = absorber).
5. **On-attack.** When an attack is declared (costs paid, link pushed), fire
   `on-attack` abilities whose `attackerRelation` / `attackKinds` /
   `oncePerTurn` match. Context: attacker id + owner, kind, target id.
   `declared-target` in effects = attack target.
6. **On-take-damage.** Inside `dealDamage`, before prevent/Shields, apply
   `reduceBy` from host gear/passives (`oncePerTurn` supported). Optional
   `effects` queue after HP is dealt.
7. **On-discard.** After one or more hand cards are discarded, fire
   `on-discard` with `discardingPlayer` filter (default `controller`).
8. **On-change-position.** When a creature's position changes (shared mover
   must call this), fire `on-change-position` with `creatureRelation` filter.
9. **Order.** Hooks push onto the resolution stack (reverse push). Call sites
   `drainResolution` so choices pause correctly.
10. **No new player actions.** Hooks are system-side only.

## Relation filters

| Enum | Meaning |
|---|---|
| `self` | Subject instance id === host creature id |
| `ally` | Same owner (includes self) |
| `ally-other` | Same owner, different instance id (two Varcolacs buff each other) |
| `any` | No creature/owner restriction |
| `controller` / `opponent` / `any` | Player relation vs filter owner (bearer owner for gear) |

## State Changes

- `StandingTrigger` union on equipment / creature / continuous ritual.
- `CreatureState.nextAttackBonus`, `spentOncePerTurnTriggers`.
- Effect `grant-next-attack-bonus` (creature-scoped).
- Face `onAbsorb` / overload `onAbsorb` unchanged.

## Acceptance Criteria

- [x] Prior Phase B cards (Fangs, Blade, Plague, Heart, Carapace, Grimoire,
  Spores, Echo) still pass.
- [x] Face absorb/roll partial wiring still passes.
- [x] Varcolac: ally-other attack → `nextAttackBonus` on Varcolac.
- [x] Hunting Armour: first incoming damage −1 once per turn.
- [x] Abyssal Sacrifice: discard → generate Darkness while ready.
- [x] Black Plague uses explicit `rollingPlayer: "controller"` (bearer owner).
- [x] Corrupting Elder / Serrated Stinger wired in catalogue (opponent roll /
  ally special → toxin).
- [x] Toxic Blessing: roll → `arm-attack-toxin`; attacks apply toxin.
- [x] Hunter's Collar: position change → Martial.
- [x] Void Summoner: any Natural absorb → generate Arcane.
- [x] War Axe: Basic-only `attack-damage-bonus` via `attackKinds`.
- [x] Foundry: ready continuous ritual, controller absorb Mechanical → Energy.

## Tests

- [x] `src/game/reducer/triggers.test.ts`
