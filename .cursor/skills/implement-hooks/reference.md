# Reference — standing triggers

## Hosts

| Host | Where defined | When eligible |
|---|---|---|
| Equipment | `EquipmentRegion.abilities` | Attached, bearer alive |
| Creature passive | `CreatureDefinition.standingAbilities` | Creature alive |
| Continuous ritual | `RitualRegion.standingAbilities` | Zone `ritual`, orientation `ready` |

Shared type: `StandingTrigger` in `src/server/model/cards.ts` (equipment abilities
are that union; creatures/rituals reuse it).

## Hook inventory

| Type | Role | Notes |
|---|---|---|
| `attack-damage-bonus` | Static modifier | Not an event; read at attack declare |
| `on-deal-damage` | After bearer deals HP | Shield-only hits do not fire |
| `on-toxin-damage` | After toxin HP | Listeners on controller’s creatures’ gear |
| `on-roll-symbol` | Die shows symbol | Filter `rollingPlayer` |
| `on-absorb` | Attribute banked into pile (`player` absorber) or Shield onto creature (`creature` absorber) | Filter `absorberRelation` / `symbols` / `faceKinds`; see `attribute-pile.md` |
| `on-attack` | Attack declared | Filter `attackerRelation` / `attackKinds` |
| `on-take-damage` | Incoming damage | `[Reduce N]` / `reduceBy` mutates amount in `dealDamage`; optional `effects` after |
| `on-discard` | Cards discarded | Filter `discardingPlayer` |
| `on-change-position` | Creature position changed | Filter `creatureRelation`; only via `setCreaturePosition` |
| `on-turn-start` | Incoming player's turn begins | Filter `whoseTurn`; after toxin ticks; auto-target only |

## Proving cards (target wiring)

| Card | Hook + filter | Effect gap? |
|---|---|---|
| Twin Blades | `on-attack` self + basic | remove-shield on declared target |
| Alpha's Hide | `on-attack` self + special | “On another card” still soft |
| Insignia of Command | `on-attack` self + oncePerTurn | `reposition-creature` → choose-ally |
| Varcolac | `on-attack` ally-other; special → Frenzy | `grant-extra-attack` on source-creature |
| Serrated Stinger | `on-attack` ally + special | apply-toxin on attack target |
| Black Plague | `on-roll-symbol` controller | Already wired |
| Corrupting Elder | `on-roll-symbol` opponent | choose-enemy damage |
| Archmage of the Runes | `on-attack` self + basic/special | draw / generate Arcane |
| Void Summoner | `on-attack` self + basic/special | generate Arcane / draw |
| Hunting Armour / Prism Mantle | `on-take-damage` `[Reduce 1]` oncePerTurn | Modifier path |
| Abyssal Sacrifice | `on-discard` controller | generate Darkness |
| Hunter's Collar | `on-absorb` Wild + `ally` | generate Martial |
| Slow Burn | `on-turn-start` opponent | apply-toxin most-damaged-enemy |
| Smolder | `on-turn-start` opponent | damage most-damaged-enemy |
| Cinder Hex | `on-turn-start` controller (bearer) | damage source-creature |
| Fester | `on-toxin-damage` damagedOwner opponent | apply-toxin declared-target |
| Predator's Claws | `on-absorb` Martial + `ally` | `reposition-creature` → choose-ally |
| Mirrored Rune | `on-absorb` Arcane + `ally` | copy / generate (pile-safe) |
| Void Summoner | `on-absorb` any + Natural | Natural face filter (not untyped Shield) |
| Lens Choir | `on-absorb` Luminar + `ally` + oncePerTurn | Generate Luminar; no self-loop |
| Garuda Dive | attack Range 2 damage | Wild-legal; swap lives on War Charge (Martial) |
| War Minotaur War Charge | attack `followUpEffects` + conditional | back-row ally swap |

## Files

| Path | Role |
|---|---|
| `src/server/model/cards.ts` | `StandingTrigger` |
| `src/server/model/creatures.ts` | `standingAbilities`, `nextAttackBonus`, spent keys |
| `src/server/reducer/triggers.ts` | `fireOn*` |
| `src/server/reducer/triggers.test.ts` | Proving tests |
| `docs/specs/010-trigger-hooks.md` | Normative spec |
| `docs/DEFERRED_CATALOGUE.md` | Gaps |
