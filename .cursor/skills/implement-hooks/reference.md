# Reference — standing triggers

## Hosts

| Host | Where defined | When eligible |
|---|---|---|
| Equipment | `EquipmentRegion.abilities` | Attached, bearer alive |
| Creature passive | `CreatureDefinition.standingAbilities` | Creature alive |
| Continuous ritual | `RitualRegion.standingAbilities` | Zone `ritual`, orientation `ready` |

Shared type: `StandingTrigger` in `src/game/model/cards.ts` (equipment abilities
are that union; creatures/rituals reuse it).

## Hook inventory

| Type | Role | Notes |
|---|---|---|
| `attack-damage-bonus` | Static modifier | Not an event; read at attack declare |
| `on-deal-damage` | After bearer deals HP | Shield-only hits do not fire |
| `on-toxin-damage` | After toxin HP | Listeners on controller’s creatures’ gear |
| `on-roll-symbol` | Die shows symbol | Filter `rollingPlayer` |
| `on-absorb` | Symbol absorbed by a creature or ritual | Filter `absorberRelation` / `symbols` / `faceKinds`; absorber is instance id |
| `on-attack` | Attack declared | Filter `attackerRelation` / `attackKinds` |
| `on-take-damage` | Incoming damage | `reduceBy` mutates amount in `dealDamage`; optional `effects` after |
| `on-discard` | Cards discarded | Filter `discardingPlayer` |
| `on-change-position` | Creature position changed | Filter `creatureRelation`; only via `setCreaturePosition` |

## Proving cards (target wiring)

| Card | Hook + filter | Effect gap? |
|---|---|---|
| Twin Blades | `on-attack` self + basic | remove-shield on declared target |
| Alpha's Hide | `on-attack` self + special | “On another card” still soft |
| Insignia of Command | `on-attack` self + oncePerTurn | `reposition-creature` → choose-ally |
| Varcolac | `on-attack` ally-other | Creature-scoped next-attack bonus |
| Serrated Stinger | `on-attack` ally + special | apply-toxin on attack target |
| Black Plague | `on-roll-symbol` controller | Already wired |
| Corrupting Elder | `on-roll-symbol` opponent | choose-enemy damage |
| Archmage of the Runes | `on-attack` self + basic/special | draw / Energy+Arcane |
| Void Summoner | `on-attack` self + basic/special | generate Arcane / Energy+draw |
| Hunting Armour | `on-take-damage` reduceBy 1 oncePerTurn | Modifier path |
| Abyssal Sacrifice | `on-discard` controller | generate Darkness |
| Hunter's Collar | `on-change-position` self | generate Martial |
| Predator's Claws | `on-absorb` Wild | `reposition-creature` → source-creature |
| Mirrored Rune | `on-absorb` self | Need copy effect |
| Void Summoner | `on-absorb` any + Natural | Natural face filter |
| Garuda Dive | attack `followUpEffects` | `swap-positions` + `choose-allied-frontline` |
| War Minotaur Poisoned Charge | attack `followUpEffects` + conditional | back-row ally swap |

## Files

| Path | Role |
|---|---|
| `src/game/model/cards.ts` | `StandingTrigger` |
| `src/game/model/creatures.ts` | `standingAbilities`, `nextAttackBonus`, spent keys |
| `src/game/reducer/triggers.ts` | `fireOn*` |
| `src/game/reducer/triggers.test.ts` | Proving tests |
| `docs/specs/010-trigger-hooks.md` | Normative spec |
| `docs/DEFERRED_CATALOGUE.md` | Gaps |
