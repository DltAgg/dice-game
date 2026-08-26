# 011 — Drain, token strip & ritual destroy

Status: **IMPLEMENTED**

Control interaction vocabulary for Siphon Sigil and Dispel Circle. Negate-ritual
lives in `008` (Seal the Rite). Design cites: bible §20 (deny fuel),
§25 (resource denial before creature destruction); `OPEN_DESIGN.md` fuel-cap
row (drain **DECIDED**; cap remains **OPEN**). Equipment destroy choice for
Calculated Sacrifice / Hexbrand absorb lives here as the same “name the
attached piece” pattern.

Attribute tokens live on the **player pile**. `[Drain N]` takes from the
opponent’s pile into yours. `[Strip]` is only for creature/face tokens
(Shield, Toxin, Pestilence, Corruption).

## Intent

Effects can deny opposing fuel (attribute tokens) by **draining** them into
the controller’s pile, and remove opposing field rituals without creature
destruction. When more than one legal drain / destroy pick exists, the
controller names it — the engine does not silently take `ATTRIBUTES` order
or earliest instance id.

## Rules

1. **`drain-attribute-tokens`.** Choose an enemy creature (`choose-enemy`;
   targeting context). Then take up to `amount` tokens from **that
   creature’s controller’s attribute pile** into **your** pile:
   - **Mix + leftovers:** if the pile holds more than `amount` tokens and
     they sit in two or more attributes, open `choose-attribute-tokens`
     (`mode: "drain"`). The controller names a `SymbolRequirement` totaling
     exactly `amount` that is a subset of the pile.
   - **No real choice:** fewer tokens than `amount` (take all remaining), a
     single attribute pile, or zero tokens (legal whiff). Homogeneous leftover
     piles use `discardTokensInAttributeOrder` (equivalent to taking from that
     only pile).
   Add the taken tokens to the controller’s `attributePool`. Refresh ritual
   orientations for **both** seats. Emit `attribute-tokens-drained` with
   `fromPlayerId` / `toPlayerId` / `drained`.
2. **No token cap** in this slice — per-player / per-attribute caps stay
   `OPEN` in `OPEN_DESIGN.md`.
3. **`destroy-ritual`.** Choose one opposing card in `zone === "ritual"`
   (preparing, ready, or exhausted). Always opens `choose-ritual` when at least
   one opposing ritual exists (including exactly one). Move it to its owner's
   graveyard; orientation / progress clear via `moveCard`. Emit
   `ritual-destroyed`.
4. **No opposing ritual** → legal whiff (no pending choice). Own rituals are
   never legal targets for `choose-opponent-ritual`.
5. **Not negate.** Destroying a field ritual does not touch the chain; that is
   `negate-ritual` (`008`).
6. **`destroy-equipment`.** After the target creature is known (`choose-enemy`
   or `declared-target`): 0 pieces is a legal whiff; 1 piece destroys that
   instance with no second prompt; 2+ pieces open `choose-equipment`. The
   controller names one attached instance. Calculated Sacrifice uses
   `choose-enemy` so the creature is still named even when only one opposing
   creature is on the field.

## State Changes

| Field | Change |
|---|---|
| `PlayerState.attributePool` | Reduced on the target’s controller; increased on the drain controller. |
| Ritual card instance | Leaves `ritual` → `graveyard`. |
| Equipment card instance | Leaves `equipment` → `graveyard`. |
| `pendingDecision` | May be `choose-creature` (enemy), `choose-ritual` (opponent), `choose-equipment`, or `choose-attribute-tokens`. |

## Actions

| Action | Role |
|---|---|
| `RESOLVE_CHOOSE_CREATURE` | Existing — Siphon Sigil / Calculated Sacrifice / Hexbrand target. |
| `RESOLVE_CHOOSE_RITUAL` | Completes `choose-ritual`; stamps `declaredTargetCardInstanceId`. |
| `RESOLVE_CHOOSE_EQUIPMENT` | Completes `choose-equipment`; destroys that attached instance. |
| `RESOLVE_CHOOSE_ATTRIBUTE_TOKENS` | Completes mixed token drain; `discarded` totals pending `amount`. |

## Validation

- `RESOLVE_CHOOSE_RITUAL`: controller matches pending; card is in `ritual` zone;
  for `filter: "opponent"`, owner is not the controller.
- `RESOLVE_CHOOSE_EQUIPMENT`: controller matches pending; instance is in the
  pending creature’s `equipmentIds`.
- `RESOLVE_CHOOSE_ATTRIBUTE_TOKENS`: controller matches pending; pick totals
  `amount` and is a subset of the target pile. Illegal picks
  return `INVALID_CHOICE` and the original state object.

## Resolution

See `resolution.ts` (`drain-attribute-tokens`, `destroy-ritual`,
`destroy-equipment`) and `zones.destroyRitual` / `zones.destroyEquipment`.

## Networking

Host authority unchanged: clients send `RESOLVE_CHOOSE_RITUAL` /
`RESOLVE_CHOOSE_EQUIPMENT` / `RESOLVE_CHOOSE_ATTRIBUTE_TOKENS` intents; host
binds `playerId` by seat.

## Persistence

None.

## UI

Match-ui must:

- Prompt enemy creature choice for Siphon Sigil / Calculated Sacrifice /
  Hexbrand (reuse choose-creature UI).
- Prompt opposing ritual choice when `pendingDecision.type === "choose-ritual"`
  (list opponent's preparing / ready / exhausted rituals; send
  `RESOLVE_CHOOSE_RITUAL`).
- Prompt equipment choice when `pendingDecision.type === "choose-equipment"`
  (list that creature’s attached gear; send `RESOLVE_CHOOSE_EQUIPMENT`).
- Prompt token pip choice when `pendingDecision.type === "choose-attribute-tokens"`
  (increment per held attribute; send `RESOLVE_CHOOSE_ATTRIBUTE_TOKENS`).
- Surface `attribute-tokens-drained`, `ritual-destroyed`, and
  `equipment-destroyed` in the log / feedback if other destroy events are shown.

## Acceptance Criteria

- [x] Siphon Sigil mixed tokens: controller names which 2 pips; opponent loses, controller gains
- [x] Siphon Sigil partial / empty / homogeneous leftover: no token prompt
- [x] Dispel Circle chooses and GYs an opposing ritual; empty field whiffs
- [x] Calculated Sacrifice with 2 equipment: pending choice; named instance GYs
- [x] Focused reducer tests; DoD green

## Tests

- [x] `src/game/reducer/controlEffects.test.ts`
- [x] `src/game/reducer/equipment.test.ts`
