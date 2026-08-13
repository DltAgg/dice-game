# 010 — Standing trigger hooks (on-damage, on-roll gear, on-absorb)

Status: **IMPLEMENTED**

Shared engine hooks so deferred catalogue equipment / overloads / faces can
fire standing triggers without one-off reducer branches. Unlocks Venomous Fangs,
Blade of Serene Light, Black Plague, Toxic Heart, Wild Carapace, Archmage's
Grimoire, Mutant Spores, Wild Echo (and later face On-absorb lines).

Design cites: bible §7 (absorb), §14 (roll / onRoll), equipment & overload
regions in `OPEN_DESIGN`; deferred catalogue §1 / §5 Phase B.

## Intent

When the game performs a natural rules event (HP damage dealt, die shows a
symbol, symbol absorbed), attached gear and overloaded faces may queue
data-driven effects. Print clauses stay as catalogue data; the reducer only
knows the hook kinds.

## Rules

1. **On-deal-damage (equipment).** After a creature **deals HP damage** (the
   `damage-dealt` path — buffer/Shield fully consuming the hit does **not**
   count), fire each `on-deal-damage` ability on equipment attached to the
   **source** creature. Effects resolve on the resolution stack with
   `sourceCreatureId` = bearer and `declaredTargetCreatureId` = the creature
   that took that HP damage (so toxin can target `declared-target`).
2. **On-toxin-damage (equipment).** When a toxin tick deals HP damage to a
   creature, fire each `on-toxin-damage` ability on equipment attached to
   creatures owned by that creature's controller. Effects use the bearer as
   `sourceCreatureId` (Toxic Heart heals the equipped creature).
3. **On-roll-symbol (equipment).** During `ROLL_DICE`, for each die that shows
   a face producing symbol `S`, fire each `on-roll-symbol` ability with
   `symbol: S` on equipment attached to creatures owned by the rolling player.
   Once per such die × matching ability (Black Plague: Corruption → 1 damage
   to the equipped host).
4. **On-absorb (equipment).** When a creature absorbs a symbol of type `S`,
   fire each `on-absorb` ability on that creature's equipment whose optional
   `symbols` filter is empty or includes `S`.
5. **On-absorb (overload / face).** When a symbol is absorbed from a die
   showing face card `F`, fire that face's `onAbsorb` effects (controller =
   absorbing player), then each overload on `F` whose `onAbsorb` is non-empty.
6. **Order.** Hooks push effects onto the existing resolution stack (reverse
   push so listed order resolves first-to-last). Absorb / toxin paths
   `drainResolution` after queueing so choices (discard, choose-creature) pause
   correctly.
7. **No new player actions.** Hooks are system-side only.

## State Changes

No new top-level `GameState` fields. Catalogue shapes grow:

- `EquipmentAbility` gains `on-deal-damage` | `on-toxin-damage` |
  `on-roll-symbol` | `on-absorb`.
- `OverloadRegion.onAbsorb` (optional effects).
- `FaceCardDefinition.onAbsorb` (effects; empty until a face is wired).

## Actions

None.

## Validation

N/A (automatic).

## Resolution

See Rules. Damage amount for on-deal-damage / on-toxin-damage is HP after
prevention and Shields (`dealDamage` return value).

## Networking

Host authority unchanged; clients never run hooks locally.

## Persistence

None.

## UI

No dedicated UI. Choose-creature / discard prompts from triggered effects use
existing pending-decision surfaces.

## Acceptance Criteria

- [x] Venomous Fangs: attack HP damage → 1 toxin on the damaged creature.
- [x] Blade of Serene Light: attack HP damage → choose ally heal 1.
- [x] Black Plague: host's controller rolls Corruption → host takes 1 damage.
- [x] Toxic Heart: toxin tick HP damage → heal 1 on the Heart bearer.
- [x] Wild Carapace: absorb Wild → heal 1 on the absorber.
- [x] Archmage's Grimoire: absorb Arcane/Darkness → draw 1, discard 1.
- [x] Mutant Spores / Wild Echo: onAbsorb heal / generate Wild.
- [x] Shield-only or fully prevented hits do not fire on-deal-damage.
- [x] Face `onAbsorb` infrastructure present (may stay empty on print-only faces).

## Tests

- [x] `src/game/reducer/triggers.test.ts` — each wired card above.
- [x] Existing equipment attach tests still pass (Fangs/Plague no longer “deferred”).
