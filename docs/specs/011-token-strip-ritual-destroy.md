# 011 — Drain (life), ritual destroy & equipment destroy

Status: **IMPLEMENTED** (Drain repurposed 2026-08-29)

Control interaction vocabulary for Siphon Sigil and Dispel Circle. Negate-ritual
lives in `008` (Seal the Rite). Equipment destroy choice for Calculated
Sacrifice / Hexbrand absorb lives here as the same “name the attached piece”
pattern.

`[Strip]` is only for creature/face tokens (Shield, Toxin, Pestilence,
Corruption). Attribute piles are spent with `[Spend]` / attack discards — not
Strip or Drain.

## Intent

`[Drain N]` transfers life: damage an enemy, heal an ally for HP actually lost.
Effects can also remove opposing field rituals / equipment without creature
destruction. When more than one legal pick exists, the controller names it.

## Rules

1. **`drain-life`.** Choose an enemy (`target`, usually `choose-enemy`). Deal
   up to `amount` damage to the enemy with normal Prevent → Shield → HP. Heal
   your **most-damaged ally** (`with`, usually `most-damaged-ally`) for the
   **HP actually lost** (`dealDamage` return). Emit `life-drained`. If Shields
   / Prevent absorb the whole amount, heal whiffs (no `life-drained`). Nested
   `choose-ally` on `with` remains legal for older data but catalogue Drain
   uses the auto ally.
2. **No token cap** in this slice — per-player / per-attribute caps stay
   `OPEN` in `OPEN_DESIGN.md`. `choose-attribute-tokens` is for pile discard
   when an effect names specific pips.
3. **`destroy-ritual`.** Choose one opposing card in `zone === "ritual"`
   (preparing, ready, or exhausted). Always opens `choose-ritual` when at least
   one opposing ritual exists (including exactly one). Move it to its owner's
   graveyard; orientation resets via `moveCard`. Emit
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
| Creature `damage` / `shields` | Drain damages source; heals destination for HP lost. |
| Ritual card instance | Leaves `ritual` → `graveyard`. |
| Equipment card instance | Leaves `equipment` → `graveyard`. |
| `pendingDecision` | May be `choose-creature` (enemy for Drain; ally only if `with` is still `choose-*`), `choose-ritual`, or `choose-equipment`. |

## Actions

| Action | Role |
|---|---|
| `RESOLVE_CHOOSE_CREATURE` | Siphon Sigil / Hexbrand drain (enemy then ally); Calculated Sacrifice / destroy-equipment target. |
| `RESOLVE_CHOOSE_RITUAL` | Completes `choose-ritual`; stamps `declaredTargetCardInstanceId`. |
| `RESOLVE_CHOOSE_EQUIPMENT` | Completes `choose-equipment`; destroys that attached instance. |

## Validation

- `RESOLVE_CHOOSE_RITUAL`: controller matches pending; card is in `ritual` zone;
  for `filter: "opponent"`, owner is not the controller.
- `RESOLVE_CHOOSE_EQUIPMENT`: controller matches pending; instance is in the
  pending creature’s `equipmentIds`.

## Resolution

See `resolution.ts` (`drain-life`, `destroy-ritual`, `destroy-equipment`) and
`zones.destroyRitual` / `zones.destroyEquipment`.

## Networking

Host authority unchanged: clients send `RESOLVE_CHOOSE_RITUAL` /
`RESOLVE_CHOOSE_EQUIPMENT` / `RESOLVE_CHOOSE_CREATURE` intents; host binds
`playerId` by seat.

## Persistence

None.

## UI

Match-ui must:

- Prompt enemy creature choice for `[Drain]` (heal auto-targets most-damaged
  ally; reuse choose-creature UI).
- Prompt opposing ritual choice when `pendingDecision.type === "choose-ritual"`.
- Prompt equipment choice when `pendingDecision.type === "choose-equipment"`.
- Surface `life-drained`, `ritual-destroyed`, and `equipment-destroyed` in the
  log / toast if other destroy events are shown.
- Token-pip `choose-attribute-tokens` UI supports pile discard only.

## Acceptance Criteria

- [x] Siphon Sigil: choose enemy, choose ally; heal equals HP lost after Shields
- [x] Drain with full Shield absorb: no heal / no `life-drained`
- [x] Dispel Circle chooses and GYs an opposing ritual; empty field whiffs
- [x] Calculated Sacrifice with 2 equipment: pending choice; named instance GYs
- [x] Focused reducer tests; DoD green

## Tests

- [x] `src/server/reducer/controlEffects.test.ts`
- [x] `src/server/reducer/equipment.test.ts`
