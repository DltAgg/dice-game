# 016 — Attribute pile-up resource system

Status: **IN PROGRESS** — track phases in
[`016-attribute-pile-up.STATUS.md`](./016-attribute-pile-up.STATUS.md).

Supersedes the Pokémon-style “absorb attributes onto creatures / rituals”
attack and Active-when model decided 2026-08-07 (see `OPEN_DESIGN.md`).

## Intent

Physical conversion was drowning in counters on individual cards. Attributes
become a **player-held pile** that persists across turns. Creatures still hold
Shield, Toxin, and similar creature tokens. Absorb means banking a rolled
attribute pip into that pile (or granting Shield onto a creature).

## Rules

1. **Attribute pile.** Each player has `attributePool: AttributeTokens`. Counts
   persist across turns until spent or removed by effects.
2. **Turn symbol pool.** Rolling creates `SymbolInstance`s. After on-roll
   effects resolve, **usable rolled attributes auto-bank** into the pile.
   Shield, locked/unusable pips, and effect-generated (`available`) symbols
   remain in the turn pool. Unbanked pool symbols expire at end of turn.
3. **Absorb (attribute).** During actions, the turn player may still absorb an
   unabsorbed **attribute** pip from the turn pool into **their** pile (mainly
   effect-generated leftovers). No creature target.
4. **Absorb (Shield).** Absorbing Shield still targets a **living owned
   creature** and grants Shield immediately. Absorbing Shield is not absorbing
   a Natural.
5. **On absorb (faces / standing).** Fires when an attribute pip is banked
   into the pile (including auto-bank from roll). Standing `on-absorb` filters
   stay; absorber relation is the banking player / their field as appropriate.
6. **`[Requires]`.** Still spends from the **unabsorbed turn pool**. A pip
   cannot both be absorbed into the pile and spent for Requires.
7. **Attacks.** `requires` is checked against the attacker’s owner’s
   `attributePool` (not spent). `discards` burns from that pile. Same-turn
   absorb **can** enable an attack (pile updates immediately — no EOT delay).
8. **Rituals.** No progress counters on the ritual card.
   - `activeWhen` (if any): the owner’s pile must meet the requirement for the
     ritual to be / become `ready`.
   - Optional `spend` on the ritual region: burned from the pile on
     `ACTIVATE_RITUAL` (in addition to any `additionalEnergy`).
   - Continuous standing abilities while `ready` do not spend `activeWhen` /
     `spend` unless the card activates.
9. **Pack feeding / creature-to-creature attribute tokens.** Superseded for the
   pile model; convert to pile move/copy or park in `DEFERRED_CATALOGUE` /
   STATUS Phase 6.
10. **Catalogue identity.** Card / creature / face `attribute` type-line tags
    are unchanged (deck building and forge matching).

Cite bible §§7, 17, 26, 31, 33 for fuel vs engine split; physical token budget
is the design driver for this supersession.

## State Changes

| Field | Change |
|---|---|
| `PlayerState.attributePool` | **Add** — persistent `AttributeTokens` |
| `CreatureState.attributeTokens` | **Remove** |
| `CardInstance.ritualProgress` | **Remove** |
| `CardInstance.ritualProgressCreditedThisTurn` | **Remove** |
| `RitualRegion.spend?` | **Add** — optional `SymbolRequirement` burned on activate |
| `GameState.symbols` | Unchanged turn pool |
| Creature `shields` / toxin / markers | Unchanged |

## Actions

| Action | New semantics |
|---|---|
| `ABSORB_SYMBOL` | Attribute → owner pile (no `creatureId` for attributes). Shield → requires `creatureId`. |
| `ABSORB_SYMBOL_TO_RITUAL` | **Remove** |
| `ACTIVATE_RITUAL` | Check pile vs `activeWhen`; burn `spend` if present; then existing chain |
| `ATTACK` | Fuel from owner `attributePool` |
| `END_TURN` | No creature attribute payout; pile persists; turn symbols expire |

## Validation

- Attribute absorb: actions phase, active player, unabsorbed usable attribute
  pip, no creature id required.
- Shield absorb: same plus living owned creature target.
- Attack: owner pile meets `requires`; on declare burn `discards` if any.
- Ritual ready: pile meets `activeWhen` (or no gate → ready on place).
- Ritual activate: orientation `ready`, pile still meets `activeWhen`, can pay
  `spend` + `additionalEnergy`.

## Resolution

1. Attribute absorb: mark symbol absorbed; `attributePool[attr] += 1`; queue
   face / overload / standing `on-absorb` (bank context).
2. Shield absorb: grant shield; queue triggers that apply.
3. Ritual orientation refresh whenever the pile changes (absorb, spend, effects).
4. Attack declare: check pool → burn discards → open attack chain as today.

## Networking

Host authority only; clients send intent-shaped actions. No new protocol kinds
beyond existing action names (ritual absorb action removed).

## Persistence

Loadouts / decks unchanged. Match state serialization must include
`attributePool` and drop removed fields.

## UI

- Show each seat’s attribute pile.
- Attribute absorb: select pip → bank (no creature click).
- Shield absorb: select pip → click creature.
- Rituals: no pip assignment; show Active-when / Spend from pile.
- Creature panels: no attribute token chips.

## Acceptance Criteria

- [x] No `attributeTokens` on creatures; attacks use `attributePool`
- [x] Absorbing Martial increases the player’s Martial pile immediately
- [x] Same-turn absorb can enable an attack that requires that attribute
- [x] Rituals ready/activate from pile; optional spend burns on activate
- [x] `ABSORB_SYMBOL_TO_RITUAL` gone; Shield still creature-targeted
- [x] Rulebook §§6–8, 10, 13 and KEYWORDS Absorb text match play
- [x] DoD: `npm run typecheck && npm test && npm run lint`
- [ ] STATUS phases ticked as content converts

## Tests

- [x] Bank absorb + pool increment + On absorb face fire
- [x] Attack requires / discards against pile
- [x] Ritual ready from pile + spend on activate
- [x] Shield absorb still grants on creature
- [x] Requires vs absorb mutual exclusion on turn pool
- [x] EOT: pile persists; unabsorbed symbols expire
