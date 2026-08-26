# 013 — Face markers, suppress, lock, Instinct absorb

Status: **IMPLEMENTED** (2026-08-14)

Face-marker / suppress-inherent / resource-lock / unusable-symbol vocabulary
plus Instinct’s optional actions-window basic attack. Assumptions live in
[`OPEN_DESIGN.md`](../OPEN_DESIGN.md) (ASSUMED, face-marker block). Proving
faces: Adaptive Toxin, Stain, Infection (roll), Decay, Catalyst, Overcharge,
Instinct (absorb).

Push stays unwired. Stun stays `DEFERRED`.

## Intent

Printed On roll / On absorb clauses that need physical-slot markers, skip-next
inherent, pool usability, or an immediate optional basic after absorb resolve
as data — no card-id special cases in the reducer.

## Rules

### Corruption markers (per physical slot)

- Stored on `DieSlot.corruptionMarkers`.
- A slot with ≥1 marker is a **Corrupted face**.
- Stain On roll: choose an opposing **synthetic** slot; add 1 marker.
- Infection On roll: if the opponent has a Corrupted slot, choose it, then
  choose another slot on the **same die**; add 1 marker there.
- Markers persist until the face is stripped (Decay absorb / `ACTIVATE_FACE`).

### Suppress inherent until next roll

- `DieSlot.suppressInherentNextRoll`.
- Decay On roll / Overcharge (if Energy taken): set on the chosen / source slot.
- On the controller’s next `ROLL_DICE`, every suppress flag on rolled dice is
  cleared; if the **showing** slot had the flag, that face’s `onRoll` is skipped
  (overloads still fire).

### Resource lock

- `DieSlot.resourceLockedThisTurn` (cleared `END_TURN`).
- Stain absorb: choose an opposing Corrupted slot; lock it.
- If that slot is currently showing, its rolled/available symbol is marked
  `usable: false`.
- Unusable symbols cannot pay `[Requires]` / ritual Active-when or be absorbed.

### Unusable Corruption symbol (Decay absorb)

- Strip the chosen Corrupted face to natural Shield (face returns to owner’s
  pool when orphaned; overloads clear when last copy leaves).
- Create 1 Corruption symbol in the **Decay controller’s** pool with
  `usable: false`.

### Toxin receive cap (Adaptive Toxin)

- `CreatureState.toxinReceiveCapRemaining` — while set, `apply-toxin` grants at
  most that many markers total across applications, then reaches 0.
- Cleared at the start of that creature’s **owner’s** turn (before toxin tick).

### Catalyst

- On roll: choose a synthetic-in-pool symbol → arm `requirementWildcardsThisTurn`
  from that symbol type.
- On absorb: choose a synthetic face that appeared this `ROLL_DICE`
  (`facesAppearedThisRoll`) → re-queue that face’s `onRoll` only.

### Overcharge

- On roll: optional gain Energy; if accepted, suppress inherent next roll on
  the source slot.
- On absorb: arm `resolveNextFaceEffectTwice` for the controller — the next
  effect with `sourceDieId` set is pushed twice then the flag clears.

### Instinct On absorb

- If the absorbing creature has `attacksUsedThisCombat === 0`, open
  `optional-bonus-attack`.
- Player may decline, or declare that creature’s **basic** attack (fuel /
  range legality as normal) during **actions**.
- Declaring increments `attacksUsedThisCombat` and opens the usual attack
  reaction window.

## State Changes

| Field | Role |
|---|---|
| `DieSlot.corruptionMarkers` | Stain / Infection |
| `DieSlot.suppressInherentNextRoll` | Decay / Overcharge |
| `DieSlot.resourceLockedThisTurn` | Stain absorb |
| `SymbolInstance.usable` | Unusable / locked pool symbols |
| `CreatureState.toxinReceiveCapRemaining` | Adaptive Toxin |
| `GameState.facesAppearedThisRoll` | Catalyst absorb |
| `GameState.resolveNextFaceEffectTwice` | Overcharge absorb |

## Actions

| Action | Pending |
|---|---|
| `RESOLVE_CHOOSE_DIE_SLOT` | `choose-die-slot` (`dieId`/`slotIndex` null = decline if optional) |
| `RESOLVE_CHOOSE_POOL_SYMBOL` | `choose-pool-symbol` |
| `RESOLVE_OPTIONAL_OVERCHARGE` | `optional-overcharge` |
| `RESOLVE_OPTIONAL_BONUS_ATTACK` | `optional-bonus-attack` |

## Validation

- Slot choices must match `DieSlotChoiceFilter` (+ Infection `same-die-other-slot` context).
- Adaptive Toxin absorb: `remove-toxin-deal-damage` with `amount: 3` (no count pending).
- Bonus attack: basic only, same creature, not yet attacked, fuelled, legal target.
- Unusable symbols rejected by absorb / `usableSymbols` / `planConsumption`.

## Resolution

New `EffectDefinition` members in `effects.ts`; handlers in `resolution.ts`;
pending completes in `reduce.ts`. `applyToxin` clamps against the receive cap.
`ROLL_DICE` records `facesAppearedThisRoll` and consumes suppress flags.

## Networking

Host-only `reduce()`. New actions are JSON intents; no protocol change beyond
the action union.

## Persistence

None.

## UI

Match-ui must render (hotseat + online), **in addition to `012` pendings**:

| Pending | Player sees / does |
|---|---|
| `choose-die-slot` | Pick a legal die face/slot (Corruption target, Natural suppress, Corrupted lock/strip, Catalyst copy, Infection spread). Show Decline when `optional`. |
| `choose-pool-symbol` | Pick an eligible synthetic pool symbol (Catalyst wildcard). |
| `optional-overcharge` | Accept (+1 Energy, Overcharge face) or decline. |
| `optional-bonus-attack` | During actions: Decline, or declare the named creature’s **basic** attack (pick target). |

Also surface Corruption markers / suppress / resource-lock on die faces, and
unusable pool symbols as non-spendable.

## Acceptance Criteria

- [x] Adaptive Toxin cap + strip→damage
- [x] Stain marker + lock
- [x] Infection roll spread
- [x] Decay suppress + strip→unusable Corruption
- [x] Catalyst wildcard + copy appeared synthetic onRoll
- [x] Overcharge optional Energy / suppress / double next face effect
- [x] Instinct optional actions-window basic
- [x] No push; stun untouched

## Tests

- [x] `src/game/reducer/faceMarkers.test.ts`
