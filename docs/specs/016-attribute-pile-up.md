# 016 — Attribute pile-up resource system

Status: **IMPLEMENTED** · checklist
[`016-attribute-pile-up.STATUS.md`](./016-attribute-pile-up.STATUS.md).

## Intent

Attributes live in a **player-held pile** that persists across turns. Creatures
hold Shield, Toxin, and similar **creature markers**. Absorb means banking a
rolled attribute pip into the pile (or granting Shield onto a creature).

## Rules

1. **Attribute pile.** Each player has `attributePool: AttributeTokens`. Counts
   persist across turns until spent or removed by effects.
2. **Turn symbol pool.** Rolling creates `SymbolInstance`s. After on-roll
   effects resolve, **usable rolled attributes auto-bank** into the pile.
   Effect `createSymbol` for usable attributes also auto-banks immediately.
   Shield, locked/unusable pips remain in the turn pool. Unbanked pool
   symbols expire at end of turn.
3. **Absorb (attribute).** Manual absorb remains for any rare leftover
   unabsorbed attribute pip. No creature target.
4. **Absorb (Shield).** Absorbing Shield still targets a **living owned
   creature** and grants Shield immediately. Absorbing Shield is not absorbing
   a Natural.
5. **On absorb (faces / standing).** Fires when an attribute pip is banked
   into the pile (roll auto-bank, effect auto-bank, or manual). Standing
   `on-absorb` filters stay; absorber relation is the banking player / their
   field as appropriate.
6. **`[Requires]` / `[Spend]`.** `[Requires: …]` is a pile **gate** (must hold,
   not spent) — attack `requires` **and** card `effect.requires`. `[Spend: …]`
   **burns** from the pile (header `playCost`, ritual activate `spend`, attack
   `discards`). Either clause may include **`any`** generic pips (`{ any: 2 }`
   or `{ arcane: 1, any: 2 }`): a count of leftover pile tokens of any attribute
   after named pips are reserved. `any` is not stored on `attributePool` and is
   not a ninth attribute. Wildcards may cover shortfall. `[Discount]` reduces
   header Spend only, never a Requires gate, and reduces `any` before named
   attributes. Forge does not check `effect.requires`.
7. **Attacks.** `requires` is checked against the attacker's owner's
   `attributePool` (not spent). `discards` is checked and burned. **Both may
   apply** on one attack. Same-turn absorb **can** enable an attack
   (pile updates immediately).
8. **Rituals.** No progress counters on the ritual card.
   - `activeWhen` (if any): the owner's pile must meet the requirement **once**
     for the ritual to become `ready` (one-time unlock; does not drop back to
     `preparing` when the pile changes unless an effect says so).
   - Optional `spend` on the ritual region: burned from the pile on
     `ACTIVATE_RITUAL`.
   - Continuous standing abilities while `ready` do not spend `activeWhen` /
     `spend` unless the card activates.
9. **Catalogue identity.** Card / creature / face `attribute` type-line tags
   are unchanged (deck building and forge matching).

## State

| Field | Role |
|---|---|
| `PlayerState.attributePool` | Persistent `AttributeTokens` |
| `RitualRegion.spend?` | Optional `SymbolRequirement` burned on activate |
| `GameState.symbols` | Turn pool |
| Creature `shields` / toxin / markers | On creatures |

## Actions

| Action | Semantics |
|---|---|
| `ABSORB_SYMBOL` | Attribute → owner pile. Shield → requires `creatureId`. |
| `ACTIVATE_RITUAL` | Orientation `ready`; burn `spend` if present |
| `ATTACK` | Fuel from owner `attributePool` |
| `END_TURN` | Pile persists; turn symbols expire |

## Validation

- Attribute absorb: actions phase, active player, unabsorbed usable attribute
  pip, no creature id required.
- Shield absorb: same plus living owned creature target.
- Attack: owner pile meets `requires` (gate) and `discards` (Spend) when printed.
- Play: pile meets `effect.requires` (gate) and discounted header `playCost`
  (Spend) against the **same** pile (not additive). Forge ignores `effect.requires`.
- Ritual ready: pile meets `activeWhen` once (or no gate → ready on place).
- Ritual activate: orientation `ready`; can pay `spend` when printed.

## Resolution

1. Attribute absorb: mark symbol absorbed; `attributePool[attr] += 1`; queue
   face / overload / standing `on-absorb` (bank context).
2. Shield absorb: grant shield; queue triggers that apply.
3. Ritual orientation refresh on pile change: `preparing` → `ready` when Active-when is met (one-time unlock).
4. Attack declare: check gate and Spend → burn discards if printed → open
   attack chain as today.

## UI

- Show each seat's attribute pile.
- Attribute absorb: select pip → bank (no creature click).
- Shield absorb: select pip → click creature.
- Rituals: show Active-when / Spend from pile.

## Acceptance Criteria

- [x] Attacks use `attributePool`
- [x] Absorbing Martial increases the player's Martial pile immediately
- [x] Same-turn absorb can enable an attack that requires that attribute
- [x] Rituals ready/activate from pile; optional spend burns on activate
- [x] Shield absorb still creature-targeted
- [x] Rulebook §§6–8, 10, 13 and KEYWORDS Absorb text match play
- [x] DoD: `npm run typecheck && npm test && npm run lint`

## Tests

- [x] Bank absorb + pool increment + On absorb face fire
- [x] Attack requires / discards against pile
- [x] Ritual Active-when / spend
- [x] `attributePileUp.test.ts` and related reducer suites
